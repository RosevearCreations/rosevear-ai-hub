# Build 222 — Global Search, Help Centre & Guided Troubleshooting

The authenticated Hub now has a **Search & Help** workspace and navigation entry. Typing filters *locally* over role-permitted screen names and bundled troubleshooting articles (missing Home Assistant device, camera issues, Windows startup, workshop maintenance). Help is available without performing network discovery or exposing secrets. The owner/administrator can deliberately request an additional search of existing local records with at least two characters.

The read-only `/api/v1/global-search` endpoint searches a bounded sample (250 each) of saved device annotations, camera registry names, workshop equipment and maintenance action titles. It returns at most 60 result cards with a source label and authorized destination. It does not search upstream Home Assistant, MQTT, cameras or cloud platforms; it never emits stored camera addresses, stream URLs, device source IDs, passwords or credentials. Results are *saved data*, not live device or camera health. Household/read-only accounts are denied the endpoint and never see the record-search button. Neither typed help search nor opening navigation cards sends a server search request.

## Acceptance checklist

1. Verify keyboard-operated Search & Help navigation, search field, result buttons, focus visibility, compact layout and high-contrast mode.
2. Search for *camera*, *missing device* and *startup*. Confirm source-labelled instructions and real authorized screen destinations.
3. As owner, type two or more characters and explicitly click **Search saved Hub records**. Verify the count, query and local-origin note. With an unavailable API show an error rather than fabricated empty inventory.
4. As household/read-only, verify only authorized navigation/help and a 403 response from the saved-record endpoint. Confirm no secret, host, RTSP URL or upstream device ID leaks through results.
5. Verify no device action, external cloud request, telemetry, camera stream access or automatic diagnostics occurs from the search page.

QL-275 remains **Under Review / deferred**. Source promotion is not installed-Windows acceptance.
