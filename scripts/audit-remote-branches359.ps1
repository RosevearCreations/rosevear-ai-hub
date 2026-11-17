<# Build 359 / QL-468 — non-destructive remote branch cleanup inventory.
   Never deletes/renames/moves branches. Only classifies exact origin/* refs
   against local origin/main. Run git fetch --prune origin first for fresh refs.
   SAFE_MERGED means branch tip ancestor of origin/main; hold everything else.
#>
[CmdletBinding()]
param([switch]$Json)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=(& git -C $root rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'HOLD_GIT_WORKTREE_REQUIRED' }
$main=@(& git -C $root rev-parse --verify refs/remotes/origin/main 2>$null)
if ($LASTEXITCODE -ne 0 -or $main.Count -ne 1) { throw 'HOLD_FETCHED_ORIGIN_MAIN_REQUIRED' }
$tracked=@(& git -C $root for-each-ref '--format=%(refname:short)' refs/remotes/origin)
if ($LASTEXITCODE -ne 0) { throw 'HOLD_REMOTE_REF_READ_FAILED' }
$records=@(
    foreach ($name in $tracked) {
        if ([string]::IsNullOrWhiteSpace($name) -or $name -eq 'origin/HEAD') { continue }
        $safeName=[string]$name
        $branch=$safeName -replace '^origin/',''
        if ($safeName -in @('origin/main','origin/dev')) {
            [pscustomobject]@{branch=$branch;state='KEEP_PROTECTED';reason='OWNER_KEEP_DEV_MAIN'}
            continue
        }
        $target=@(& git -C $root rev-parse --verify ('refs/remotes/' + $safeName) 2>$null)
        if ($LASTEXITCODE -ne 0 -or $target.Count -ne 1) {
            [pscustomobject]@{branch=$branch;state='HOLD_UNKNOWN';reason='INVALID_LOCAL_REMOTE_REF'}
            continue
        }
        & git -C $root merge-base --is-ancestor $target[0] $main[0] 2>$null
        $result=$LASTEXITCODE
        if ($result -eq 0) {
            [pscustomobject]@{branch=$branch;state='SAFE_MERGED';reason='TIP_ANCESTOR_OF_ORIGIN_MAIN'}
        } elseif ($result -eq 1) {
            [pscustomobject]@{branch=$branch;state='HOLD_UNMERGED';reason='UNIQUE_COMMITS_OR_DIVERGED'}
        } else {
            [pscustomobject]@{branch=$branch;state='HOLD_UNKNOWN';reason='MERGE_BASE_UNAVAILABLE'}
        }
    }
)
$summary=[pscustomobject]@{
    schema='rosevear.hub.branch-removal-audit359.v1'
    source='LOCAL_REMOTE_TRACKING_REFS_REQUIRES_FRESH_FETCH'
    originalRepo='RosevearCreations/rosevear-ai-hub'
    evaluatedAgainst='origin/main'
    branchCount=@($records).Count
    safeMergedCount=@($records | Where-Object state -eq 'SAFE_MERGED').Count
    holdUnmergedCount=@($records | Where-Object state -eq 'HOLD_UNMERGED').Count
    holdUnknownCount=@($records | Where-Object state -eq 'HOLD_UNKNOWN').Count
    changesMade=$false
    branches=$records
}
if ($Json) {
    $summary | ConvertTo-Json -Depth 5
} else {
    Write-Output 'BRANCH REMOVAL AUDIT - REVIEW ONLY; NO REMOTE DELETIONS'
    $records | Sort-Object state,branch | Format-Table -AutoSize | Out-String -Width 220
    Write-Output ('SAFE_MERGED=' + $summary.safeMergedCount + '; HOLD_UNMERGED=' + $summary.holdUnmergedCount + '; HOLD_UNKNOWN=' + $summary.holdUnknownCount)
}
