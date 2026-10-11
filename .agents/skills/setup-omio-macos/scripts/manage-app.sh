#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd -P)"
cd "$repo_root"

state_dir="$repo_root/artifacts/setup"
pid_file="$state_dir/omio-dev.pid"
log_file="$state_dir/omio-dev.log"
api_port="${API_PORT:-8000}"
agent_port="${AGENT_PORT:-8010}"
web_port="${WEB_PORT:-5173}"
mkdir -p "$state_dir"

recorded_pid() { [[ -f "$pid_file" ]] && tr -dc '0-9' < "$pid_file" || true; }
is_owned() {
  local pid="$1" command process_cwd
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null || return 1
  command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [[ "$command" == *"node scripts/run.mjs dev"* ]] || return 1
  process_cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | awk 'substr($0,1,1)=="n" {print substr($0,2); exit}')"
  [[ "$process_cwd" == "$repo_root" ]]
}
healthy() {
  curl -fsS "http://127.0.0.1:$api_port/api/health" | grep -q '"service"[[:space:]]*:[[:space:]]*"omio-fare-api"' &&
  curl -fsS "http://127.0.0.1:$agent_port/api/agent/health" | grep -q '"service"[[:space:]]*:[[:space:]]*"omio-generative-agent"' &&
  curl -fsS "http://127.0.0.1:$web_port/" >/dev/null
}
port_owner() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true; }

start() {
  local pid owner deadline
  pid="$(recorded_pid)"
  if is_owned "$pid"; then
    if healthy; then
      echo "Omio is already healthy under owned PID $pid"
      echo "App: http://127.0.0.1:$web_port"
      return
    fi
    echo "Recorded owned PID $pid is unhealthy. Read $log_file or stop it before retrying." >&2
    exit 1
  fi
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then echo "Refusing to reuse foreign live PID record $pid; inspect $pid_file" >&2; exit 1; fi
  if [[ -n "$pid" ]]; then echo "Removing stale PID record $pid"; rm -f "$pid_file"; fi
  for port in "$api_port" "$agent_port" "$web_port"; do
    owner="$(port_owner "$port")"
    if [[ -n "$owner" ]]; then echo "Port $port is owned by PID $owner. Inspect it or choose unused API_PORT, AGENT_PORT, and WEB_PORT values." >&2; exit 1; fi
  done
  python3 -m backend.app --database "${OMIO_DATABASE:-data/omio.sqlite3}" --check-contract
  nohup node scripts/run.mjs dev >>"$log_file" 2>&1 &
  pid=$!
  printf '%s\n' "$pid" > "$pid_file"
  deadline=$((SECONDS + 60))
  until healthy; do
    if ! is_owned "$pid"; then echo "Omio exited during startup. Read $log_file" >&2; rm -f "$pid_file"; exit 1; fi
    if (( SECONDS >= deadline )); then echo "Omio did not become healthy in 60 seconds. Read $log_file" >&2; exit 1; fi
    sleep 1
  done
  echo "Omio is healthy under PID $pid"
  echo "App: http://127.0.0.1:$web_port"
  echo "Log: $log_file"
}

run_foreground() {
  local pid owner
  pid="$(recorded_pid)"
  if is_owned "$pid"; then
    if healthy; then
      echo "Omio is already healthy under owned PID $pid"
      echo "App: http://127.0.0.1:$web_port"
      return
    fi
    echo "Recorded owned PID $pid is unhealthy. Read its foreground terminal or stop it before retrying." >&2
    exit 1
  fi
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then echo "Refusing to reuse foreign live PID record $pid; inspect $pid_file" >&2; exit 1; fi
  if [[ -n "$pid" ]]; then echo "Removing stale PID record $pid"; rm -f "$pid_file"; fi
  for port in "$api_port" "$agent_port" "$web_port"; do
    owner="$(port_owner "$port")"
    if [[ -n "$owner" ]]; then echo "Port $port is owned by PID $owner. Inspect it or choose unused API_PORT, AGENT_PORT, and WEB_PORT values." >&2; exit 1; fi
  done
  python3 -m backend.app --database "${OMIO_DATABASE:-data/omio.sqlite3}" --check-contract
  printf '%s\n' "$$" > "$pid_file"
  echo "Running Omio in the foreground under PID $$"
  echo "Keep this terminal or executor session open. App: http://127.0.0.1:$web_port"
  exec node scripts/run.mjs dev
}

status() {
  local pid
  pid="$(recorded_pid)"
  if is_owned "$pid"; then
    if healthy; then echo "healthy: owned PID $pid, http://127.0.0.1:$web_port"; else echo "starting or unhealthy: owned PID $pid; read $log_file"; return 1; fi
  elif [[ -n "$pid" ]]; then echo "stale or foreign PID record: $pid; no process was stopped"; return 1
  else echo "stopped: no recorded setup-owned process"; return 1; fi
}

stop() {
  local pid deadline
  pid="$(recorded_pid)"
  if ! is_owned "$pid"; then echo "No owned Omio process to stop; no signal sent"; exit 1; fi
  kill -TERM "$pid"
  deadline=$((SECONDS + 10))
  while kill -0 "$pid" 2>/dev/null && (( SECONDS < deadline )); do sleep 1; done
  if kill -0 "$pid" 2>/dev/null; then echo "PID $pid did not stop after SIGTERM; inspect it manually" >&2; exit 1; fi
  rm -f "$pid_file"
  echo "Stopped owned Omio process $pid"
}

case "${1:-}" in
  run) run_foreground ;;
  start) start ;;
  status) status ;;
  stop) stop ;;
  logs) touch "$log_file"; tail -n 100 "$log_file" ;;
  ownership) is_owned "${2:-}" ;;
  *) echo "Usage: $0 {run|start|status|logs|stop}" >&2; exit 2 ;;
esac
