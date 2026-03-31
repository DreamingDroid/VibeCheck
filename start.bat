@echo off
echo Starting VibeCheck Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running.
    echo Please start Docker Desktop first, wait for it to be ready, and then run this script again.
    pause
    exit /b 1
)

echo [OK] Docker is running. Starting Docker services (PostgreSQL, PgVector, etc.)...
docker-compose up -d

echo.
echo Starting the Node Backend Server...
start "VibeCheck Server" cmd /k "cd server && npm run dev"

echo.
echo Starting the Web Application...
start "VibeCheck Web" cmd /k "cd web && npm run dev"

echo.
echo [SUCCESS] All services have been started!
echo The Server and Web applications are running in their own separate terminal windows.
echo.
pause
