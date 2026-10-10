import json

import httpx
import pytest

from rosevear_ai_hub.integrations.yardworkers import (
    YardWorkersAuthenticationError,
    YardWorkersClient,
    YardWorkersConfigurationError,
    YardWorkersRequestError,
    validate_yardworkers_base_url,
)


def test_yardworkers_base_url_requires_https_except_loopback() -> None:
    assert validate_yardworkers_base_url("https://example.supabase.co/") == (
        "https://example.supabase.co"
    )
    assert validate_yardworkers_base_url("http://127.0.0.1:54321") == (
        "http://127.0.0.1:54321"
    )
    with pytest.raises(YardWorkersConfigurationError, match="must use HTTPS"):
        validate_yardworkers_base_url("http://example.supabase.co")
    with pytest.raises(YardWorkersConfigurationError, match="without an API path"):
        validate_yardworkers_base_url(
            "https://example.supabase.co/functions/v1/core-data-read"
        )


def test_yardworkers_client_uses_exact_protected_jobs_read_contract() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/functions/v1/core-data-read"
        assert request.headers["Authorization"] == "Bearer signed-user-token"
        assert request.headers["apikey"] == "public-project-key"
        assert request.headers["User-Agent"] == "Rosevear-AI-Hub/0.0.39"
        body = json.loads(request.content)
        assert body == {
            "module_key": "jobs",
            "entities": ["job"],
            "limit": 100,
        }
        return httpx.Response(
            200,
            json={
                "ok": True,
                "read_only": True,
                "data": {
                    "job": [
                        {
                            "id": "job-42",
                            "job_code": "YW-42",
                            "job_name": "Spring cleanup",
                            "status": "scheduled",
                            "priority": "normal",
                            "start_date": "2026-10-15",
                            "end_date": "2026-10-15",
                            "unexpected_private_field": "must not pass through",
                        }
                    ]
                },
            },
        )

    client = YardWorkersClient(
        "https://example.supabase.co",
        "signed-user-token",
        "public-project-key",
        timeout_seconds=2,
        transport=httpx.MockTransport(handler),
    )
    page = client.jobs(limit=500)

    assert page.next_cursor is None
    assert page.records == (
        {
            "job_id": "job-42",
            "job_code": "YW-42",
            "job_name": "Spring cleanup",
            "status": "scheduled",
            "priority": "normal",
            "start_date": "2026-10-15",
            "end_date": "2026-10-15",
        },
    )
    assert "unexpected_private_field" not in page.records[0]


def test_yardworkers_client_minimizes_client_site_details() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["entities"] == [
            "customer",
            "customer_site",
            "service_document",
        ]
        assert body["limit"] == 20
        return httpx.Response(
            200,
            json={
                "ok": True,
                "read_only": True,
                "data": {
                    "customer": [
                        {
                            "id": "client-1",
                            "client_code": "C-001",
                            "legal_name": "Example Property Inc.",
                            "display_name": "Example Property",
                            "is_active": True,
                        }
                    ],
                    "customer_site": [
                        {
                            "id": "site-1",
                            "client_id": "client-1",
                            "site_code": "S-001",
                            "site_name": "North property",
                            "service_address": "123 Private Street",
                            "city": "Tillsonburg",
                            "province": "ON",
                            "postal_code": "N4G 0A1",
                            "approximate_serviceable_area": 12500,
                            "area_unit": "sq_ft",
                            "is_active": True,
                        }
                    ],
                    "service_document": [
                        {
                            "id": "doc-1",
                            "document_number": "AGR-001",
                            "document_kind": "agreement",
                            "document_status": "active",
                            "agreement_id": "agreement-1",
                            "estimate_id": None,
                            "job_id": "job-1",
                        }
                    ],
                },
            },
        )

    client = YardWorkersClient(
        "https://example.supabase.co",
        "signed-user-token",
        "public-project-key",
        transport=httpx.MockTransport(handler),
    )
    page = client.clients(limit=20)

    assert [row["record_type"] for row in page.records] == [
        "client",
        "site",
        "service_document",
    ]
    site = page.records[1]
    assert site["city"] == "Tillsonburg"
    assert "service_address" not in site
    assert "is_active" not in site


def test_yardworkers_client_reads_active_crew_and_equipment() -> None:
    calls: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        calls.append(body)
        entity = body["entities"][0]
        if entity == "profile":
            data = {
                "profile": [
                    {
                        "id": "profile-1",
                        "full_name": "Crew Member",
                        "role": "employee",
                        "is_active": True,
                    }
                ]
            }
        else:
            data = {
                "equipment": [
                    {
                        "id": "equipment-1",
                        "equipment_code": "EQ-001",
                        "item_name": "Zero-turn mower",
                        "equipment_category": "mower",
                        "is_active": True,
                    }
                ]
            }
        return httpx.Response(200, json={"ok": True, "read_only": True, "data": data})

    client = YardWorkersClient(
        "https://example.supabase.co",
        "signed-user-token",
        "public-project-key",
        transport=httpx.MockTransport(handler),
    )

    assert client.crew(limit=10).records[0] == {
        "profile_id": "profile-1",
        "full_name": "Crew Member",
        "role": "employee",
    }
    assert client.equipment(limit=10).records[0] == {
        "equipment_id": "equipment-1",
        "equipment_code": "EQ-001",
        "item_name": "Zero-turn mower",
        "equipment_category": "mower",
    }
    assert [call["entities"] for call in calls] == [["profile"], ["equipment"]]


def test_yardworkers_client_rejects_header_injection() -> None:
    with pytest.raises(YardWorkersConfigurationError, match="header characters"):
        YardWorkersClient(
            "https://example.supabase.co",
            "token\r\nInjected: yes",
            "public-project-key",
        )
    with pytest.raises(YardWorkersConfigurationError, match="header characters"):
        YardWorkersClient(
            "https://example.supabase.co",
            "signed-user-token",
            "key\nInjected: yes",
        )


def test_yardworkers_authentication_error_is_sanitized() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        del request
        return httpx.Response(
            403,
            json={
                "error": "Forbidden",
                "token": "sensitive-upstream-token",
                "internal": "row-level-policy-detail",
            },
        )

    client = YardWorkersClient(
        "https://example.supabase.co",
        "signed-user-token",
        "public-project-key",
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(YardWorkersAuthenticationError) as exc_info:
        client.jobs(limit=5)
    message = str(exc_info.value)
    assert "Jobs view permission" in message
    assert "sensitive-upstream-token" not in message
    assert "row-level-policy-detail" not in message


def test_yardworkers_requires_read_only_confirmation() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        del request
        return httpx.Response(
            200,
            json={
                "ok": True,
                "read_only": False,
                "data": {"job": []},
            },
        )

    client = YardWorkersClient(
        "https://example.supabase.co",
        "signed-user-token",
        "public-project-key",
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(YardWorkersRequestError, match="read-only contract"):
        client.jobs(limit=5)
