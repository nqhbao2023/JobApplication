# ============================================================
# setup-task.ps1 - Setup Windows Task Scheduler for Auto Crawler
# ============================================================
#
# Description:
#   Creates a scheduled task to run the crawler weekly (every Sunday at 6AM)
#
# Usage:
#   .\setup-task.ps1              # Create task (default: Sunday 6AM)
#   .\setup-task.ps1 -Remove      # Remove the task
#   .\setup-task.ps1 -DayOfWeek MON -Time "08:00"  # Custom schedule
#
# Requires: Administrator privileges
# ============================================================

param(
    [switch]$Remove,
    [string]$DayOfWeek = "SUN",  # SUN, MON, TUE, WED, THU, FRI, SAT
    [string]$Time = "06:00",
    [string]$TaskName = "Job4S_AutoCrawler"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script requires Administrator privileges!" -ForegroundColor Yellow
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Right-click PowerShell -> 'Run as Administrator'" -ForegroundColor Cyan
    exit 1
}

# Get script paths
$ScriptRoot = $PSScriptRoot
if (-not $ScriptRoot) {
    $ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
}

$AutoCrawlScript = Join-Path $ScriptRoot "auto-crawl.ps1"

# Validate auto-crawl.ps1 exists
if (-not (Test-Path $AutoCrawlScript)) {
    Write-Host "❌ auto-crawl.ps1 not found at: $AutoCrawlScript" -ForegroundColor Red
    exit 1
}

# Remove task
if ($Remove) {
    Write-Host "🗑️  Removing scheduled task: $TaskName" -ForegroundColor Yellow
    
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "✅ Task removed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "ℹ️  Task not found." -ForegroundColor Cyan
    }
    exit 0
}

# Create task
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Job4S Auto Crawler - Task Scheduler Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Task Name:    $TaskName" -ForegroundColor White
Write-Host "Schedule:     Weekly on $DayOfWeek at $Time" -ForegroundColor White
Write-Host "Script:       $AutoCrawlScript" -ForegroundColor White
Write-Host ""

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "⚠️  Task already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Build the action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AutoCrawlScript`"" `
    -WorkingDirectory $ScriptRoot

# Build the trigger (weekly)
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At $Time

# Build settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -WakeToRun:$false `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10)

# Create the task
try {
    $task = Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "Automatically crawl jobs from viecoi.vn weekly with hybrid AI categorization" `
        -RunLevel Highest

    Write-Host ""
    Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Task Details:" -ForegroundColor Cyan
    Write-Host "   - Name: $TaskName"
    Write-Host "   - Schedule: Every $DayOfWeek at $Time"
    Write-Host "   - Next Run: $($task.Triggers[0].StartBoundary)"
    Write-Host ""
    Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
    Write-Host "   - View task:    Get-ScheduledTask -TaskName '$TaskName'"
    Write-Host "   - Run now:      Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host "   - Disable:      Disable-ScheduledTask -TaskName '$TaskName'"
    Write-Host "   - Remove:       .\setup-task.ps1 -Remove"
    Write-Host ""
    Write-Host "📂 Open Task Scheduler GUI: taskschd.msc" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host "❌ Failed to create task: $_" -ForegroundColor Red
    exit 1
}

Write-Host "============================================================" -ForegroundColor Cyan
