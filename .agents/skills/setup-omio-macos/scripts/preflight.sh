#!/bin/bash
set -u

failures=0
warnings=0
required_gib=10
if [[ "${1:-}" == "--before-seed" ]]; then required_gib=18; fi

pass() { printf 'PASS  %s\n' "$1"; }
warn() { printf 'WARN  %s\n' "$1"; warnings=$((warnings + 1)); }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }

if [[ "$(uname -s)" == "Darwin" ]]; then pass "macOS $(sw_vers -productVersion) on $(uname -m)"; else fail "This setup supports macOS only"; fi
if xcode-select -p >/dev/null 2>&1; then pass "Xcode Command Line Tools"; else fail "Run: xcode-select --install, accept the dialog, then rerun"; fi

brew_path="$(command -v brew 2>/dev/null || true)"
if [[ -z "$brew_path" ]]; then
  case "$(uname -m)" in
    arm64) [[ -x /opt/homebrew/bin/brew ]] && brew_path=/opt/homebrew/bin/brew ;;
    x86_64) [[ -x /usr/local/bin/brew ]] && brew_path=/usr/local/bin/brew ;;
  esac
fi
if [[ -n "$brew_path" ]]; then pass "Homebrew: $brew_path"; else fail "Install Homebrew from https://brew.sh and load brew shellenv"; fi

if command -v node >/dev/null 2>&1; then
  node_version="$(node -p 'process.versions.node')"
  if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit((a===20&&b>=19)||(a===22&&b>=12)||a>22?0:1)' >/dev/null 2>&1; then
    pass "Node $node_version"
  else
    fail "Node $node_version is unsupported; install ^20.19.0 or >=22.12.0 (Node 22 LTS preferred)"
  fi
else fail "Node is missing"; fi
if command -v npm >/dev/null 2>&1; then pass "npm $(npm --version)"; else fail "npm is missing"; fi

if command -v python3 >/dev/null 2>&1; then
  python_version="$(python3 -c 'import platform; print(platform.python_version())')"
  if python3 -c 'import sys; raise SystemExit(sys.version_info < (3, 11))'; then pass "Python $python_version"; else fail "Python $python_version is unsupported; install Python >=3.11 (3.12 preferred)"; fi
else fail "python3 is missing"; fi

if command -v git >/dev/null 2>&1; then pass "$(git --version)"; else fail "git is missing"; fi
if command -v uv >/dev/null 2>&1; then pass "uv $(uv --version | awk '{print $2}')"; else fail "uv is missing; install it with: brew install uv"; fi
if [[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then pass "Google Chrome stable"; else fail "Install stable Google Chrome in /Applications"; fi

codex_path="${CODEX_BINARY:-}"
if [[ -n "$codex_path" && ! -x "$codex_path" ]]; then
  fail "CODEX_BINARY is not executable: $codex_path"
elif [[ -z "$codex_path" ]]; then
  codex_path="$(command -v codex 2>/dev/null || true)"
  for candidate in \
    "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex" \
    "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"; do
    [[ -n "$codex_path" ]] || [[ ! -x "$candidate" ]] || codex_path="$candidate"
  done
fi

if [[ -n "$codex_path" ]]; then
  pass "Codex executable: $codex_path"
  if command -v python3 >/dev/null 2>&1; then
    login_output="$(python3 - "$codex_path" <<'PY'
import subprocess, sys
try:
    result = subprocess.run([sys.argv[1], "login", "status"], capture_output=True, text=True, timeout=10)
except subprocess.TimeoutExpired:
    print("status check timed out")
    raise SystemExit(124)
print((result.stdout + result.stderr).strip())
raise SystemExit(result.returncode)
PY
)"
    login_status=$?
    if [[ $login_status -eq 0 ]]; then pass "Codex login: ${login_output:-signed in}"; else warn "Codex login unavailable: ${login_output:-run codex login}"; fi
  fi
else fail "Install Codex on PATH or set CODEX_BINARY to an executable Codex path"; fi

free_kib="$(df -Pk . | awk 'NR==2 {print $4}')"
required_kib=$((required_gib * 1024 * 1024))
if [[ "$free_kib" =~ ^[0-9]+$ ]] && (( free_kib >= required_kib )); then
  pass "Free space meets ${required_gib} GiB threshold"
else
  fail "At least ${required_gib} GiB free is required at the repository path"
fi

printf '\nResult: %d failure(s), %d warning(s)\n' "$failures" "$warnings"
exit "$failures"
