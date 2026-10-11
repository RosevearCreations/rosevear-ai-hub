param(
    [Parameter(Mandatory = $true)][string]$InputFile,
    [Parameter(Mandatory = $true)][string]$OutputFile
)
$ErrorActionPreference = "Stop"
# The backend writes user text to a private temporary file. Never pass it as a command argument.
Add-Type -AssemblyName System.Speech
$words = [System.IO.File]::ReadAllText($InputFile, [System.Text.Encoding]::UTF8)
if ([string]::IsNullOrWhiteSpace($words) -or $words.Length -gt 600) {
    throw "Text-to-speech input is outside the supported limits."
}
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    # Windows built-in SAPI voice; no browser/cloud provider or speaker playback on server.
    $voice.SetOutputToWaveFile($OutputFile)
    $voice.Speak($words)
} finally {
    $voice.Dispose()
}
