<# Build 357 / QL-466. PURE read-only task identity evaluation.
   Never output task action paths, arguments, accounts, passwords, host-specific
   scheduled task XML, private config or user directories. Do not mutate tasks.
#>
Set-StrictMode -Version Latest

function Resolve-HubUnattendedSid357 {
    param([AllowEmptyString()][string]$Identity)
    if ([string]::IsNullOrWhiteSpace($Identity)) { return '' }
    try {
        if ($Identity -match '^S-\d+-\d+(-\d+)+$') {
            return ([Security.Principal.SecurityIdentifier]::new($Identity)).Value
        }
        return ([Security.Principal.NTAccount]::new($Identity)).Translate(
            [Security.Principal.SecurityIdentifier]).Value
    } catch { return '' }
}

function Test-HubUnattendedTaskIdentity357 {
    [CmdletBinding()]
    param(
        [AllowNull()][object]$Task,
        [Parameter(Mandatory)][ValidateSet('Boot','Time')][string]$TriggerKind,
        [Parameter(Mandatory)][string]$ExpectedExecutable,
        [Parameter(Mandatory)][string]$ExpectedArguments,
        [Parameter(Mandatory)][string]$ExpectedUserId
    )
    $fields = [ordered]@{
        taskPresent=$false
        rootTaskPath=$false
        exactlyOneAction=$false
        executableExact=$false
        argumentsExact=$false
        exactlyOneTrigger=$false
        triggerKindExact=$false
        recoveryIntervalExact=$false
        recoveryDurationIndefinite=$false
        principalSameSid=$false
        passwordBatchLogon=$false
    }
    if ($null -ne $Task) {
        $fields.taskPresent=$true
        $fields.rootTaskPath=([string]$Task.TaskPath -ceq '\')
        $actions=@($Task.Actions)
        $triggers=@($Task.Triggers)
        $fields.exactlyOneAction=($actions.Count -eq 1)
        $fields.exactlyOneTrigger=($triggers.Count -eq 1)
        if ($fields.exactlyOneAction) {
            $exe=[string]$actions[0].Execute
            try {
                if ([IO.Path]::IsPathRooted($exe)) {
                    $fields.executableExact=([IO.Path]::GetFullPath($exe) -ieq
                        [IO.Path]::GetFullPath($ExpectedExecutable))
                }
            } catch { $fields.executableExact=$false }
            $fields.argumentsExact=([string]$actions[0].Arguments -ceq $ExpectedArguments)
        }
        if ($fields.exactlyOneTrigger) {
            $fields.triggerKindExact=(
                [string]$triggers[0].CimClass.CimClassName -eq
                ('MSFT_Task' + $TriggerKind + 'Trigger'))
            if ($TriggerKind -eq 'Time') {
                $fields.recoveryIntervalExact=(
                    [string]$triggers[0].Repetition.Interval -eq 'PT5M')
                $fields.recoveryDurationIndefinite=(
                    [string]::IsNullOrWhiteSpace([string]$triggers[0].Repetition.Duration))
            } else {
                $fields.recoveryIntervalExact=$true
                $fields.recoveryDurationIndefinite=$true
            }
        }
        $expectedSid=Resolve-HubUnattendedSid357 -Identity $ExpectedUserId
        $actualSid=Resolve-HubUnattendedSid357 -Identity ([string]$Task.Principal.UserId)
        $fields.principalSameSid=(
            -not [string]::IsNullOrWhiteSpace($expectedSid) -and
            $actualSid -eq $expectedSid)
        $fields.passwordBatchLogon=(
            [string]$Task.Principal.LogonType -eq 'Password')
    }
    $reasonCodes=@(
        foreach ($entry in $fields.GetEnumerator()) {
            if ($entry.Value -ne $true) {
                switch ($entry.Key) {
                    'taskPresent' {'TASK_ABSENT'}
                    'rootTaskPath' {'TASK_PATH_MISMATCH'}
                    'exactlyOneAction' {'ACTION_COUNT_MISMATCH'}
                    'executableExact' {'EXECUTABLE_MISMATCH'}
                    'argumentsExact' {'ARGUMENTS_MISMATCH'}
                    'exactlyOneTrigger' {'TRIGGER_COUNT_MISMATCH'}
                    'triggerKindExact' {'TRIGGER_KIND_MISMATCH'}
                    'recoveryIntervalExact' {'RECOVERY_INTERVAL_MISMATCH'}
                    'recoveryDurationIndefinite' {'RECOVERY_DURATION_MISMATCH'}
                    'principalSameSid' {'ACCOUNT_SID_MISMATCH'}
                    'passwordBatchLogon' {'PASSWORD_LOGON_MISMATCH'}
                }
            }
        }
    )
    return [pscustomobject]@{
        schema='rosevear.hub.unattended-identity357.v1'
        taskPresent=[bool]$fields.taskPresent
        identityVerified=($reasonCodes.Count -eq 0)
        checks=[pscustomobject]$fields
        reasonCodes=@($reasonCodes)
        changesMade=$false
    }
}
