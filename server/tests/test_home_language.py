from rosevear_ai_hub.home_language import parse_home_command, resolve_home_command


def states():
    return [
        {
            "entity_id": "light.living_room_lamp",
            "state": "off",
            "attributes": {"friendly_name": "Living room lamp"},
        },
        {
            "entity_id": "light.hall_lamp",
            "state": "on",
            "attributes": {"friendly_name": "Hall lamp"},
        },
        {
            "entity_id": "scene.movie_night",
            "state": "scening",
            "attributes": {"friendly_name": "Movie night"},
        },
        {
            "entity_id": "switch.kiln_power",
            "state": "off",
            "attributes": {"friendly_name": "Kiln power"},
        },
    ]


def test_parse_explicit_bounded_commands() -> None:
    assert parse_home_command("Please turn on the Living room lamp").action == "on"
    assert parse_home_command("turn the Living room lamp off").action == "off"
    assert parse_home_command("activate Movie night scene").action == "activate"
    assert parse_home_command("What is the temperature?") is None


def test_exact_allowlisted_name_resolves_for_direct_level_one_execution() -> None:
    resolution = resolve_home_command(
        "turn on the living room lamp",
        states(),
        {"light.living_room_lamp"},
    )

    assert resolution.status == "resolved"
    assert resolution.entity_id == "light.living_room_lamp"
    assert resolution.action == "on"
    assert resolution.friendly_name == "Living room lamp"
    assert resolution.confirmation_rule == "explicit_exact_allowlisted_level_1_direct"


def test_partial_and_duplicate_names_require_clarification() -> None:
    partial = resolve_home_command(
        "turn on lamp",
        states(),
        {"light.living_room_lamp", "light.hall_lamp"},
    )
    assert partial.status == "ambiguous"
    assert "will not guess" in partial.message

    duplicate_states = states() + [
        {
            "entity_id": "switch.living_room_lamp",
            "state": "off",
            "attributes": {"friendly_name": "Living room lamp"},
        }
    ]
    duplicate = resolve_home_command(
        "turn on living room lamp",
        duplicate_states,
        {"light.living_room_lamp", "switch.living_room_lamp"},
    )
    assert duplicate.status == "ambiguous"
    assert len(duplicate.candidates) == 2


def test_non_allowlisted_hazardous_bulk_and_mismatched_actions_do_not_execute() -> None:
    not_allowed = resolve_home_command(
        "turn on hall lamp",
        states(),
        {"light.living_room_lamp"},
    )
    assert not_allowed.status == "blocked"
    assert "safe-control allow list" in not_allowed.message

    hazardous = resolve_home_command(
        "turn on kiln power",
        states(),
        {"switch.kiln_power"},
    )
    assert hazardous.status == "blocked"
    assert "safety-sensitive" in hazardous.message

    bulk = resolve_home_command(
        "turn off all lights",
        states(),
        {"light.living_room_lamp", "light.hall_lamp"},
    )
    assert bulk.status == "blocked"
    assert "Bulk" in bulk.message

    mismatch = resolve_home_command(
        "activate living room lamp",
        states(),
        {"light.living_room_lamp"},
    )
    assert mismatch.status == "action_mismatch"


def test_unsupported_home_actions_are_not_handed_to_a_model_for_guessing() -> None:
    toggle = resolve_home_command(
        "toggle living room lamp",
        states(),
        {"light.living_room_lamp"},
    )
    assert toggle.status == "unsupported_action"
    assert "not supported" in toggle.message
