#!/usr/bin/env bash

# VibeCheck Development Environment Starter (Lighthouse Edition)
# This script runs everything in a single terminal session.

# --- Configuration ---
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
WEB_DIR="$ROOT_DIR/web"
LOG_DIR="$ROOT_DIR/logs"

mkdir -p "$LOG_DIR"

echo "----------------------------------------------------------"
echo "🚀 Starting VibeCheck Environment..."
echo "----------------------------------------------------------"

# 1. Check Docker
if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker is not running. Please start Docker first."
    exit 1
fi

# 2. Start Infrastructure
echo "[OK] Starting DB and Ollama via Docker Compose..."
if command -v docker-compose >/dev/null 2>&1; then
    docker-compose up -d db ollama appsmith
elif docker compose version >/dev/null 2>&1; then
    docker compose up -d db ollama appsmith
else
    echo "[ERROR] Neither 'docker-compose' nor 'docker compose' is installed."
    exit 1
fi

# 3. Handle process cleanup on exit
cleanup() {
    echo -e "\n[INFO] Stopping development servers..."
    kill $SERVER_PID $WEB_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# 4. Start Server
echo "[OK] Starting Backend Server..."
cd "$SERVER_DIR" && npm run dev > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!

# 5. Start Frontend
echo "[OK] Starting Web Frontend..."
cd "$WEB_DIR" && npm run dev > "$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!

echo "----------------------------------------------------------"
echo "✅ VibeCheck is booting up!"
echo "📡 Server: http://localhost:4000"
echo "🌐 Web:    http://localhost:3500"
echo "----------------------------------------------------------"
echo "📝 Logs are being written to $LOG_DIR"
echo "💡 Press Ctrl+C to stop all services."
echo "----------------------------------------------------------"

# Keep the script alive to monitor background processes
wait
