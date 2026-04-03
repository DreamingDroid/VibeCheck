#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
WEB_DIR="$ROOT_DIR/web"
LOG_DIR="$ROOT_DIR/logs"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# --- Helper: Terminal Management ---
open_in_terminal() {
    local title="$1"
    local workdir="$2"
    local command="$3"

    # Modernized terminal flags (using -- to separate terminal options from command)
    if command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal --title="$title" --working-directory="$workdir" -- bash -lc "$command; exec bash"
    elif command -v konsole >/dev/null 2>&1; then
        konsole --new-tab -p tabtitle="$title" --workdir "$workdir" -e bash -lc "$command; exec bash"
    elif command -v xfce4-terminal >/dev/null 2>&1; then
        xfce4-terminal --title="$title" --working-directory="$workdir" --hold -e "bash -lc '$command'"
    elif command -v x-terminal-emulator >/dev/null 2>&1; then
        x-terminal-emulator -T "$title" -e bash -lc "cd \"$workdir\" && $command; exec bash"
    else
        return 1
    fi
}

echo "----------------------------------------------------------"
echo "🚀 Starting VibeCheck Development Environment..."
echo "----------------------------------------------------------"

# --- Step 1: Docker Lifecycle Management (Fixed) ---
if ! docker info >/dev/null 2>&1; then
    echo "[INFO] Docker is not running. Attempting to start the daemon..."
    
    if command -v systemctl >/dev/null 2>&1; then
        echo "[INFO] Reloading systemd units and starting Docker..."
        sudo systemctl daemon-reload
        sudo systemctl start docker
        
        echo -n "[WAIT] Waiting for Docker to be ready"
        MAX_RETRIES=30
        COUNTER=0
        while ! docker info >/dev/null 2>&1; do
            echo -n "."
            sleep 1
            # Safer increment to avoid exit code 1 when COUNTER is 0
            COUNTER=$((COUNTER + 1)) 
            
            if [ "$COUNTER" -ge "$MAX_RETRIES" ]; then
                echo -e "\n[ERROR] Docker failed to start within $MAX_RETRIES seconds."
                exit 1
            fi
        done
        echo -e "\n[OK] Docker is now active."
    else
        echo "[ERROR] 'systemctl' not found. Please start Docker manually."
        exit 1
    fi
else
    echo "[OK] Docker is already running."
fi

# --- Step 2: Docker Compose Orchestration ---
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
else
    echo "[ERROR] Neither 'docker-compose' nor 'docker compose' is available."
    exit 1
fi

COMPOSE_SERVICES=(db appsmith)
if ss -ltn '( sport = :11434 )' 2>/dev/null | grep -q ':11434'; then
    echo "[INFO] Port 11434 is already in use. Reusing the existing host Ollama service."
else
    COMPOSE_SERVICES+=(ollama)
fi

echo "[OK] Starting infrastructure services: ${COMPOSE_SERVICES[*]}"
"${COMPOSE_CMD[@]}" up -d "${COMPOSE_SERVICES[@]}"

# --- Step 3: Application Services ---
echo "Starting VibeCheck App Components..."

server_started=false
if open_in_terminal "VibeCheck Server" "$SERVER_DIR" "npm run dev"; then
    server_started=true
    echo "[OK] Backend terminal opened."
fi

web_started=false
if open_in_terminal "VibeCheck Web" "$WEB_DIR" "npm run dev"; then
    web_started=true
    echo "[OK] Web app terminal opened."
fi

# --- Fallback: Headless/No-GUI mode ---
if ! $server_started || ! $web_started; then
    echo "[WARN] No supported GUI terminal found. Falling back to background processes..."
    
    if ! $server_started; then
        nohup bash -lc "cd \"$SERVER_DIR\" && npm run dev" > "$LOG_DIR/server.log" 2>&1 &
        echo "[INFO] Backend started in background. Logs: $LOG_DIR/server.log"
    fi

    if ! $web_started; then
        nohup bash -lc "cd \"$WEB_DIR\" && npm run dev" > "$LOG_DIR/web.log" 2>&1 &
        echo "[INFO] Web app started in background. Logs: $LOG_DIR/web.log"
    fi
fi

# --- Suggested Edit ---
ls /var/log

echo "----------------------------------------------------------"
echo "✅ Setup Complete! Your Blackwell workstation is ready."
echo "----------------------------------------------------------"