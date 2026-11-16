"""Build 348: real loopback mutual-TLS pilot with signed and durable ACK."""

import hashlib
import json
import ssl
import threading
import time
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519, rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

from rosevear_ai_hub.service_identity347 import (
    ENDPOINT,
    SCHEMA,
    NonceLedger347,
    PublicKey347,
    Registry347,
    _canonical,
    _digest,
)
from rosevear_ai_hub.transport348 import (
    ACK_SCHEMA,
    PeerEnrollment348,
    PilotAckJournal348,
    deliver_mtls_pilot348,
    receive_mtls_pilot348,
    verify_signed_ack348,
)

SOURCE = "devilndove"
TARGET = "rosevear-ai-hub"
CAPABILITY = "business.health.readonly"


def _private_cert(key, subject, ca_cert, ca_key, *, is_ca=False, is_server=False):
    now = datetime.now(UTC)
    builder = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject)]))
        .issuer_name(
            x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject)])
            if is_ca
            else ca_cert.subject
        )
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=2))
        .add_extension(x509.BasicConstraints(ca=is_ca, path_length=None), critical=True)
    )
    if not is_ca:
        builder = builder.add_extension(
            x509.ExtendedKeyUsage(
                [ExtendedKeyUsageOID.SERVER_AUTH if is_server else ExtendedKeyUsageOID.CLIENT_AUTH]
            ),
            critical=False,
        )
    if is_server:
        builder = builder.add_extension(
            x509.SubjectAlternativeName([x509.DNSName("localhost")]), critical=False
        )
    return builder.sign(private_key=key if is_ca else ca_key, algorithm=hashes.SHA256())


def _write_cert(path, cert):
    path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))


def _write_key(path, key):
    path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        )
    )


@pytest.fixture
def pilot(tmp_path):
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_cert = _private_cert(ca_key, "Rosevear Pilot CA", None, None, is_ca=True)
    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    client_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server_cert = _private_cert(server_key, "localhost", ca_cert, ca_key, is_server=True)
    client_cert = _private_cert(client_key, "Rosevear Pilot Client", ca_cert, ca_key)
    ca_path = tmp_path / "ca.pem"
    server_cert_path = tmp_path / "server.pem"
    server_key_path = tmp_path / "server-key.pem"
    client_cert_path = tmp_path / "client.pem"
    client_key_path = tmp_path / "client-key.pem"
    _write_cert(ca_path, ca_cert)
    _write_cert(server_cert_path, server_cert)
    _write_cert(client_cert_path, client_cert)
    _write_key(server_key_path, server_key)
    _write_key(client_key_path, client_key)
    signer_source = ed25519.Ed25519PrivateKey.generate()
    signer_target = ed25519.Ed25519PrivateKey.generate()
    now_ms = int(time.time() * 1000)

    def record(signer, app, kid):
        der = signer.public_key().public_bytes(
            serialization.Encoding.DER,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        return PublicKey347(
            app,
            kid,
            der,
            hashlib.sha256(der).hexdigest(),
            now_ms - 50_000,
            now_ms + 50_000,
        )

    registry = Registry347(
        (
            record(signer_source, SOURCE, "source-service-001"),
            record(signer_target, TARGET, "target-service-001"),
        )
    )
    inbound_ledger = NonceLedger347(tmp_path / "inbound347.sqlite")
    outbound_acks = PilotAckJournal348(tmp_path / "ack348.sqlite")
    assert inbound_ledger.enroll()
    assert outbound_acks.enroll()
    body = {
        "eventType": "business.health.readonly.v1",
        "evidenceDigest": "f" * 64,
        "connection": "HOLD",
        "incidentStatus": "OPEN_HOLD",
    }
    signed = {
        "schema": SCHEMA,
        "protocolVersion": "1.1",
        "issuer": SOURCE,
        "audience": TARGET,
        "keyId": "source-service-001",
        "nonce": "source-nonce-001",
        "messageId": "source-message-001",
        "capability": CAPABILITY,
        "method": "POST",
        "path": ENDPOINT,
        "bodyDigest": _digest(body),
        "issuedAtMs": now_ms - 1000,
        "expiresAtMs": now_ms + 20_000,
    }
    envelope = {
        "payload": signed,
        "signature": signer_source.sign(_canonical(signed)).hex(),
    }
    peer = PeerEnrollment348(
        source=SOURCE,
        destination=TARGET,
        hostname="localhost",
        port=0,
        server_cert_pin=hashlib.sha256(
            server_cert.public_bytes(serialization.Encoding.DER)
        ).hexdigest(),
        client_cert_pin=hashlib.sha256(
            client_cert.public_bytes(serialization.Encoding.DER)
        ).hexdigest(),
        ca_file=ca_path,
        client_cert_file=client_cert_path,
        client_key_file=client_key_path,
        peer_protocols=("1.1",),
        peer_capabilities=(CAPABILITY,),
        owner_approved=True,
    )
    return {
        "peer": peer,
        "body": body,
        "envelope": envelope,
        "registry": registry,
        "source_signer": signer_source,
        "target_signer": signer_target,
        "inbound": inbound_ledger,
        "outbound": outbound_acks,
        "now_ms": now_ms,
        "ca_path": ca_path,
        "server_cert_path": server_cert_path,
        "server_key_path": server_key_path,
    }


def _server(pilot):
    seen = []

    class PilotHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != ENDPOINT:
                self.send_error(404)
                return
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 8192:
                self.send_error(413)
                return
            data = json.loads(self.rfile.read(length))
            decision = receive_mtls_pilot348(
                sock=self.connection,
                peer=pilot["peer"],
                envelope=data["envelope"],
                body=data["body"],
                registry=pilot["registry"],
                nonce_ledger=pilot["inbound"],
                recipient_signer=pilot["target_signer"],
                recipient_key_id="target-service-001",
                now_ms=pilot["now_ms"],
            )
            seen.append(decision)
            if not decision.get("pilotInboundVerified"):
                self.send_error(403)
                return
            response = json.dumps({"ack": decision["ack"]}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)

        def log_message(self, format, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), PilotHandler)
    server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_context.minimum_version = ssl.TLSVersion.TLSv1_2
    server_context.verify_mode = ssl.CERT_REQUIRED
    server_context.load_verify_locations(cafile=str(pilot["ca_path"]))
    server_context.load_cert_chain(
        certfile=str(pilot["server_cert_path"]),
        keyfile=str(pilot["server_key_path"]),
    )
    server.socket = server_context.wrap_socket(server.socket, server_side=True)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread, seen


def _send(pilot, peer):
    return deliver_mtls_pilot348(
        peer=peer,
        envelope=pilot["envelope"],
        body=pilot["body"],
        registry=pilot["registry"],
        ack_journal=pilot["outbound"],
        now_ms=pilot["now_ms"],
    )


def test_real_mtls_loopback_signed_ack_and_durable_replay(pilot):
    from dataclasses import replace

    server, thread, seen = _server(pilot)
    try:
        peer = replace(pilot["peer"], port=server.server_port)
        pilot["peer"] = peer
        result = _send(pilot, peer)
        assert result["pilotMutualTLSVerified"] is True
        assert result["pilotSignedAckVerified"] is True
        assert result["pilotReceiptPersisted"] is True
        assert result["messageDelivered"] is False
        assert result["crossAppConnectivityVerified"] is False
        assert seen and seen[0]["pilotInboundVerified"] is True
        assert verify_signed_ack348(
            ack=seen[0]["ack"],
            envelope=pilot["envelope"],
            body=pilot["body"],
            peer=peer,
            registry=pilot["registry"],
            now_ms=pilot["now_ms"],
        )
        again = _send(pilot, peer)
        assert again["accepted"] is False
        assert again.get("pilotSignedAckVerified") is not True
        assert not seen[-1].get("pilotInboundVerified")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_unapproved_or_unenrolled_route_never_contacts_network(pilot):
    from dataclasses import replace

    assert _send(pilot, pilot["peer"])["state"] == "HOLD_QL457_NO_APPROVED_ENROLLED_PILOT"
    bad = replace(pilot["peer"], port=40443, owner_approved=False)
    assert not _send(pilot, bad)["accepted"]
    assert "APPROVED" in _send(pilot, bad)["state"]
    bad = replace(pilot["peer"], port=40443, peer_protocols=("1.0",))
    assert "INCOMPATIBLE" in _send(pilot, bad)["state"]


def test_fake_tls_socket_and_untrusted_client_are_denied(pilot):
    result = receive_mtls_pilot348(
        sock=object(),
        peer=pilot["peer"],
        envelope=pilot["envelope"],
        body=pilot["body"],
        registry=pilot["registry"],
        nonce_ledger=pilot["inbound"],
        recipient_signer=pilot["target_signer"],
        recipient_key_id="target-service-001",
        now_ms=pilot["now_ms"],
    )
    assert not result["accepted"]
    assert "TLS" in result["state"]


def test_ack_rejects_tampering_and_expiry(pilot):
    from dataclasses import replace

    p = pilot
    ack = {
        "payload": {
            "schema": ACK_SCHEMA,
            "issuer": TARGET,
            "audience": SOURCE,
            "keyId": "target-service-001",
            "messageId": p["envelope"]["payload"]["messageId"],
            "messageDigest": _digest(p["envelope"]),
            "bodyDigest": _digest(p["body"]),
            "status": "READONLY_PERSISTED",
            "issuedAtMs": p["now_ms"],
            "expiresAtMs": p["now_ms"] + 30_000,
        },
    }
    ack["signature"] = p["target_signer"].sign(_canonical(ack["payload"])).hex()
    peer = replace(p["peer"], port=12345)
    assert verify_signed_ack348(
        ack=ack,
        envelope=p["envelope"],
        body=p["body"],
        peer=peer,
        registry=p["registry"],
        now_ms=p["now_ms"],
    )
    ack["payload"]["messageDigest"] = "0" * 64
    assert not verify_signed_ack348(
        ack=ack,
        envelope=p["envelope"],
        body=p["body"],
        peer=peer,
        registry=p["registry"],
        now_ms=p["now_ms"],
    )
    ack["payload"]["messageDigest"] = _digest(p["envelope"])
    assert not verify_signed_ack348(
        ack=ack,
        envelope=p["envelope"],
        body=p["body"],
        peer=peer,
        registry=p["registry"],
        now_ms=p["now_ms"] + 31_000,
    )


def test_private_payload_or_receiver_commands_remain_denied(pilot):
    from dataclasses import replace

    bad = dict(pilot["body"])
    bad["customerId"] = "not-permitted"
    assert not deliver_mtls_pilot348(
        peer=replace(pilot["peer"], port=12345),
        envelope=pilot["envelope"],
        body=bad,
        registry=pilot["registry"],
        ack_journal=pilot["outbound"],
        now_ms=pilot["now_ms"],
    )["accepted"]
    bad_peer = replace(
        pilot["peer"], port=12345, peer_capabilities=("receiver.original_host.activate",)
    )
    assert not _send(pilot, bad_peer)["accepted"]


def test_ack_journal_requires_explicit_enrollment_and_one_use(tmp_path):
    j = PilotAckJournal348(tmp_path / "missing-parent" / "ack.sqlite")
    assert not j.enroll()
    assert not j.claim("source", "target", "mid", "d1", "d2", 100)
    j = PilotAckJournal348(tmp_path / "ack.sqlite")
    assert j.enroll()
    assert j.claim("source", "target", "mid", "d1", "d2", 100)
    assert not j.claim("source", "target", "mid", "d1", "d2", 101)
