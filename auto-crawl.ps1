# ============================================================
# auto-crawl.ps1 - Automated Job Crawler with Hybrid AI Categorization
# ============================================================
# 
# Description:
#   PowerShell script to run the full crawler pipeline automatically.
#   Includes error handling, logging, and optional email notifications.
#
# Usage:
#   .\auto-crawl.ps1                  # Run with default settings
#   .\auto-crawl.ps1 -Limit 100       # Crawl 100 jobs
#   .\auto-crawl.ps1 -SkipCrawl       # Skip crawl, just process existing data
#   .\auto-crawl.ps1 -SendEmail       # Send email notification on completion
#
# Schedule with Task Scheduler (Weekly - every Sunday at 6AM):
#   schtasks /create /tn "JobCrawler" /tr "powershell -ExecutionPolicy Bypass -File C:\path\to\auto-crawl.ps1" /sc weekly /d SUN /st 06:00
#
# ============================================================

param(
    [int]$Limit = 50,
    [switch]$SkipCrawl,
    [switch]$SendEmail,
    [string]$EmailTo = "",
    [switch]$Verbose
)

# ============ CONFIGURATION ============
$ScriptRoot = $PSScriptRoot
if (-not $ScriptRoot) {
    $ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
}

# Project root is the folder that contains this script (JobApplication root)
$ProjectRoot = $ScriptRoot
$ServerRoot = Join-Path $ProjectRoot "server"
$LogDir = Join-Path $ServerRoot "data\logs"
$LogFile = Join-Path $LogDir "auto-crawl.log"

# Ensure log directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# ============ LOGGING FUNCTIONS ============
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Write to log file
    Add-Content -Path $LogFile -Value $logEntry -Encoding UTF8
    
    # Write to console with color
    switch ($Level) {
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "WARN"  { Write-Host $logEntry -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
        default { Write-Host $logEntry }
    }
}

function Write-Banner {
    param([string]$Title)
    $line = "=" * 60
    Write-Log $line
    Write-Log $Title
    Write-Log $line
}

# ============ EMAIL NOTIFICATION ============
function Send-Notification {
    param(
        [string]$Subject,
        [string]$Body,
        [bool]$IsError = $false
    )
    
    if (-not $SendEmail -or -not $EmailTo) {
        return
    }
    
    try {
        # Gmail SMTP configuration (you can change to your SMTP server)
        $smtpServer = "smtp.gmail.com"
        $smtpPort = 587
        $smtpUser = $env:SMTP_USER
        $smtpPass = $env:SMTP_PASS
        
        if (-not $smtpUser -or -not $smtpPass) {
            Write-Log "Email credentials not configured. Set SMTP_USER and SMTP_PASS environment variables." "WARN"
            return
        }
        
        $securePass = ConvertTo-SecureString $smtpPass -AsPlainText -Force
        $credential = New-Object System.Management.Automation.PSCredential($smtpUser, $securePass)
        
        $mailParams = @{
            From = $smtpUser
            To = $EmailTo
            Subject = $Subject
            Body = $Body
            SmtpServer = $smtpServer
            Port = $smtpPort
            UseSsl = $true
            Credential = $credential
        }
        
        Send-MailMessage @mailParams
        Write-Log "Email notification sent to $EmailTo" "SUCCESS"
    }
    catch {
        Write-Log "Failed to send email: $_" "WARN"
    }
}

# ============ ENVIRONMENT CHECK ============
function Test-Environment {
    Write-Log "Checking environment..."
    
    # Check Node.js
    $nodeVersion = & node --version 2>$null
    if (-not $nodeVersion) {
        Write-Log "Node.js not found. Please install Node.js." "ERROR"
        return $false
    }
    Write-Log "Node.js version: $nodeVersion"
    
    # Check npm
    $npmVersion = & npm --version 2>$null
    if (-not $npmVersion) {
        Write-Log "npm not found." "ERROR"
        return $false
    }
    Write-Log "npm version: $npmVersion"
    
    # Check if server directory exists
    if (-not (Test-Path $ServerRoot)) {
        Write-Log "Server directory not found: $ServerRoot" "ERROR"
        return $false
    }
    
    # Check if node_modules exists
    $nodeModules = Join-Path $ServerRoot "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Log "node_modules not found. Running npm install..."
        Push-Location $ServerRoot
        & npm install
        Pop-Location
    }
    
    # Check .env file
    $envFile = Join-Path $ServerRoot ".env"
    if (-not (Test-Path $envFile)) {
        Write-Log ".env file not found. Checking env.example..." "WARN"
        $envExample = Join-Path $ServerRoot "env.example"
        if (Test-Path $envExample) {
            Write-Log "Please create .env file from env.example" "WARN"
        }
    }
    
    return $true
}

# ============ MAIN PIPELINE ============
function Start-CrawlPipeline {
    $startTime = Get-Date
    $success = $false
    $errorMessage = ""
    $stats = @{
        TotalJobs = 0
        RegexHandled = 0
        AIHandled = 0
        Duration = 0
    }
    
    try {
        Write-Banner "Starting Auto Crawl Pipeline"
        Write-Log "Limit: $Limit, SkipCrawl: $SkipCrawl"
        Write-Log "Project Root: $ProjectRoot"
        Write-Log "Server Root: $ServerRoot"
        
        # Check environment
        if (-not (Test-Environment)) {
            throw "Environment check failed"
        }
        
        # Change to server directory
        Push-Location $ServerRoot
        
        # Build command arguments
        $cmdArgs = @()
        $cmdArgs += "--limit"
        $cmdArgs += $Limit.ToString()
        
        if ($SkipCrawl) {
            $cmdArgs += "--skip-crawl"
        }
        
        Write-Log "Running pipeline command..."
        $argString = $cmdArgs -join " "
        Write-Log "Command: npx ts-node src/crawlers/viecoi/puppeteer-full-pipeline.ts $argString"
        
        # Run the pipeline
        $pipelineScript = Join-Path $ServerRoot "src\crawlers\viecoi\puppeteer-full-pipeline.ts"

        # Prefer local ts-node executable from node_modules for stability on Windows
        $localTsNode = Join-Path $ServerRoot "node_modules\.bin\ts-node.cmd"
        $output = @()

        if (Test-Path $localTsNode) {
            if ($Verbose) {
                & $localTsNode $pipelineScript @cmdArgs
            }
            else {
                $output = & $localTsNode $pipelineScript @cmdArgs 2>&1
            }
        }
        else {
            if ($Verbose) {
                & npx --yes ts-node --transpile-only $pipelineScript @cmdArgs
            }
            else {
                $output = & npx --yes ts-node --transpile-only $pipelineScript @cmdArgs 2>&1
            }
        }

        # Parse output for stats (when running non-verbose)
        if ($output -and $output.Count -gt 0) {
            foreach ($line in $output) {
                Write-Log $line

                if ($line -match "Total jobs:\s*(\d+)") {
                    $stats.TotalJobs = [int]$Matches[1]
                }
                if ($line -match "Regex handled:\s*(\d+)") {
                    $stats.RegexHandled = [int]$Matches[1]
                }
                if ($line -match "AI handled:\s*(\d+)") {
                    $stats.AIHandled = [int]$Matches[1]
                }
            }
        }
        
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Log "Pipeline completed successfully!" "SUCCESS"
        }
        else {
            throw "Pipeline exited with code $LASTEXITCODE"
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Log "Pipeline failed: $errorMessage" "ERROR"
        $success = $false
    }
    finally {
        Pop-Location -ErrorAction SilentlyContinue
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        $stats.Duration = [math]::Round($duration.TotalSeconds, 2)
        
        Write-Log "Duration: $($stats.Duration) seconds"
    }
    
    # Return results
    return @{
        Success = $success
        Error = $errorMessage
        Stats = $stats
        StartTime = $startTime
        EndTime = Get-Date
    }
}

# ============ CLEANUP OLD LOGS ============
function Clear-OldLogs {
    param([int]$DaysToKeep = 7)
    
    Write-Log "Cleaning up logs older than $DaysToKeep days..."
    
    $cutoffDate = (Get-Date).AddDays(-$DaysToKeep)
    $logFiles = Get-ChildItem -Path $LogDir -Filter "*.log" -ErrorAction SilentlyContinue
    
    foreach ($file in $logFiles) {
        if ($file.LastWriteTime -lt $cutoffDate) {
            Remove-Item $file.FullName -Force
            Write-Log "Deleted old log: $($file.Name)"
        }
    }
}

# ============ ENTRY POINT ============
function Main {
    Write-Banner "Job4S Auto Crawler - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    # Cleanup old logs
    Clear-OldLogs -DaysToKeep 7
    
    # Run pipeline
    $result = Start-CrawlPipeline
    
    # Generate summary
    $summary = @"
Job4S Auto Crawler Report
========================
Date: $($result.StartTime.ToString('yyyy-MM-dd HH:mm:ss'))
Status: $(if ($result.Success) { 'SUCCESS' } else { 'FAILED' })
Duration: $($result.Stats.Duration) seconds

Statistics:
- Total Jobs: $($result.Stats.TotalJobs)
- Regex Categorized: $($result.Stats.RegexHandled)
- AI Categorized: $($result.Stats.AIHandled)

$(if (-not $result.Success) { "Error: $($result.Error)" })
"@
    
    Write-Log $summary
    
    # Send email notification
    if ($SendEmail) {
        $emailSubject = if ($result.Success) {
            "[Job4S] Crawler completed - $($result.Stats.TotalJobs) jobs"
        }
        else {
            "[Job4S] Crawler FAILED"
        }
        
        Send-Notification -Subject $emailSubject -Body $summary -IsError (-not $result.Success)
    }
    
    Write-Banner "Auto Crawler Finished"
    
    # Exit with appropriate code
    if ($result.Success) {
        exit 0
    }
    else {
        exit 1
    }
}

# Run main
Main
