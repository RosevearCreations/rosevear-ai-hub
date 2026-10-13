<# Build 060: pure allow-list policy. No network or process changes. #>
function Test-HubReleaseEligible {
    param(
        [string]$RemoteSha,
        [object]$Run,
        [object[]]$Jobs
    )
    if ($RemoteSha -cnotmatch '^[0-9a-f]{40}$' -or $null -eq $Run) { return $false }
    if ([string]$Run.head_sha -cne $RemoteSha) { return $false }
    if ([string]$Run.head_branch -cne 'main' -or [string]$Run.event -cne 'push') { return $false }
    if ([string]$Run.status -cne 'completed' -or [string]$Run.conclusion -cne 'success') { return $false }
    if ([string]$Run.name -cne 'Foundation, Backend, Web and Desktop Checks') { return $false }
    $required = @('docs-foundation', 'backend', 'web', 'backup-windows', 'desktop-windows')
    foreach ($name in $required) {
        $matched = @($Jobs | Where-Object { $_.name -ceq $name })
        if ($matched.Count -ne 1) { return $false }
        if ([string]$matched[0].status -cne 'completed' -or [string]$matched[0].conclusion -cne 'success') { return $false }
    }
    return $true
}

function Test-HubSchemaChanges {
    param([string[]]$ChangedPaths)
    # Any changes in migration history require operator-reviewed backup + migration.
    return [bool](@($ChangedPaths | Where-Object { $_ -match '^server/alembic/versions/' }).Count -gt 0)
}

function Test-HubOrigin {
    param([string]$Origin)
    return [bool]($Origin -cmatch '^(https://github\.com/RosevearCreations/rosevear-ai-hub(?:\.git)?|git@github\.com:RosevearCreations/rosevear-ai-hub(?:\.git)?)$')
}

function Test-HubWebProcessIdentity {
    param(
        [string]$ActualExecutable,
        [string]$CommandLine,
        [string]$RepoRoot
    )
    if (!$ActualExecutable -or !$CommandLine -or !$RepoRoot) { return $false }
    try {
        $root = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\')
        $exe = [System.IO.Path]::GetFullPath($ActualExecutable)
    } catch { return $false }
    if ([System.IO.Path]::GetFileName($exe) -ine 'node.exe') { return $false }
    $command = $CommandLine.Replace('/', '\')
    $permitted = @(
        "$root\node_modules\vite\bin\vite.js",
        "$root\apps\web\node_modules\vite\bin\vite.js"
    )
    $isRepoVite = $false
    foreach ($path in $permitted) {
        if ($command.IndexOf($path, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $isRepoVite = $true
        }
    }
    return [bool]($isRepoVite -and
        $CommandLine -match '(?i)--host(?:=|\s+)127\.0\.0\.1(?:\s|$)' -and
        $CommandLine -match '(?i)--strictPort(?:\s|$)')
}
