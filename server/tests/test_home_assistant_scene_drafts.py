"""Build 144 acceptance: explicit scene planning, freshness, receipts and role holds."""

from dataclasses import replace
from time import monotonic

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.home_assistant import get_home_assistant_runtime
from rosevear_ai_hub.api.home_assistant_controls import HomeAssistantRuntime
from rosevear_ai_hub.api.home_assistant_scenes import _tickets
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantUnavailableError
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, Base


class FakeHomeAssistant:
    base_url = "http://homeassistant.test"

    def __init__(self):
        self.values = {
            "light.living_room": "off",
            "switch.desk_fan": "off",
            "light.office": "off",
            "switch.kiln_power": "off",
            "scene.movie_night": "scening",
            "climate.thermostat": "21",
        }
        self.actions = []
        self.reject = set()
        self.skip_state_update = set()
        self.fail_observation_after_action = False
        self.side_effect_target = None

    async def states(self):
        if self.actions and self.fail_observation_after_action:
            raise HomeAssistantUnavailableError("source unavailable")
        return [
            {
                "entity_id": key,
                "state": value,
                "attributes": {"friendly_name": key.rsplit(".", 1)[-1].replace("_", " ")},
            }
            for key, value in self.values.items()
        ]

    async def _act(self, domain, entity_id, enabled):
        if entity_id in self.reject:
            raise HomeAssistantUnavailableError("provider refused")
        self.actions.append((domain, entity_id, enabled))
        if entity_id not in self.skip_state_update:
            self.values[entity_id] = "on" if enabled else "off"
        if self.side_effect_target:
            self.values[self.side_effect_target] = "on"
        return []

    async def set_light(self, entity_id, *, enabled):
        return await self._act("light", entity_id, enabled)

    async def set_switch(self, entity_id, *, enabled):
        return await self._act("switch", entity_id, enabled)

    async def activate_scene(self, entity_id):
        raise AssertionError("Native opaque Home Assistant scenes must not execute via drafts")


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'scene-build144.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    fake = FakeHomeAssistant()

    def override_session():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_home_assistant_runtime] = lambda: HomeAssistantRuntime(
        client=fake,
        base_url=fake.base_url,
        url_configured=True,
        token_configured=True,
    )
    client = TestClient(app)
    assert (
        client.post(
            "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
        ).status_code
        == 201
    )
    return client, sessions, fake


def allow(client, ids):
    result = client.put(
        "/api/v1/home-assistant/control-policy",
        json={
            "allowed_entity_ids": ids,
            "acknowledge_low_risk_only": True,
        },
    )
    assert result.status_code == 200


def draft(*steps):
    return [{"entity_id": target, "action": action} for target, action in steps]


def preview(client, actions):
    return client.post("/api/v1/home-assistant/scene-drafts/preview", json={"actions": actions})


def execute(client, result, actions, phrase=None):
    return client.post(
        "/api/v1/home-assistant/scene-drafts/execute",
        json={
            "preview_id": result["preview_id"],
            "confirmation_phrase": phrase or result["confirmation_phrase"],
            "actions": actions,
        },
    )


def test_scene_preview_no_write_execute_verifies_and_replay_is_held(tmp_path):
    client, sessions, fake = build_client(tmp_path)
    allow(client, ["light.living_room", "switch.desk_fan"])
    actions = draft(("light.living_room", "on"), ("switch.desk_fan", "on"))
    proposed = preview(client, actions)
    assert proposed.status_code == 200
    plan = proposed.json()
    assert plan["actions"][0]["current_state"] == "off"
    assert plan["actions"][1]["expected_effect"] == "on"
    assert fake.actions == []
    wrong_phrase = execute(client, plan, actions, "RUN WRONG")
    assert wrong_phrase.status_code == 409
    assert fake.actions == []

    # Failed confirmation consumes its one-time ticket; a new deliberate preview is required.
    again = preview(client, actions).json()
    performed = execute(client, again, actions)
    assert performed.status_code == 200
    assert performed.json()["outcome"] == "executed"
    assert [item["outcome"] for item in performed.json()["receipts"]] == ["executed", "executed"]
    assert len(fake.actions) == 2
    assert execute(client, again, actions).status_code == 409
    assert len(fake.actions) == 2
    with sessions() as db:
        receipts = db.scalars(
            select(AuditEvent).where(
                AuditEvent.event_type == "home_assistant.scene_draft.action_receipt"
            )
        ).all()
        assert len(receipts) == 2
        assert all(record.result_status == "success" for record in receipts)


def test_unapproved_high_risk_duplicate_and_opaque_scene_are_rejected(tmp_path):
    client, _sessions, fake = build_client(tmp_path)
    allow(client, ["light.living_room", "switch.desk_fan", "scene.movie_night"])
    invalids = [
        draft(("scene.movie_night", "on")),
        draft(("climate.thermostat", "on")),
        draft(("switch.kiln_power", "on")),
        draft(("light.missing", "on")),
        draft(("light.living_room", "on"), ("light.living_room", "off")),
    ]
    for actions in invalids:
        assert preview(client, actions).status_code in {403, 409, 422}
    assert preview(client, []).status_code == 422
    assert preview(client, draft(*[("light.living_room", "on")] * 5)).status_code == 422
    assert fake.actions == []


def test_drift_expiration_and_policy_changes_hold_before_any_action(tmp_path):
    client, _sessions, fake = build_client(tmp_path)
    allow(client, ["light.living_room"])
    actions = draft(("light.living_room", "on"))
    plan = preview(client, actions).json()
    fake.values["light.living_room"] = "on"
    assert execute(client, plan, actions).status_code == 409
    assert fake.actions == []

    fake.values["light.living_room"] = "off"
    expired = preview(client, actions).json()
    ticket = _tickets[expired["preview_id"]]
    _tickets[expired["preview_id"]] = replace(ticket, expires_at=monotonic() - 1)
    assert execute(client, expired, actions).status_code == 409

    changed = preview(client, actions).json()
    allow(client, [])
    assert execute(client, changed, actions).status_code == 403
    assert fake.actions == []


def test_partial_and_unverified_execution_stop_remaining_actions(tmp_path):
    client, sessions, fake = build_client(tmp_path)
    allow(client, ["light.living_room", "switch.desk_fan", "light.office"])
    actions = draft(("light.living_room", "on"), ("switch.desk_fan", "on"), ("light.office", "on"))
    fake.reject.add("switch.desk_fan")
    plan = preview(client, actions).json()
    result = execute(client, plan, actions)
    assert result.status_code == 200
    assert result.json()["outcome"] == "partial"
    assert [row["outcome"] for row in result.json()["receipts"]] == [
        "executed",
        "rejected",
        "skipped",
    ]
    assert fake.actions == [("light", "light.living_room", True)]

    with sessions() as db:
        assert (
            len(
                db.scalars(
                    select(AuditEvent).where(
                        AuditEvent.event_type == "home_assistant.scene_draft.action_receipt"
                    )
                ).all()
            )
            == 3
        )

    fake.actions.clear()
    fake.values["light.living_room"] = "off"
    fake.reject.clear()
    fake.skip_state_update.add("light.living_room")
    second = preview(client, actions).json()
    unverifiable = execute(client, second, actions)
    assert unverifiable.status_code == 200
    assert unverifiable.json()["outcome"] == "unverified"
    assert [row["outcome"] for row in unverifiable.json()["receipts"]] == [
        "unverified",
        "skipped",
        "skipped",
    ]
    assert fake.actions == [("light", "light.living_room", True)]


def test_privileged_access_only_and_actions_cannot_be_swapped(tmp_path):
    client, _sessions, fake = build_client(tmp_path)
    allow(client, ["light.living_room", "switch.desk_fan"])
    actions = draft(("light.living_room", "on"))
    plan = preview(client, actions).json()
    changed = draft(("switch.desk_fan", "on"))
    assert execute(client, plan, changed).status_code == 409
    assert fake.actions == []

    user = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert user.status_code == 201
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "family",
                "password": "family-password-123",
            },
        ).status_code
        == 200
    )
    assert preview(client, actions).status_code == 403
    assert execute(client, plan, actions).status_code == 403


def test_unexpected_second_target_change_stops_before_it_is_commanded(tmp_path):
    client, _sessions, fake = build_client(tmp_path)
    allow(client, ["light.living_room", "switch.desk_fan"])
    actions = draft(("light.living_room", "on"), ("switch.desk_fan", "on"))
    fake.side_effect_target = "switch.desk_fan"
    plan = preview(client, actions).json()
    result = execute(client, plan, actions)
    assert result.status_code == 200
    assert result.json()["outcome"] == "partial"
    assert [row["outcome"] for row in result.json()["receipts"]] == [
        "executed",
        "rejected",
    ]
    assert fake.actions == [("light", "light.living_room", True)]
