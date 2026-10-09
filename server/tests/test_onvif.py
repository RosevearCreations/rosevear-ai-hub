import xml.etree.ElementTree as ET

from rosevear_ai_hub.integrations.onvif import build_probe_message, parse_probe_matches


def test_probe_targets_network_video_transmitters() -> None:
    payload = build_probe_message("urn:uuid:test-probe")
    root = ET.fromstring(payload)
    text = " ".join(value or "" for value in root.itertext())

    assert "NetworkVideoTransmitter" in text
    assert "urn:uuid:test-probe" in text


def test_parse_probe_match_accepts_private_xaddr_and_decodes_name() -> None:
    payload = b"""<?xml version="1.0"?>
    <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
      xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"
      xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <s:Body><d:ProbeMatches><d:ProbeMatch>
        <a:EndpointReference><a:Address>urn:uuid:camera-1</a:Address></a:EndpointReference>
        <d:Types>dn:NetworkVideoTransmitter</d:Types>
        <d:Scopes>onvif://www.onvif.org/name/Front%20Door onvif://www.onvif.org/location/Porch</d:Scopes>
        <d:XAddrs>http://192.168.68.55/onvif/device_service</d:XAddrs>
      </d:ProbeMatch></d:ProbeMatches></s:Body>
    </s:Envelope>"""

    devices = parse_probe_matches(payload)

    assert len(devices) == 1
    device = devices[0]
    assert device.endpoint_uuid == "camera-1"
    assert device.host == "192.168.68.55"
    assert device.port == 80
    assert device.name == "Front Door"
    assert device.service_url == "http://192.168.68.55/onvif/device_service"


def test_parse_probe_match_rejects_public_xaddr() -> None:
    payload = b"""<?xml version="1.0"?>
    <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
      xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"
      xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <s:Body><d:ProbeMatches><d:ProbeMatch>
        <a:EndpointReference><a:Address>urn:uuid:camera-public</a:Address></a:EndpointReference>
        <d:XAddrs>http://8.8.8.8/onvif/device_service</d:XAddrs>
      </d:ProbeMatch></d:ProbeMatches></s:Body>
    </s:Envelope>"""

    assert parse_probe_matches(payload) == []


def test_parse_probe_match_ignores_malformed_xml() -> None:
    assert parse_probe_matches(b"<not-closed") == []
