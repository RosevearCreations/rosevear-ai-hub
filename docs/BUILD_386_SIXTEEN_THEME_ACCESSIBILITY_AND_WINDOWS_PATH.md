# Build 386 — Unified Sixteen-Theme Cosmetic & Accessibility Acceptance

**Scope:** Rosevear AI Hub presentation-only. Shared three-Master theme tokens remain fixed by `.github/rosevear-master-themes.v2.json`. No peer authority, signer, QL-340C activation, task or Windows service change. **GitHub CI GREEN does not mean original Windows/phone/tablet acceptance.**

## Source implementation

- `themeAcceptance386.ts`: exact ordered 16-theme palette snapshot cross-checked against the shared Master manifest. WCAG 2.x mathematical **static colour-token** tests check normal/muted text >= 4.5:1 on panel/surface and accent against panel >= 3:1 for focus boundary. This does NOT inspect screenshot pixels or guarantee every browser-computed combination passes.
- `themeAccessibility386.css`: repairs common 16-theme panel/card/control foreground/background mismatches, preserves legacy High Contrast light-content appearance and Daylight light native colour scheme, uses 44–48px touch form targets, min-width zero, long-input limits, selectable date/time inputs, visible focus, horizontal scroll for genuinely wide tables, reduced-motion/forced-colors support. The CSS is loaded *last* after prior theme styles.
- `ThemeAcceptance386Panel.tsx`: owner-only `System → Shared 16-theme accessibility workshop`, all 16 palette choices, actual Hub theme application on explicit click, labelled long text/date/time/select/validation samples, desktop/tablet/phone CSS preview widths, and 48 separate owner-reported theme/device outcomes. The 48 reports are *session-only* and cannot sign real device, release, provider, or Master acceptance. The preview is NOT the whole live application or a real physical device.
- `themeAcceptance386.test.tsx`: literal 16-manifest parity, measured static contrast, real labelled React form interactions, native date/time, owner report changes, 48 combinations, safe fail-closed status and responsive/keyboard/forced-colors CSS invariants. Existing protected six CI jobs must pass on `dev`, isolated `main`, then the exact protected `main` push.
- No automatic screenshot runner or original-device field test is claimed. Test on actual browser/device and log any issue separately; 48 unverified owner reports never become certification.

## We have multiple Windows folders — which Hub path is valid?

**Do NOT create another copy or assume the most recently edited folder is running.** `C:\rc470` is the separate **rosevear-comms-hub** repository, not the AI Hub. GitHub's `RosevearCreations/rosevear-ai-hub` repository is the **source of truth for protected Build386 code**; the active Windows runtime folder cannot be determined remotely from GitHub.

### Step 1 — Download the standalone discovery script

Use the attached `Find-RosevearHub386.ps1` downloaded directly from the chat, or the checked-in source file `scripts/Find-RosevearHub386.ps1` in protected GitHub `main` after promotion. Save in **Downloads**, **not** inside any guessed Hub folder. Read the file if desired: it only enumerates folders, checks their `server\src\rosevear_ai_hub\main.py`, `apps\web\src\App.tsx` and GitHub remotes; it does **not** clone/fetch, delete, rename, reset, start/stop tasks, change permissions or write any files.

### Step 2 — Run on the original Windows computer, not another laptop

At `DESKTOP-AE894KC`, press Windows key, type **PowerShell**, open Windows PowerShell as the existing Hub owner (no elevation needed for this check). Paste:

```powershell
$script = Join-Path $env:USERPROFILE 'Downloads\Find-RosevearHub386.ps1'
if (-not (Test-Path -LiteralPath $script)) { throw 'Place Find-RosevearHub386.ps1 in Downloads first.' }
Get-Content -LiteralPath $script -TotalCount 12
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script
```

The temporary `-ExecutionPolicy Bypass` applies only to this launched PowerShell process, not global Windows settings. **Only run the script from this reviewed download**, never an unsolicited email or another file with the same name. It lists paths, `RemoteMatchesHub`, `Branch`, `Commit`, `WorkingTree`. It inspects a bounded set of common Windows folders and stops after 4,500 directories. It may not find custom drives/deep locations. If none found, run `Get-PSDrive -PSProvider FileSystem` and repeat with `-ExtraRoots 'F:\'` for the correct custom drive; do not invent a location.

### Step 3 — Choose safely; one Git checkout is not proof of running path

- Reject `Source copy without .git`, `RemoteMatchesHub=False`, and a remote for `rosevear-comms-hub` or another application.
- If two or more valid Git checkouts exist, **STOP: ambiguous**. Do not select by newest commit or folder name.
- On Windows, open **Task Scheduler**: Start → search `Task Scheduler` → **Task Scheduler Library** → find the existing `Rosevear AI Hub Startup/Recovery` or similarly named Hub tasks → double-click → **Actions** tab. Read (do not change) **Program/script**, **Add arguments**, and **Start in**. Identify which Hub directory they actually reference. Avoid copying command lines containing secrets to chat.
- If a Windows service is the actual launcher, open **Services** (Start → `services.msc`) and review its **Path to executable** privately. Do not change its logon identity, restart it or disable it.
- If tasks/services disagree with the identified Git checkout, **STOP**. We must reconcile launcher authority and backups before declaring one folder active.

### Step 4 — Check the verified existing folder without destroying changes

After the running launcher is independently associated with one exact directory, paste the **actual** returned path in this prompt:

```powershell
$hub = Read-Host 'Paste FULL existing verified Rosevear AI Hub Git folder'
if (-not (Test-Path -LiteralPath (Join-Path $hub 'server\src\rosevear_ai_hub\main.py'))) {
  throw 'STOP: not a Hub source folder.'
}
git -C $hub remote -v
git -C $hub status -sb
git -C $hub log -1 --oneline
```

**Do not** automatically switch branches or fetch/pull if uncommitted changes, an unexpected remote, or divergent history appears. The source promotion for Build386 is on GitHub; pulling onto this original Windows host is an independent, supervised installation step. Once clean and confirmed, use `git -C $hub fetch origin main`, `git -C $hub switch main`, `git -C $hub pull --ff-only origin main`, then read the final protected `main` commit. If any command fails, stop; do not use `reset --hard`, `clean -fd` or force pulls. Git source update alone **does not** restart the running Hub or install a new web bundle; use the already-approved in-app **Update Hub** procedure and backup/rollback checks, without starting duplicate Python/Node services.

## Original-device 16 x 3 acceptance checklist

**When:** after the protected `main` source workflow is GREEN and the genuinely running Hub installation is updated/verified, never before.

1. Sign in on the **original Windows Hub** as an owner. Open **System → Shared 16-theme accessibility workshop**.
2. Start with `Master Instrument`, then work through each of the 16 supplied palettes. Click **Apply ... to the actual Hub shell** and verify menus/real dashboards stay readable, particularly Home, System, device and admin forms.
3. Check desktop in a real browser, then the actual tablet and phone (or mark them *not checked*). The desktop/tablet/phone frame in the workshop only simulates CSS width; it is not real device proof.
4. At each of the 48 combinations: check text and muted text, long labels/field input, native date and time pickers, visible validation messages, tab/shift-tab/Enter/Escape focus, and browser zoom at **200% and 400%** without hidden actions or critical content. Use the device's actual zoom settings; do not assume the preview simulates zoom.
5. Mark **Report locally reviewed / acceptable** or **Report issue requiring follow-up**. Leave untested cells unchecked; no automatic overall pass is granted. Record failures for engineering review separately. This is a session-only checklist, not external signed evidence.
6. Cross-Master parity additionally requires **independent** checks on AI Data Platform and Rosevear Comms Hub; Build386 updates only the AI Hub repository. External Master apps, original Windows runtime and mobile/tablet acceptance all remain **FIELD HOLD** until independently witnessed.

**Rollback:** revert reviewed source changes through GitHub only if needed; never remove user preferences, signed journals, Windows tasks, unrelated Comms clone or private service desk data. This build requires no secrets and no changes to original Windows services.

**Next proposed:** Build 387 — End-to-End Household and Masters Acceptance Campaign.
