<#
.SYNOPSIS
    Checks whether an Improved Initiative server from this repo is still running
    in the background - typically a hidden session started by
    Start-ImprovedInitiative-Hidden.ps1 that was never stopped from its Settings
    menu ("Shut down this server"), since a hidden run has no console window or
    taskbar entry to remind you it's still there.
.PARAMETER Stop
    If a session is found, shut it down gracefully without prompting, by
    POSTing to its own /shutdown endpoint using the per-process token
    embedded in the tracker page - the same mechanism the app's "Shut down
    this server" Settings button uses. Only works if that instance was
    started with ALLOW_SERVER_SHUTDOWN=true (the default for both
    Start-ImprovedInitiative scripts). Without -Stop, this script still
    offers to shut it down - it just asks first (y/N) instead of doing so
    automatically, so it's safe to run unattended in a script or task.
.EXAMPLE
    .\Test-ImprovedInitiative-Session.ps1
    Reports any leftover session and, if one is found, asks before stopping it.
.EXAMPLE
    .\Test-ImprovedInitiative-Session.ps1 -Stop
    Reports and gracefully shuts down any leftover session found, no prompt.
#>

param(
    [switch]$Stop
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

# Load .env the same way Start-ImprovedInitiative-Console.ps1 does, so the
# port(s) checked here match what a real launch would actually use. Real
# environment variables already set take precedence, same as that script.
$envFileValues = @{}
$envFilePath = Join-Path $repoRoot ".env"
if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -match "^\s*([^=\s]+)\s*=\s*(.*)$") {
            $envFileValues[$matches[1]] = $matches[2].Trim()
        }
    }
}

function Resolve-EnvValue {
    param([string]$Key, [string]$Default)
    $fromProcess = [Environment]::GetEnvironmentVariable($Key)
    if ($fromProcess) { return $fromProcess }
    if ($envFileValues.ContainsKey($Key)) { return $envFileValues[$Key] }
    return $Default
}

# The production launch (Start-ImprovedInitiative-Console.ps1, no -Dev) always
# serves directly on PORT. The dev workflow (-Dev) additionally fronts that
# same server with a browser-sync proxy on BASE_URL's port - check both, since
# either could be the one left running hidden.
$serverPort = [int](Resolve-EnvValue "PORT" "3001")
$baseUrl = Resolve-EnvValue "BASE_URL" "http://localhost:3000"
$devProxyPort = $serverPort
try { $devProxyPort = [int]([Uri]$baseUrl).Port } catch {}

$portsToCheck = @($serverPort)
if ($devProxyPort -ne $serverPort) { $portsToCheck += $devProxyPort }

function Get-ListeningProcessInfo {
    param([int]$Port)
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { return @() }

    $results = @()
    foreach ($conn in ($conns | Sort-Object OwningProcess -Unique)) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if (-not $proc) { continue }
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $($conn.OwningProcess)" -ErrorAction SilentlyContinue
        $results += [pscustomobject]@{
            Port        = $Port
            ProcessId   = $proc.Id
            ProcessName = $proc.ProcessName
            StartTime   = $proc.StartTime
            CommandLine = $cim.CommandLine
        }
    }
    return $results
}

$found = @()
foreach ($port in $portsToCheck) {
    $found += Get-ListeningProcessInfo -Port $port
}

if (-not $found) {
    Write-Host "No leftover Improved Initiative session found (checked port(s): $($portsToCheck -join ', '))." -ForegroundColor Green
    exit 0
}

Write-Host "Found process(es) listening on Improved Initiative's port(s):" -ForegroundColor Yellow
$found | Format-Table Port, ProcessId, ProcessName, StartTime -AutoSize | Out-Host

# A listening port alone doesn't confirm it's actually this app - request the
# tracker page and look for its own markers, since anything could be bound to
# the same port. This also recovers the per-process shutdown token needed for
# -Stop, which is only ever embedded in that page (never Player View).
$confirmedUrl = $null
$shutdownToken = $null
foreach ($port in ($found.Port | Select-Object -Unique)) {
    $url = "http://localhost:$port/"
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        if ($response.Content -notmatch "Improved Initiative") { continue }

        $confirmedUrl = $url
        if ($response.Content -match 'environmentJSON="([^"]*)"') {
            $decoded = [System.Net.WebUtility]::HtmlDecode($matches[1])
            try {
                $environment = $decoded | ConvertFrom-Json
                if ($environment.CanShutdownServer) {
                    $shutdownToken = $environment.ShutdownToken
                }
            } catch {
                # Malformed/unexpected environmentJSON - leave $shutdownToken unset.
            }
        }
        break
    } catch {
        # This port didn't answer as the app (could be mid-restart, or an
        # unrelated process holding the port) - try the next candidate.
    }
}

if (-not $confirmedUrl) {
    Write-Host "The process(es) above are using Improved Initiative's port(s) but didn't answer as the app itself - check manually before assuming it's a leftover session." -ForegroundColor Yellow
    exit 0
}

Write-Host "Confirmed: Improved Initiative is running at $confirmedUrl" -ForegroundColor Yellow

if (-not $shutdownToken) {
    Write-Host "This instance has no shutdown capability available (not started with ALLOW_SERVER_SHUTDOWN=true) - can't stop it gracefully from here. Use its Settings menu if it has one open, or Stop-Process -Id <ProcessId> above as a last resort." -ForegroundColor Red
    exit 1
}

$shouldStop = $Stop
if (-not $shouldStop) {
    $answer = Read-Host "Stop this session gracefully? [y/N]"
    $shouldStop = $answer -match "^y(es)?$"
}

if (-not $shouldStop) {
    Write-Host "Left it running." -ForegroundColor Cyan
    exit 0
}

Write-Host "Shutting down gracefully..." -ForegroundColor Cyan
$body = @{ token = $shutdownToken } | ConvertTo-Json
Invoke-WebRequest -Uri "${confirmedUrl}shutdown" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing | Out-Null
Write-Host "Shutdown request sent." -ForegroundColor Green
