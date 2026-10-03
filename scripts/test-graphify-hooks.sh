#!/bin/sh

set -eu

repo_root=$(git rev-parse --show-toplevel)
installer="$repo_root/scripts/install-graphify-hooks.sh"
tmp_root=$(mktemp -d "${TMPDIR:-/tmp}/omio-graphify-hooks.XXXXXX")
trap 'rm -rf "$tmp_root"' EXIT HUP INT TERM

test_repo="$tmp_root/repo"
mkdir -p "$test_repo"
git -C "$test_repo" init -q

hooks_dir=$(git -C "$test_repo" rev-parse --git-path hooks)
case "$hooks_dir" in
  /*) ;;
  *) hooks_dir="$test_repo/$hooks_dir" ;;
esac

printf '%s\n' '#!/bin/sh' 'echo preserved >> "$GRAPHIFY_HOOK_TEST_LOG"' > "$hooks_dir/post-merge"
chmod +x "$hooks_dir/post-merge"

(
  cd "$test_repo"
  "$installer" >/dev/null
  "$installer" >/dev/null
)

for hook in post-commit post-checkout post-merge; do
  test -x "$hooks_dir/$hook"
done

test "$(grep -c '^# graphify-post-merge-hook-start$' "$hooks_dir/post-merge")" -eq 1
grep -q 'echo preserved' "$hooks_dir/post-merge"

record="$tmp_root/post-checkout.log"
cat > "$hooks_dir/post-checkout" <<'EOF'
#!/bin/sh
printf '%s|%s|%s\n' "$1" "$2" "$3" >> "$GRAPHIFY_HOOK_TEST_LOG"
EOF
chmod +x "$hooks_dir/post-checkout"

(
  cd "$test_repo"
  GRAPHIFY_HOOK_TEST_LOG="$record" "$hooks_dir/post-merge" 0
)
grep -q '^preserved$' "$record"
grep -q '^graphify-post-merge|.*|1$' "$record"

: > "$record"
(
  cd "$test_repo"
  GRAPHIFY_SKIP_HOOK=1 GRAPHIFY_HOOK_TEST_LOG="$record" "$hooks_dir/post-merge" 0
)
grep -q '^preserved$' "$record"
test "$(wc -l < "$record" | tr -d ' ')" -eq 1

echo "Graphify hook installer tests passed"
