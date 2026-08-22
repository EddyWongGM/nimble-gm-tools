<#
.SYNOPSIS
    Builds and starts Improved Initiative for local table use, and opens it in the browser, with
    a visible PowerShell window. Right-click this file and choose "Run with PowerShell" to use it
    directly. For a version with no visible window, see Start-ImprovedInitiative-Hidden.ps1.
.PARAMETER Dev
    Run the live-reload development workflow (npm run dev) instead of a production build + start.
    Use this while prepping content; prefer the default production mode during an actual session.
.PARAMETER Hidden
    Run with no visible PowerShell window instead. Right-click > "Run with PowerShell" always opens
    a visible window first; passing this relaunches the real work in a second, hidden process and
    closes the visible one. Since there's no console for Ctrl+C, stop the app from its Settings
    menu ("Shut down this server") instead. Output that would normally print to the console is
    logged to .\data\start.log so you can still diagnose a failed install/build. Right-clicking
    Start-ImprovedInitiative-Hidden.ps1 does this for you without needing this switch.
.PARAMETER Relaunched
    Internal use only - marks the hidden child process so it doesn't relaunch itself again.
#>

param(
    [switch]$Dev,
    [switch]$Hidden,
    [switch]$Relaunched
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if ($Hidden -and -not $Relaunched) {
    $logDir = Join-Path $repoRoot "data"
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $logPath = Join-Path $logDir "start.log"

    $relaunchArgs = @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
        "-File", "`"$PSCommandPath`"", "-Relaunched"
    )
    if ($Dev) { $relaunchArgs += "-Dev" }

    Write-Host "Relaunching hidden. Output is logged to $logPath" -ForegroundColor Cyan
    Write-Host "Stop the app from its Settings menu (Shut down this server), not by closing this window." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" -ArgumentList $relaunchArgs -WindowStyle Hidden
    exit
}

if ($Relaunched) {
    $logPath = Join-Path $repoRoot "data\start.log"
    New-Item -ItemType Directory -Force -Path (Split-Path $logPath) | Out-Null
    Start-Transcript -Path $logPath -Append | Out-Null
}

if (-not (Test-Path (Join-Path $repoRoot "node_modules"))) {
    Write-Host "node_modules not found, running npm install..." -ForegroundColor Cyan
    npm install
    if (-not $?) {
        Write-Error "npm install failed."
        exit 1
    }
}

# Load .env into the process environment so it reaches every child process
# (nodemon/node do not read .env on their own). Real environment variables
# already set take precedence over .env.
$envFilePath = Join-Path $repoRoot ".env"
if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -match "^\s*([^=\s]+)\s*=\s*(.*)$") {
            $key = $matches[1]
            $value = $matches[2].Trim()
            if (-not (Test-Path "Env:$key")) {
                Set-Item -Path "Env:$key" -Value $value
            }
        }
    }
}

if ($Dev) {
    if (-not $env:BASE_URL) { $env:BASE_URL = "http://localhost:3000" }
    $baseUrl = $env:BASE_URL
} else {
    if (-not $env:PORT) { $env:PORT = "3001" }
    # Force these rather than respecting an inherited .env value (e.g. left
    # over from the dev workflow, which sets NODE_ENV=development and
    # BASE_URL=http://localhost:3000) - production mode should always mean
    # production mode regardless of what .env happens to say.
    $env:NODE_ENV = "production"
    # The app also redirects the browser to BASE_URL as its "canonical" URL
    # (normally used to migrate users after a real domain change) - a
    # BASE_URL pointing anywhere other than where this instance is actually
    # serving from sends visitors into a redirect loop to a dead address.
    $env:BASE_URL = "http://localhost:$($env:PORT)"
    $baseUrl = $env:BASE_URL
}

if (-not $env:ALLOW_SERVER_SHUTDOWN) { $env:ALLOW_SERVER_SHUTDOWN = "true" }
if (-not $env:ALLOW_SERVER_REBUILD) { $env:ALLOW_SERVER_REBUILD = "true" }

if ($env:DB_CONNECTION_STRING) {
    Write-Host "Using external database from DB_CONNECTION_STRING." -ForegroundColor Cyan
} else {
    Write-Host "Using local database in .\data\db (copy this folder along with the project to bring your data to another device)." -ForegroundColor Cyan
}

# The server binds all interfaces by default, so it's already reachable from
# other devices on the network (e.g. a tablet running the player view) as
# long as Windows Firewall allows it.
$lanAddresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -ExpandProperty IPAddress -Unique

if ($lanAddresses -and -not $Dev) {
    $port = $env:PORT
    Write-Host "For other devices on your network (tablet, phone), try one of:" -ForegroundColor Cyan
    foreach ($ip in $lanAddresses) {
        Write-Host "  http://${ip}:$port" -ForegroundColor Cyan
    }
    Write-Host "If they can't connect, allow the port through Windows Firewall (run as Administrator):" -ForegroundColor Yellow
    Write-Host "  New-NetFirewallRule -DisplayName 'Improved Initiative' -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Private" -ForegroundColor Yellow
}

if (-not $Dev) {
    Write-Host "Building Improved Initiative for production (npm run build)..." -ForegroundColor Cyan
    npm run build
    if (-not $?) {
        Write-Error "Build failed."
        exit 1
    }
}

# Open the browser once the server responds, without blocking the server process.
Start-Job -ScriptBlock {
    param($url)
    for ($i = 0; $i -lt 60; $i++) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
            Start-Process $url
            return
        } catch {
            Start-Sleep -Seconds 2
        }
    }
} -ArgumentList $baseUrl | Out-Null

if ($Dev) {
    Write-Host "Starting Improved Initiative in dev mode (npm run dev)..." -ForegroundColor Cyan
    Write-Host "It will be available at $baseUrl" -ForegroundColor Cyan
    npm run dev
} else {
    Write-Host "Starting Improved Initiative (npm start)..." -ForegroundColor Cyan
    Write-Host "It will be available at $baseUrl" -ForegroundColor Cyan
    npm start
}
