<# 
  start.ps1 — PlantBot Startup Script
#>

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

# Ensure UTF-8 output and execution environment
$env:PYTHONUTF8 = "1"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8


# ─── Environment Check ──────────────────────────────────────
Write-Host "Checking environment..." -ForegroundColor Cyan

$venvActivate = Join-Path $projectRoot ".venv\Scripts\Activate.ps1"
if (-not (Test-Path $venvActivate)) {
    Write-Host "Error: .venv not found. Please run: uv venv && uv pip install -r requirements.txt" -ForegroundColor Red
    exit 1
}

# ─── Process Cleanup Function ───────────────────────────────
$processes = @()
function Stop-PlantBot {
    Write-Host "`nStopping system..." -ForegroundColor Yellow
    foreach ($proc in $processes) {
        if (-not $proc.HasExited) {
            # Force kill the process tree to ensure child processes are terminated
            taskkill /F /T /PID $proc.Id | Out-Null
        }
    }
    exit
}

# Trap Ctrl+C (SIGINT)
trap { Stop-PlantBot }

# ─── Start Backend ──────────────────────────────────────────
Write-Host "Starting Backend (FastAPI)..." -ForegroundColor Cyan
# Execute within the venv context
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
$backendProc = Start-Process $pythonExe -ArgumentList "main.py" -WorkingDirectory $projectRoot -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $projectRoot "backend.log") -RedirectStandardError (Join-Path $projectRoot "backend.err")
$processes += $backendProc

# Chờ Backend khởi động và kết nối Serial hoàn tất (tránh lỗi ECONNREFUSED tạm thời ở Frontend)
Start-Sleep -Seconds 3

# ─── Start Frontend ─────────────────────────────────────────
Write-Host "Starting Frontend (Vite)..." -ForegroundColor Cyan
$frontendProc = Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command npm.cmd run dev -- --host 0.0.0.0" -WorkingDirectory (Join-Path $projectRoot "frontend") -PassThru -NoNewWindow
$processes += $frontendProc

# ─── Completion Message ─────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " PlantBot is ready!" -ForegroundColor Green
Write-Host " Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host " API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host " [Press Ctrl+C to stop]" -ForegroundColor DarkGray
Write-Host "================================================" -ForegroundColor Green

# ─── Monitoring Loop ────────────────────────────────────────
try {
    while ($true) {
        Start-Sleep -Seconds 1
        foreach ($proc in $processes) {
            if ($proc.HasExited) {
                # Try to get process name safely
                $pName = "Unknown"
                try { $pName = $proc.ProcessName } catch {}
                Write-Host "`nWarning: Process $pName (ID: $($proc.Id)) stopped unexpectedly!" -ForegroundColor Red
                Stop-PlantBot
            }
        }
    }
} finally {
    Stop-PlantBot
}