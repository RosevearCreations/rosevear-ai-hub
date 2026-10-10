import httpx
import pytest

from rosevear_ai_hub.integrations.devilndove import (
    DevilNDoveAuthenticationError,
    DevilNDoveClient,
    DevilNDoveConfigurationError,
)


def test_devilndove_requires_https_for_remote_origin() -> None:
    with pytest.raises(
        DevilNDoveConfigurationError,
        match="HTTPS",
    ):
        DevilNDoveClient(
            "http://devilndove.com",
            "credential",
        )


def test_reads_are_get_only_bounded_and_normalized() -> None:
    seen: list[tuple[str, str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(
            (
                request.method,
                request.url.path,
                request.headers.get("Authorization", ""),
            )
        )
        if request.url.path == "/api/admin/product-picker":
            assert request.url.params["limit"] == "50"
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "products": [
                        {
                            "product_id": 7,
                            "name": "Maker Ring",
                            "slug": "maker-ring",
                            "sku": "RING-7",
                            "status": "active",
                            "updated_at": "2026-10-09",
                            "secret": "must-not-pass-through",
                        }
                    ],
                    "pagination": {"next_cursor": 6},
                },
            )
        if request.url.path == "/api/admin/orders":
            assert request.url.params["limit"] == "100"
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "orders": [
                        {
                            "order_id": 99,
                            "order_number": "DD-0099",
                            "customer_name": "Customer",
                            "customer_email": "customer@example.com",
                            "order_status": "processing",
                            "derived_payment_status": "paid",
                            "fulfillment_type": "shipping",
                            "currency": "CAD",
                            "total_cents": 12500,
                            "outstanding_cents": 0,
                            "item_count": 2,
                            "product_search_text": "internal projection",
                            "created_at": "2026-10-09",
                            "updated_at": "2026-10-09",
                        }
                    ],
                },
            )
        if request.url.path == ("/api/admin/contracts/inventory-read"):
            assert request.url.params["limit"] == "100"
            assert request.url.params["include_tools"] == "false"
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "items": [
                        {
                            "site_item_inventory_id": 11,
                            "source_type": "supply",
                            "external_key": "clay-black",
                            "item_name": "Black polymer clay",
                            "category": "polymer clay",
                            "on_hand_quantity": 8,
                            "reserved_quantity": 2,
                            "available_quantity": 6,
                            "unit_cost_cents": 399,
                            "stock_unit_label": "package",
                            "supplier_name": "Supplier",
                            "supplier_sku": "BLACK-1",
                            "captured_ingredients": ("large upstream field"),
                        }
                    ],
                },
            )
        return httpx.Response(404)

    client = DevilNDoveClient(
        "https://devilndove.com",
        "admin-credential",
        transport=httpx.MockTransport(handler),
    )

    catalogue = client.catalogue(limit=999)
    orders = client.orders(limit=999)
    inventory = client.inventory(limit=999)

    assert catalogue.next_cursor == "6"
    assert catalogue.records[0]["name"] == "Maker Ring"
    assert "secret" not in catalogue.records[0]
    assert orders.records[0]["payment_status"] == "paid"
    assert "product_search_text" not in orders.records[0]
    assert inventory.records[0]["available_quantity"] == 6
    assert "captured_ingredients" not in inventory.records[0]
    assert all(method == "GET" for method, _, _ in seen)
    assert all(auth == "Bearer admin-credential" for _, _, auth in seen)


def test_authentication_error_is_sanitized() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={
                "ok": False,
                "error": "raw provider detail secret-value",
            },
        )

    client = DevilNDoveClient(
        "https://devilndove.com",
        "admin-credential",
        transport=httpx.MockTransport(handler),
    )
    with pytest.raises(
        DevilNDoveAuthenticationError,
        match="rejected the configured admin credential",
    ) as caught:
        client.orders(limit=10)
    assert "secret-value" not in str(caught.value)


def test_devilndove_story_write_is_forced_to_review_only_draft() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/api/admin/product-story-notes"
        assert request.headers["Authorization"] == "Bearer admin-credential"
        payload = __import__("json").loads(request.content)
        assert payload["action"] == "save"
        assert payload["product_id"] == 42
        assert payload["display_status"] == "draft"
        assert payload["privacy_status"] == "needs_review"
        assert payload["story_source"] == "rosevear_ai_hub"
        assert payload["story_heading"] == "Workshop story"
        assert payload["story_summary"] == "A review-only summary."
        assert payload["story_body"] == "Draft body"
        assert "published" not in str(payload)
        return httpx.Response(
            200,
            json={
                "ok": True,
                "note": {
                    "product_story_public_note_id": 77,
                    "product_id": 42,
                    "display_status": "draft",
                    "privacy_status": "needs_review",
                },
            },
        )

    client = DevilNDoveClient(
        "https://devilndove.com",
        "admin-credential",
        transport=httpx.MockTransport(handler),
    )
    result = client.create_story_draft(
        product_id=42,
        heading="Workshop story",
        summary="A review-only summary.",
        body="Draft body",
    )

    assert result == {
        "accepted": True,
        "product_id": 42,
        "note_id": 77,
        "display_status": "draft",
        "privacy_status": "needs_review",
    }


def test_devilndove_rejects_credential_header_injection() -> None:
    with pytest.raises(DevilNDoveConfigurationError, match="header characters"):
        DevilNDoveClient(
            "https://devilndove.com",
            "credential\r\nInjected: yes",
        )
