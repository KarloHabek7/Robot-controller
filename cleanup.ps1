# Cleanup and Restart Script for Robot Controller
# Run this to kill all processes and start fresh

Write-Host "=== Robot Controller Cleanup ===" -ForegroundColor Cyan

# Step 1: Kill all related processes
Write-Host "`n[1/5] Stopping all Python and Node processes..." -ForegroundColor Yellow
Get-Process python*,node*,uvicorn* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 2: Verify cleanup
Write-Host "`n[2/5] Verifying processes stopped..." -ForegroundColor Yellow
$remainingProcesses = Get-Process python*,node* -ErrorAction SilentlyContinue
if ($remainingProcesses) {
    Write-Host "Warning: Some processes still running:" -ForegroundColor Red
    $remainingProcesses | Format-Table Id, ProcessName
} else {
    Write-Host "All processes stopped successfully" -ForegroundColor Green
}

# Step 3: Check port availability
Write-Host "`n[3/5] Checking port availability..." -ForegroundColor Yellow
$ports = @("8000", "8080")
foreach ($port in $ports) {
    $listener = netstat -ano | Select-String ":$port " | Select-String "LISTENING"
    if ($listener) {
        Write-Host "Port $port still in use" -ForegroundColor Red
    } else {
        Write-Host "Port $port available" -ForegroundColor Green
    }
}

# Step 4: Optional - Clean database (uncomment if needed)
Write-Host "`n[4/5] Database cleanup (optional)..." -ForegroundColor Yellow
# Uncomment the next 3 lines if you want to reset the database
# Remove-Item database.db -Force -ErrorAction SilentlyContinue
# Remove-Item database.db-shm -Force -ErrorAction SilentlyContinue
# Remove-Item database.db-wal -Force -ErrorAction SilentlyContinue
Write-Host "Database kept (to reset, uncomment lines in script)" -ForegroundColor Green

# Step 5: Ready to restart
Write-Host "`n[5/5] Ready to restart!" -ForegroundColor Yellow
Write-Host "`nCleanup complete. You can now run:" -ForegroundColor Cyan
Write-Host "  python run.py" -ForegroundColor White
Write-Host "`nPress Enter to exit..."
Read-Host
