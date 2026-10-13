$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'hub-release-policy.ps1')
$sha = 'a' * 40
$run = [pscustomobject]@{
    head_sha = $sha
    head_branch = 'main'
    event = 'push'
    status = 'completed'
    conclusion = 'success'
    name = 'Foundation, Backend, Web and Desktop Checks'
}
$jobs = @('docs-foundation', 'backend', 'web', 'backup-windows', 'desktop-windows') |
    ForEach-Object { [pscustomobject]@{ name = $_; status = 'completed'; conclusion = 'success' } }
if (-not (Test-HubReleaseEligible -RemoteSha $sha -Run $run -Jobs $jobs)) { throw 'GREEN five-job main push should be approved.' }
$run.event = 'pull_request'
if (Test-HubReleaseEligible -RemoteSha $sha -Run $run -Jobs $jobs) { throw 'PR green is not independent main push green.' }
$run.event = 'push'
$run.head_sha = 'b' * 40
if (Test-HubReleaseEligible -RemoteSha $sha -Run $run -Jobs $jobs) { throw 'Old release must not be adopted.' }
$run.head_sha = $sha
$jobs[0].conclusion = 'skipped'
if (Test-HubReleaseEligible -RemoteSha $sha -Run $run -Jobs $jobs) { throw 'Skipped required job must block.' }
$jobs[0].conclusion = 'success'
if (Test-HubReleaseEligible -RemoteSha $sha -Run $run -Jobs @($jobs[0..3])) { throw 'Missing Windows desktop job must block.' }
if (-not (Test-HubSchemaChanges @('docs/BUILD_STATUS.md', 'server/alembic/versions/0020_schema.py'))) { throw 'Schema migration not detected.' }
if (Test-HubSchemaChanges @('apps/web/src/App.tsx')) { throw 'A web-only release should not require schema migration.' }
if (-not (Test-HubOrigin 'https://github.com/RosevearCreations/rosevear-ai-hub.git')) { throw 'Valid HTTPS remote rejected.' }
if (-not (Test-HubOrigin 'git@github.com:RosevearCreations/rosevear-ai-hub.git')) { throw 'Valid SSH remote rejected.' }
if (Test-HubOrigin 'https://evil.example/RosevearCreations/rosevear-ai-hub') { throw 'Untrusted origin allowed.' }
$root = 'C:\Users\HubTest\rosevearaihub'
$web = [pscustomobject]@{
    ActualExecutable = 'C:\Program Files\nodejs\node.exe'
    RepoRoot = $root
    CommandLine = '"C:\Program Files\nodejs\node.exe" C:\Users\HubTest\rosevearaihub\node_modules\vite\bin\vite.js --host 127.0.0.1 --strictPort'
}
if (-not (Test-HubWebProcessIdentity -ActualExecutable $web.ActualExecutable -CommandLine $web.CommandLine -RepoRoot $web.RepoRoot)) { throw 'Known Vite loopback listener rejected.' }
$web.CommandLine = $web.CommandLine.Replace('127.0.0.1', '0.0.0.0')
if (Test-HubWebProcessIdentity -ActualExecutable $web.ActualExecutable -CommandLine $web.CommandLine -RepoRoot $web.RepoRoot) { throw 'Network-exposed Vite listener allowed.' }
$web.CommandLine = 'node.exe C:\Users\HubTest\other\node_modules\vite\bin\vite.js --host 127.0.0.1 --strictPort'
if (Test-HubWebProcessIdentity -ActualExecutable $web.ActualExecutable -CommandLine $web.CommandLine -RepoRoot $web.RepoRoot) { throw 'Unrelated Vite listener allowed.' }
Write-Host 'Build 060 local release eligibility, origin and web ownership tests passed.' -ForegroundColor Green
$web.CommandLine = '"C:\Program Files\nodejs\node.exe" "C:\Users\HubTest\rosevearaihub\node_modules\.bin\\..\vite\bin\vite.js" --host 127.0.0.1 --strictPort'
if (-not (Test-HubWebProcessIdentity -ActualExecutable $web.ActualExecutable -CommandLine $web.CommandLine -RepoRoot $web.RepoRoot)) { throw 'Actual npm-generated Vite path was rejected.' }
$web.CommandLine = '"C:\Program Files\nodejs\node.exe" "C:\Users\HubTest\rosevearaihub\node_modules\vite\bin\vite.js"'
if (-not (Test-HubWebProcessIdentity -ActualExecutable $web.ActualExecutable -CommandLine $web.CommandLine -RepoRoot $web.RepoRoot -LoopbackListenerVerified)) { throw 'Legacy Vite must be accepted after independent loopback listener verification.' }
$web.CommandLine += '.unrelated'
if (Test-HubWebProcessIdentity -ActualExecutable $web.ActualExecutable -CommandLine $web.CommandLine -RepoRoot $web.RepoRoot -LoopbackListenerVerified) { throw 'Vite substring accepted without an exact normalized argument.' }
