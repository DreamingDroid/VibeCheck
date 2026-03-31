@echo off
echo ======================================================
echo          INSTALLING VIBECHECK DEPENDENCIES
echo ======================================================

echo.
echo Installing Backend Dependencies...
cd server
call npm install
cd ..

echo.
echo Installing Frontend Dependencies...
cd web
call npm install
cd ..

echo.
echo ======================================================
echo    All dependencies installed successfully!
echo ======================================================
pause
