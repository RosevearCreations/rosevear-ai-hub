"""Deterministic natural-language resolution for safe Home Assistant tools."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.models import AppSetting

HomeAction = Literal["on", "off", "activate"]
ResolutionStatus = Literal[
    "not_home_command",
    "resolved",
    "ambiguous",
    "blocked",
    "not_found",
    "unsupported_action",
    "action_mismatch",
]

_ALLOWLIST_SETTING_KEY = "home_assistant.safe_control_allowlist"
_SAFE_DOMAINS = {"light", "switch", "scene"}
_HAZARD_MARKERS = (
    "alarm",
    "security",
    "smoke",
    "carbon monoxide",
    "carbon_monoxide",
    "co detector",
    "door lock",
    "garage door",
    "forge",
    "kiln",
    "laser",
    "cnc",
    "furnace",
    "boiler",
    "heater",
    "heating",
)
_BULK_WORDS = {"all", "everything", "every"}
_UNSUPPORTED_PREFIXES = (
    "toggle ",
    "dim ",
    "brighten ",
    "set brightness ",
    "unlock ",
    "lock ",
    "open ",
    "close ",
    "arm ",
    "disarm ",
)


@dataclass(frozen=True)
class ParsedHomeCommand:
    action: HomeAction
    target_text: str


@dataclass(frozen=True)
class HomeCommandCandidate:
    entity_id: str
    domain: str
    friendly_name: str
    state: str


@dataclass(frozen=True)
class HomeCommandResolution:
    status: ResolutionStatus
    message: str
    action: HomeAction | None = None
    target_text: str | None = None
    entity_id: str | None = None
    friendly_name: str | None = None
    candidates: tuple[HomeCommandCandidate, ...] = ()
    confirmation_rule: str | None = None


def load_safe_control_allowlist(session: Session) -> set[str]:
    setting = session.scalar(
        select(AppSetting).where(AppSetting.key == _ALLOWLIST_SETTING_KEY)
    )
    if setting is None or not isinstance(setting.value_json, list):
        return set()
    return {
        value.strip()
        for value in setting.value_json
        if isinstance(value, str) and value.strip()
    }


def _clean_text(value: str) -> str:
    cleaned = value.strip().lower()
    cleaned = re.sub(r"[?!.,;:]+$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    if cleaned.startswith("please "):
        cleaned = cleaned[7:].strip()
    if cleaned.endswith(" please"):
        cleaned = cleaned[:-7].strip()
    return cleaned


def _clean_target(value: str) -> str:
    target = _clean_text(value)
    for prefix in ("the ", "my "):
        if target.startswith(prefix):
            target = target[len(prefix) :].strip()
    return target


def _normalized_name(value: str) -> str:
    normalized = value.lower().replace("_", " ").replace("-", " ").replace(".", " ")
    normalized = re.sub(r"[^a-z0-9 ]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def parse_home_command(utterance: str) -> ParsedHomeCommand | None:
    """Parse only explicit, bounded household-control imperatives."""

    text = _clean_text(utterance)
    patterns: tuple[tuple[HomeAction, str], ...] = (
        ("on", r"^(?:turn|switch) on (.+)$"),
        ("on", r"^(?:turn|switch) (.+) on$"),
        ("on", r"^enable (.+)$"),
        ("off", r"^(?:turn|switch) off (.+)$"),
        ("off", r"^(?:turn|switch) (.+) off$"),
        ("off", r"^disable (.+)$"),
        ("activate", r"^activate (.+)$"),
        ("activate", r"^run (.+?) scene$"),
    )
    for action, pattern in patterns:
        match = re.match(pattern, text)
        if match:
            target = _clean_target(match.group(1))
            if action == "activate" and target.endswith(" scene"):
                target = target[:-6].strip()
            return ParsedHomeCommand(action=action, target_text=target)
    return None


def _looks_like_unsupported_home_command(utterance: str) -> bool:
    text = _clean_text(utterance)
    return any(text.startswith(prefix) for prefix in _UNSUPPORTED_PREFIXES)


def _candidate_from_state(item: dict[str, Any]) -> HomeCommandCandidate | None:
    entity_id = item.get("entity_id")
    state = item.get("state")
    if not isinstance(entity_id, str) or not isinstance(state, str):
        return None
    domain = entity_id.split(".", 1)[0] if "." in entity_id else ""
    if domain not in _SAFE_DOMAINS:
        return None
    attributes = item.get("attributes")
    friendly = None
    if isinstance(attributes, dict):
        value = attributes.get("friendly_name")
        if isinstance(value, str) and value.strip():
            friendly = value.strip()
    return HomeCommandCandidate(
        entity_id=entity_id,
        domain=domain,
        friendly_name=friendly or entity_id,
        state=state,
    )


def _is_hazardous(candidate: HomeCommandCandidate) -> bool:
    searchable = (
        candidate.entity_id + " " + candidate.friendly_name
    ).lower().replace("-", " ")
    return any(marker in searchable for marker in _HAZARD_MARKERS)


def _matches_exact(target: str, candidate: HomeCommandCandidate) -> bool:
    normalized_target = _normalized_name(target)
    local_id = candidate.entity_id.split(".", 1)[-1]
    names = {
        _normalized_name(candidate.friendly_name),
        _normalized_name(candidate.entity_id),
        _normalized_name(local_id),
    }
    return normalized_target in names


def _matches_partial(target: str, candidate: HomeCommandCandidate) -> bool:
    normalized_target = _normalized_name(target)
    if len(normalized_target) < 3:
        return False
    friendly = _normalized_name(candidate.friendly_name)
    local_id = _normalized_name(candidate.entity_id.split(".", 1)[-1])
    return normalized_target in friendly or normalized_target in local_id


def resolve_home_command(
    utterance: str,
    states: list[dict[str, Any]],
    allowed_entity_ids: set[str],
) -> HomeCommandResolution:
    """Resolve one natural-language command without allowing model discretion."""

    parsed = parse_home_command(utterance)
    if parsed is None:
        if _looks_like_unsupported_home_command(utterance):
            return HomeCommandResolution(
                status="unsupported_action",
                message=(
                    "That home action is not supported. Use an explicit light/switch "
                    "turn on or turn off command, or activate an approved scene."
                ),
                confirmation_rule="unsupported_actions_never_execute",
            )
        return HomeCommandResolution(
            status="not_home_command",
            message="This does not look like a supported home-control command.",
        )

    target_words = set(_normalized_name(parsed.target_text).split())
    if target_words & _BULK_WORDS:
        return HomeCommandResolution(
            status="blocked",
            action=parsed.action,
            target_text=parsed.target_text,
            message=(
                "Bulk home-control commands are not executed. Name one allow-listed "
                "light, switch, or scene."
            ),
            confirmation_rule="bulk_commands_never_execute",
        )

    candidates = [
        candidate
        for item in states
        if (candidate := _candidate_from_state(item)) is not None
    ]
    exact = [
        candidate for candidate in candidates if _matches_exact(parsed.target_text, candidate)
    ]

    if len(exact) > 1:
        return HomeCommandResolution(
            status="ambiguous",
            action=parsed.action,
            target_text=parsed.target_text,
            candidates=tuple(exact),
            message=(
                "That name matches more than one Home Assistant entity. "
                "Please restate the command using the exact entity name."
            ),
            confirmation_rule="ambiguous_names_require_clarification",
        )

    if not exact:
        partial = [
            candidate
            for candidate in candidates
            if _matches_partial(parsed.target_text, candidate)
        ]
        if partial:
            names = ", ".join(item.friendly_name for item in partial[:5])
            return HomeCommandResolution(
                status="ambiguous",
                action=parsed.action,
                target_text=parsed.target_text,
                candidates=tuple(partial[:10]),
                message=(
                    f"I found possible matches ({names}), but Build 024 will not guess. "
                    "Please repeat the command using the exact friendly name."
                ),
                confirmation_rule="partial_names_require_exact_restatement",
            )
        return HomeCommandResolution(
            status="not_found",
            action=parsed.action,
            target_text=parsed.target_text,
            message=(
                "No matching Home Assistant light, switch, or scene was found. "
                "Use the exact friendly name shown on Devices."
            ),
            confirmation_rule="unknown_targets_never_execute",
        )

    candidate = exact[0]
    if _is_hazardous(candidate):
        return HomeCommandResolution(
            status="blocked",
            action=parsed.action,
            target_text=parsed.target_text,
            entity_id=candidate.entity_id,
            friendly_name=candidate.friendly_name,
            candidates=(candidate,),
            message="That target is safety-sensitive or hazardous and cannot be delegated.",
            confirmation_rule="level_3_targets_never_execute",
        )

    if candidate.entity_id not in allowed_entity_ids:
        return HomeCommandResolution(
            status="blocked",
            action=parsed.action,
            target_text=parsed.target_text,
            entity_id=candidate.entity_id,
            friendly_name=candidate.friendly_name,
            candidates=(candidate,),
            message=(
                f"{candidate.friendly_name} is not on the safe-control allow list. "
                "An Owner/Administrator must approve it on Devices first."
            ),
            confirmation_rule="non_allowlisted_targets_never_execute",
        )

    if parsed.action == "activate" and candidate.domain != "scene":
        return HomeCommandResolution(
            status="action_mismatch",
            action=parsed.action,
            target_text=parsed.target_text,
            entity_id=candidate.entity_id,
            friendly_name=candidate.friendly_name,
            candidates=(candidate,),
            message="Activate is only valid for an approved Home Assistant scene.",
            confirmation_rule="invalid_action_entity_pairs_never_execute",
        )

    if parsed.action in {"on", "off"} and candidate.domain not in {"light", "switch"}:
        return HomeCommandResolution(
            status="action_mismatch",
            action=parsed.action,
            target_text=parsed.target_text,
            entity_id=candidate.entity_id,
            friendly_name=candidate.friendly_name,
            candidates=(candidate,),
            message="Turn on/off is only valid for an approved light or switch.",
            confirmation_rule="invalid_action_entity_pairs_never_execute",
        )

    return HomeCommandResolution(
        status="resolved",
        action=parsed.action,
        target_text=parsed.target_text,
        entity_id=candidate.entity_id,
        friendly_name=candidate.friendly_name,
        candidates=(candidate,),
        message=(
            "Exact, allow-listed Level-1 command resolved. The user's explicit imperative "
            "is sufficient for direct execution."
        ),
        confirmation_rule="explicit_exact_allowlisted_level_1_direct",
    )
