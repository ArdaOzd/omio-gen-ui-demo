#!/bin/bash
set -euo pipefail

source_helper="$(cd "$(dirname "$0")" && pwd -P)/manage-app.sh"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/omio-manage-test.XXXXXX")"
pid_a=''
pid_b=''
cleanup() {
  [[ -z "$pid_a" ]] || kill "$pid_a" 2>/dev/null || true
  [[ -z "$pid_b" ]] || kill "$pid_b" 2>/dev/null || true
  rm -rf "$fixture"
}
trap cleanup EXIT INT TERM

for clone in a b; do
  mkdir -p "$fixture/$clone/.agents/skills/setup-omio-macos/scripts" "$fixture/$clone/scripts"
  cp "$source_helper" "$fixture/$clone/.agents/skills/setup-omio-macos/scripts/manage-app.sh"
  cat > "$fixture/$clone/scripts/run.mjs" <<'JS'
setInterval(() => {}, 1000)
JS
done

mkdir -p "$fixture/bin"
cat > "$fixture/bin/python3" <<'SH'
#!/bin/sh
exit 0
SH
chmod +x "$fixture/bin/python3"

helper_a="$fixture/a/.agents/skills/setup-omio-macos/scripts/manage-app.sh"
(cd "$fixture/a" && PATH="$fixture/bin:$PATH" API_PORT=28101 AGENT_PORT=28102 WEB_PORT=28103 exec "$helper_a" run) >"$fixture/a-run.log" 2>&1 & pid_a=$!
(cd "$fixture/b" && exec node scripts/run.mjs dev) & pid_b=$!
for _ in 1 2 3 4 5; do
  [[ -f "$fixture/a/artifacts/setup/omio-dev.pid" ]] && break
  sleep 1
done
if [[ ! -f "$fixture/a/artifacts/setup/omio-dev.pid" ]]; then
  cat "$fixture/a-run.log" >&2
  echo "foreground run did not write its PID file" >&2
  exit 1
fi

recorded="$(tr -dc '0-9' < "$fixture/a/artifacts/setup/omio-dev.pid")"
if [[ "$recorded" != "$pid_a" ]]; then
  echo "foreground run did not preserve and record its executor PID" >&2
  exit 1
fi
"$helper_a" ownership "$pid_a"
if "$helper_a" ownership "$pid_b"; then
  echo "ownership check accepted the same command from another clone" >&2
  exit 1
fi
echo "PASS: foreground run records its PID and ownership requires the exact physical repository cwd"
