<# Build 106: deterministic, read-only Home Assistant VM and MQTT evidence verdict.
   Port reachability is never treated as authenticated HA/MQTT acceptance.
#>
Set-StrictMode -Version Latest

function Get-HubHaMqttEvidenceVerdict {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][hashtable]$Evidence)

    $checks = @(
        'VirtualBoxFound', 'VmFound', 'VmRunning', 'EfiEnabled',
        'HomeAssistantTcpReachable', 'MqttTcpReachable'
    )
    foreach ($key in $checks) {
        if (-not $Evidence.ContainsKey($key) -or $Evidence[$key] -isnot [bool]) {
            throw 'Incomplete or invalid Home Assistant/MQTT evidence.'
        }
    }
    $reason = 'READY_FOR_MANUAL_ACCEPTANCE'
    foreach ($check in @(
        @{ Key='VirtualBoxFound'; Reason='VIRTUALBOX_UNAVAILABLE' },
        @{ Key='VmFound'; Reason='VM_UNVERIFIED' },
        @{ Key='VmRunning'; Reason='VM_NOT_RUNNING' },
        @{ Key='EfiEnabled'; Reason='EFI_NOT_VERIFIED' },
        @{ Key='HomeAssistantTcpReachable'; Reason='HOME_ASSISTANT_TCP_UNREACHABLE' },
        @{ Key='MqttTcpReachable'; Reason='MQTT_TCP_UNREACHABLE' }
    )) {
        if (-not $Evidence[$check.Key]) {
            $reason = $check.Reason
            break
        }
    }
    return [pscustomobject]@{
        runtime_posture = if ($reason -eq 'READY_FOR_MANUAL_ACCEPTANCE') {
            'READY_FOR_MANUAL_ACCEPTANCE'
        } else { 'HOLD' }
        reason = $reason
        passed_checks = @($checks | Where-Object { $Evidence[$_] }).Count
        total_checks = $checks.Count
        authenticated_ha_status = 'UNVERIFIED_BY_TCP'
        authenticated_mqtt_status = 'UNVERIFIED_BY_TCP'
        device_inventory_continuity = 'MANUAL_REVIEW_REQUIRED'
        camera_inventory_and_playback = 'MANUAL_REVIEW_REQUIRED'
        vm_autostart_after_reboot = 'NOT_ESTABLISHED'
        changed_anything = $false
    }
}

Export-ModuleMember -Function Get-HubHaMqttEvidenceVerdict
