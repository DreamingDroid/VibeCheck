# VibeCheck Start-up Script
Write-Host "Starting VibeCheck Development Environment..." -ForegroundColor Cyan

# 1. Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker is not running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop first, wait for it to be ready, and then run this script again." -ForegroundColor Red
    Read-Host -Prompt "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Docker is running. Starting Docker services (PostgreSQL, PgVector, etc.)..." -ForegroundColor Green
docker-compose up -d

Write-Host "`nStarting the Node Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Title `"VibeCheck Server`" -Command `"cd server; npm run dev`""

Write-Host "`nStarting the Web Application..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Title `"VibeCheck Web`" -Command `"cd web; npm run dev`""

Write-Host "`n[SUCCESS] All services have been started!" -ForegroundColor Green
Write-Host "The Server and Web applications are running in their own separate terminal windows." -ForegroundColor Green
Write-Host ""
Read-Host -Prompt "Press Enter to exit this script"
