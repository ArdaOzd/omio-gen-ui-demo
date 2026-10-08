#!/bin/bash

set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

API_PORT="${API_PORT:-8000}"
AGENT_PORT="${AGENT_PORT:-8010}"
WEB_PORT="${WEB_PORT:-5173}"
export API_PORT AGENT_PORT WEB_PORT
APP_URL="http://127.0.0.1:${WEB_PORT}/"

server_pid=""
opener_pid=""
interrupted=0

pause_for_error() {
  if [[ -t 0 ]]; then
    printf '\nPress Return to close this window.'
    read -r _
  fi
}

fail() {
  printf '\nCould not start the Omio demo: %s\n' "$1" >&2
  pause_for_error
  exit 1
}

descendants_of() {
  local parent="$1" child
  for child in $(/usr/bin/pgrep -P "$parent" 2>/dev/null); do
    descendants_of "$child"
  done
  printf '%s\n' "$parent"
}

stop_server() {
  local process_ids
  [[ -n "$server_pid" ]] || return
  if kill -0 "$server_pid" 2>/dev/null; then
    process_ids="$(descendants_of "$server_pid")"
    kill -TERM $process_ids 2>/dev/null || true
  fi
}

cleanup() {
  if [[ -n "$opener_pid" ]]; then
    kill "$opener_pid" 2>/dev/null || true
  fi
  stop_server
}

handle_signal() {
  interrupted=1
  stop_server
}

health_matches() {
  local url="$1" service="$2" response
  response="$(/usr/bin/curl --fail --silent --max-time 1 "$url" 2>/dev/null)" || return 1
  printf '%s' "$response" | /usr/bin/grep -Eq "\"service\"[[:space:]]*:[[:space:]]*\"${service}\""
}

fare_api_is_current() {
  local response
  response="$(/usr/bin/curl --fail --silent --max-time 1 "${APP_URL}api/health" 2>/dev/null)" || return 1
  printf '%s' "$response" | /usr/bin/grep -Eq '"service"[[:space:]]*:[[:space:]]*"omio-fare-api"' &&
    printf '%s' "$response" | /usr/bin/grep -Eq '"fare_count"[[:space:]]*:[[:space:]]*50000000' &&
    printf '%s' "$response" | /usr/bin/grep -Eq '"generator_version"[[:space:]]*:[[:space:]]*4' &&
    printf '%s' "$response" | /usr/bin/grep -Eq '"schema_version"[[:space:]]*:[[:space:]]*3' &&
    printf '%s' "$response" | /usr/bin/grep -Eq '"coverage_model"[[:space:]]*:[[:space:]]*"all_ordered_pairs_daily"'
}

demo_is_ready() {
  /usr/bin/curl --fail --silent --max-time 1 "$APP_URL" >/dev/null 2>&1 &&
    fare_api_is_current &&
    health_matches "${APP_URL}api/agent/health" "omio-generative-agent"
}

port_is_busy() {
  /usr/sbin/lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

trap cleanup EXIT
trap handle_signal INT TERM HUP

cd "$PROJECT_DIR" || fail "the project folder is unavailable."

for port in "$API_PORT" "$AGENT_PORT" "$WEB_PORT"; do
  [[ "$port" =~ ^[0-9]+$ ]] && ((port >= 1024 && port <= 65535)) || fail "ports must be integers between 1024 and 65535."
done

if demo_is_ready; then
  printf 'The Omio demo is already running. Opening %s\n' "$APP_URL"
  /usr/bin/open "$APP_URL" || fail "open ${APP_URL} in a browser."
  exit 0
fi

busy_ports=""
for port in "$API_PORT" "$AGENT_PORT" "$WEB_PORT"; do
  if port_is_busy "$port"; then
    busy_ports="${busy_ports} ${port}"
  fi
done
if [[ -n "$busy_ports" ]]; then
  /usr/sbin/lsof -nP -iTCP:"$API_PORT" -iTCP:"$AGENT_PORT" -iTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null || true
  fail "port(s)${busy_ports} are already in use by something other than a complete Omio demo."
fi

for command in node npm python3; do
  command -v "$command" >/dev/null 2>&1 || fail "${command} is not installed or could not be found."
done

printf 'Checking project packages...\n'
npm install || fail "npm install failed."

printf 'Starting the Omio demo...\n'
printf 'Keep this window open. Press Control-C here to stop the demo.\n\n'
npm run dev &
server_pid=$!

(
  while kill -0 "$server_pid" 2>/dev/null; do
    if demo_is_ready; then
      printf '\nOmio is ready at %s\n' "$APP_URL"
      /usr/bin/open "$APP_URL" || printf 'Open %s in your browser.\n' "$APP_URL" >&2
      exit 0
    fi
    sleep 0.25
  done
) &
opener_pid=$!

wait "$server_pid"
status=$?
server_pid=""

if [[ "$interrupted" -eq 1 || "$status" -eq 130 || "$status" -eq 143 ]]; then
  printf '\nOmio demo stopped.\n'
  exit 0
fi

fail "the development server exited with status ${status}."
