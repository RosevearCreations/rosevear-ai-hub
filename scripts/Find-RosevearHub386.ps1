# Build 386 — read-only Rosevear AI Hub checkout discovery.
# Does NOT write files, clone/fetch, switch branches, reset, start tasks or services.
# Open Windows PowerShell; run explicitly on the original Hub computer.
param([string[]]$ExtraRoots = @())

$ErrorActionPreference = 'Continue'
$projectRelative = 'server\src\rosevear_ai_hub\main.py'
$webRelative = 'apps\web\src\App.tsx'
$remoteExpected = 'RosevearCreations/rosevear-ai-hub'
$seeds = @(
    @{Path=$env:USERPROFILE; MaxDepth=6},
    @{Path='C:\'; MaxDepth=2},
    @{Path='D:\'; MaxDepth=3},
    @{Path='E:\'; MaxDepth=3},
    @{Path=(Join-Path $env:USERPROFILE 'OneDrive'); MaxDepth=3}
)
foreach ($extra in $ExtraRoots) {
    $seeds += @{Path=$extra; MaxDepth=6}
}
$ignore = @(
    'AppData', 'Windows', 'Program Files', 'Program Files (x86)',
    'ProgramData', '$Recycle.Bin', 'System Volume Information',
    'node_modules', '.git', '.venv', 'venv', '__pycache__', '.next',
    'dist', 'build', '.cache', '.npm', '.nuget', '.rustup', '.cargo'
)
$queue = New-Object 'System.Collections.Generic.Queue[object]'
$seen = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
foreach ($entry in $seeds) {
    if ($entry.Path -and (Test-Path -LiteralPath $entry.Path -PathType Container)) {
        $queue.Enqueue(@{Path=[IO.Path]::GetFullPath($entry.Path); Depth=0; MaxDepth=$entry.MaxDepth})
    }
}
$matches = New-Object 'System.Collections.Generic.List[object]'
$visitedCount = 0
while ($queue.Count -gt 0 -and $visitedCount -lt 4500) {
    $current = $queue.Dequeue()
    $path = [string]$current.Path
    if (-not $seen.Add($path)) { continue }
    $visitedCount++
    if ((Test-Path -LiteralPath (Join-Path $path $projectRelative) -PathType Leaf) -and
        (Test-Path -LiteralPath (Join-Path $path $webRelative) -PathType Leaf)) {
        $gitIndicator = Join-Path $path '.git'
        $hasGit = Test-Path -LiteralPath $gitIndicator
        $origin = ''
        $branchName = ''
        $head = ''
        $dirty = 'Unknown'
        if ($hasGit -and (Get-Command git -ErrorAction SilentlyContinue)) {
            $origin = (& git -C $path remote get-url origin 2>$null | Out-String).Trim()
            $branchName = (& git -C $path branch --show-current 2>$null | Out-String).Trim()
            $head = (& git -C $path rev-parse HEAD 2>$null | Out-String).Trim()
            $changes = @(& git -C $path status --porcelain 2>$null)
            $dirty = if ($changes.Count -eq 0) { 'Clean' } else { "$($changes.Count) local change(s)" }
        }
        $correctRemote = ($origin -match '(^https://github\.com/|^git@github\.com:|^ssh://git@github\.com/)' -and
            $origin -match 'RosevearCreations/rosevear-ai-hub(?:\.git)?$')
        $matches.Add([pscustomobject]@{
            Path = $path
            Kind = if ($hasGit) { 'Git checkout' } else { 'Source copy without .git' }
            RemoteMatchesHub = [bool]$correctRemote
            Origin = if ($origin) { $origin } else { '[not confirmed]' }
            Branch = if ($branchName) { $branchName } else { '[unknown]' }
            Commit = if ($head) { $head } else { '[unknown]' }
            WorkingTree = $dirty
        })
    }
    if ($current.Depth -ge $current.MaxDepth) { continue }
    $children = @(Get-ChildItem -LiteralPath $path -Directory -Force -ErrorAction SilentlyContinue)
    foreach ($child in $children) {
        if ($child.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
        if ($ignore -contains $child.Name) { continue }
        $queue.Enqueue(@{
            Path=$child.FullName
            Depth=($current.Depth + 1)
            MaxDepth=$current.MaxDepth
        })
    }
}
Write-Host ''
Write-Host "Build 386 — Rosevear AI Hub candidate checkout discovery (READ ONLY)"
Write-Host "Directories examined (capped at 4500): $visitedCount"
Write-Host "Candidate Hub folders: $($matches.Count)"
Write-Host ''
if ($matches.Count -eq 0) {
    Write-Warning 'No candidate found in the bounded scan. Do NOT create a new clone yet.'
    Write-Host 'List available drives with: Get-PSDrive -PSProvider FileSystem'
    Write-Host 'Run again with an additional root, e.g.: .\Find-RosevearHub386.ps1 -ExtraRoots F:\'
} else {
    $matches | Format-List Path,Kind,RemoteMatchesHub,Origin,Branch,Commit,WorkingTree
    $valid = @($matches | Where-Object { $_.RemoteMatchesHub -and $_.Kind -eq 'Git checkout' })
    if ($valid.Count -eq 0) {
        Write-Warning 'No verified Hub Git checkout. Do not pull, reset or install anything.'
    } elseif ($valid.Count -gt 1) {
        Write-Warning 'MULTIPLE MATCHING HUB CHECKOUTS. The current runtime/task target is NOT identified.'
        Write-Host 'Do not choose by modification date or commit alone; confirm the configured Windows service/task path separately.'
    } else {
        Write-Host 'One correct GitHub remote found, but the actively running Windows Hub path still needs independent verification.'
        Write-Host 'DO NOT edit or update until startup task/service path is confirmed and local changes are reviewed.'
    }
}
Write-Host 'Source GitHub repo: https://github.com/RosevearCreations/rosevear-ai-hub'
Write-Host 'No files, scheduled tasks, services or Git refs were modified.'
