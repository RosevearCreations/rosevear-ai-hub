"""Local-only ONVIF WS-Discovery helpers for Build 031."""

from __future__ import annotations

import ipaddress
import socket
import time
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from urllib.parse import unquote, urlparse

WS_DISCOVERY_ADDRESS = ("239.255.255.250", 3702)
_MAX_DATAGRAM_BYTES = 64 * 1024

SOAP_ENV = "http://www.w3.org/2003/05/soap-envelope"
WSA = "http://schemas.xmlsoap.org/ws/2004/08/addressing"
WSD = "http://schemas.xmlsoap.org/ws/2005/04/discovery"

_NS = {"s": SOAP_ENV, "a": WSA, "d": WSD}


@dataclass(frozen=True)
class DiscoveredONVIFDevice:
    """Normalized passive discovery result; no credentials or stream URLs."""

    endpoint_uuid: str
    service_url: str
    host: str
    port: int
    name: str | None
    types: tuple[str, ...]
    scopes: tuple[str, ...]


def build_probe_message(message_id: str | None = None) -> bytes:
    """Build a standards-bounded WS-Discovery Probe for ONVIF network video transmitters."""

    identifier = message_id or f"urn:uuid:{uuid.uuid4()}"
    envelope = ET.Element(f"{{{SOAP_ENV}}}Envelope")
    header = ET.SubElement(envelope, f"{{{SOAP_ENV}}}Header")
    ET.SubElement(header, f"{{{WSA}}}MessageID").text = identifier
    ET.SubElement(header, f"{{{WSA}}}To").text = "urn:schemas-xmlsoap-org:ws:2005:04:discovery"
    action = ET.SubElement(header, f"{{{WSA}}}Action")
    action.text = "http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe"

    body = ET.SubElement(envelope, f"{{{SOAP_ENV}}}Body")
    probe = ET.SubElement(body, f"{{{WSD}}}Probe")
    types = ET.SubElement(probe, f"{{{WSD}}}Types")
    types.text = "dn:NetworkVideoTransmitter"
    types.set("xmlns:dn", "http://www.onvif.org/ver10/network/wsdl")
    return ET.tostring(envelope, encoding="utf-8", xml_declaration=True)


def _private_ip(host: str) -> bool:
    try:
        address = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        return False
    return address.is_private or address.is_link_local or address.is_loopback


def _safe_service_url(value: str) -> tuple[str, int] | None:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return None
    if not _private_ip(parsed.hostname):
        return None
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    if not 1 <= port <= 65535:
        return None
    return parsed.hostname, port


def _name_from_scopes(scopes: tuple[str, ...]) -> str | None:
    prefixes = (
        "onvif://www.onvif.org/name/",
        "onvif://www.onvif.org/location/",
    )
    for prefix in prefixes:
        for scope in scopes:
            if scope.startswith(prefix):
                candidate = unquote(scope[len(prefix):]).strip()
                if candidate:
                    return candidate[:160]
    return None


def parse_probe_matches(payload: bytes) -> list[DiscoveredONVIFDevice]:
    """Parse one WS-Discovery response and reject non-local XAddr targets."""

    if len(payload) > _MAX_DATAGRAM_BYTES:
        return []
    try:
        root = ET.fromstring(payload)
    except ET.ParseError:
        return []

    results: list[DiscoveredONVIFDevice] = []
    for match in root.findall(".//d:ProbeMatch", _NS):
        address = match.findtext("a:EndpointReference/a:Address", default="", namespaces=_NS).strip()
        endpoint_uuid = address.removeprefix("urn:uuid:").strip()
        if not endpoint_uuid:
            endpoint_uuid = address or f"unknown-{uuid.uuid4()}"

        raw_types = match.findtext("d:Types", default="", namespaces=_NS)
        raw_scopes = match.findtext("d:Scopes", default="", namespaces=_NS)
        raw_xaddrs = match.findtext("d:XAddrs", default="", namespaces=_NS)
        types = tuple(item for item in raw_types.split() if item)[:32]
        scopes = tuple(item for item in raw_scopes.split() if item)[:64]
        name = _name_from_scopes(scopes)

        for service_url in raw_xaddrs.split():
            safe = _safe_service_url(service_url)
            if safe is None:
                continue
            host, port = safe
            results.append(
                DiscoveredONVIFDevice(
                    endpoint_uuid=endpoint_uuid[:255],
                    service_url=service_url[:1024],
                    host=host[:255],
                    port=port,
                    name=name,
                    types=types,
                    scopes=scopes,
                )
            )
            break
    return results


def discover_onvif_devices(
    timeout_seconds: float = 2.5,
    *,
    socket_factory=socket.socket,
) -> list[DiscoveredONVIFDevice]:
    """Probe the trusted LAN with WS-Discovery and return de-duplicated local devices."""

    timeout = min(max(float(timeout_seconds), 0.25), 10.0)
    probe = build_probe_message()
    found: dict[str, DiscoveredONVIFDevice] = {}

    sock = socket_factory(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.settimeout(min(0.5, timeout))
        sock.sendto(probe, WS_DISCOVERY_ADDRESS)
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                payload, _address = sock.recvfrom(_MAX_DATAGRAM_BYTES)
            except TimeoutError:
                continue
            except socket.timeout:
                continue
            for device in parse_probe_matches(payload):
                found.setdefault(device.endpoint_uuid, device)
    finally:
        sock.close()

    return sorted(found.values(), key=lambda item: (item.name or item.host, item.host, item.port))
