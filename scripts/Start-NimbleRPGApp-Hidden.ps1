<#
.SYNOPSIS
    Right-click this file and choose "Run with PowerShell" to launch Nimble RPG app
    with no visible window (builds/installs run in the background, logged to .\data\start.log).
    Stop the app from its Settings menu ("Shut down this server") - there's no console for Ctrl+C.
#>

& (Join-Path $PSScriptRoot "Start-NimbleRPGApp-Console.ps1") -Hidden
