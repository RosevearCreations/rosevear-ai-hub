import json
import httpx
import pytest

from rosevear_ai_hub.integrations.rosiedazzlers import (
    RosieDazzlersAuthenticationError,
    RosieDazzlersClient,
    RosieDazzlersConfigurationError,
)


def test_rosiedazzlers_requires_https_for_remote_origin() -> None:
    with pytest.raises(
        RosieDazzlersConfigurationError,
        match="HTTPS",
    ):
        RosieDazzlersClient(
            "http://rosiedazzlers.ca",
            "session-token",
        )


def test_read_contracts_are_bounded_normalized_and_cookie_authenticated() -> None:
    seen: list[tuple[str, str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(
            (
                request.method,
                request.url.path,
                request.headers.get("Cookie", ""),
            )
        )
        if request.url.path == "/api/admin/bookings_search":
            assert request.method == "POST"
            payload = json.loads(request.content)
            assert payload == {"limit": 100}
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "bookings": [
                        {
                            "id": "booking-1",
                            "service_date": "2026-10-12",
                            "start_slot": "AM",
                            "status": "confirmed",
                            "job_status": "scheduled",
                            "customer_name": "Customer One",
                            "customer_email": "private@example.com",
                            "package_code": "complete",
                            "vehicle_size": "medium",
                            "total_price": 369,
                            "deposit_amount": 100,
                            "assigned_to": "Detailer",
                            "progress_enabled": True,
                            "updated_at": "2026-10-10T12:00:00Z",
                            "progress_token": "must-not-pass-through",
                            "notes": "must-not-pass-through",
                        }
                    ],
                },
            )
        if request.url.path == "/api/admin/customers_list":
            assert request.method == "POST"
            payload = json.loads(request.content)
            assert payload == {"limit": 100}
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "customer_profiles": [
                        {
                            "id": "customer-1",
                            "full_name": "Customer One",
                            "email": "customer@example.com",
                            "phone": "519-555-0100",
                            "tier_code": "gold",
                            "booking_count": 4,
                            "total_estimated_value": 1400,
                            "last_booking_at": "2026-10-01T12:00:00Z",
                            "updated_at": "2026-10-10T12:00:00Z",
                            "notes": "must-not-pass-through",
                        }
                    ],
                },
            )
        if request.url.path == "/api/detailer/jobs":
            assert request.method == "GET"
            assert request.url.params["scope"] == "workspace"
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "jobs": [
                        {
                            "id": "booking-1",
                            "service_date": "2026-10-12",
                            "start_slot": "AM",
                            "status": "confirmed",
                            "job_status": "scheduled",
                            "current_workflow_stage": "arrival",
                            "detailer_response_status": "accepted",
                            "customer_name": "Customer One",
                            "package_code": "complete",
                            "vehicle_size": "medium",
                            "assigned_to": "Detailer",
                            "progress_enabled": True,
                            "completed_summary_status": None,
                            "trusted_service_latitude": 43.0,
                            "trusted_service_longitude": -80.0,
                            "notes": "must-not-pass-through",
                        }
                    ],
                },
            )
        if request.url.path == "/api/admin/catalog_inventory_list":
            assert request.method == "GET"
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "items": [
                        {
                            "id": "inventory-1",
                            "item_type": "consumable",
                            "name": "Ceramic coating",
                            "category": "Protection",
                            "subcategory": "Ceramic",
                            "qty_on_hand": 2.5,
                            "reorder_point": 1,
                            "stock_unit": "bottle",
                            "usage_unit": "ml",
                            "usage_units_per_stock_unit": 500,
                            "preferred_vendor": "Supplier",
                            "reuse_policy": "reorder",
                            "purchase_date": "2026-09-01",
                            "rating_value": 5,
                            "updated_at": "2026-10-10T12:00:00Z",
                            "amazon_url": "must-not-pass-through",
                            "notes": "must-not-pass-through",
                        }
                    ],
                },
            )
        return httpx.Response(404)

    client = RosieDazzlersClient(
        "https://rosiedazzlers.ca",
        "opaque-session-token",
        transport=httpx.MockTransport(handler),
    )

    bookings = client.bookings(limit=999)
    customers = client.customers(limit=999)
    jobs = client.jobs(limit=999)
    inventory = client.inventory(limit=999)

    assert bookings.records[0]["booking_id"] == "booking-1"
    assert "customer_email" not in bookings.records[0]
    assert "progress_token" not in bookings.records[0]
    assert customers.records[0]["customer_email"] == "customer@example.com"
    assert "notes" not in customers.records[0]
    assert jobs.records[0]["workflow_stage"] == "arrival"
    assert "trusted_service_latitude" not in jobs.records[0]
    assert inventory.records[0]["usage_unit"] == "ml"
    assert "amazon_url" not in inventory.records[0]
    assert [method for method, _, _ in seen] == ["POST", "POST", "GET", "GET"]
    assert all(
        cookie == "rd_staff_session=opaque-session-token"
        for _, _, cookie in seen
    )


def test_authentication_error_is_sanitized() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={
                "ok": False,
                "error": "raw provider detail secret-value",
            },
        )

    client = RosieDazzlersClient(
        "https://rosiedazzlers.ca",
        "opaque-session-token",
        transport=httpx.MockTransport(handler),
    )
    with pytest.raises(
        RosieDazzlersAuthenticationError,
        match="rejected the configured staff session",
    ) as caught:
        client.bookings(limit=10)
    assert "secret-value" not in str(caught.value)


def test_staff_session_token_rejects_cookie_injection() -> None:
    with pytest.raises(
        RosieDazzlersConfigurationError,
        match="invalid cookie characters",
    ):
        RosieDazzlersClient(
            "https://rosiedazzlers.ca",
            "token;other=value",
        )
