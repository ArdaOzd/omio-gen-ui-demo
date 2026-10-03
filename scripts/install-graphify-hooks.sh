#!/bin/sh

set -eu

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "install-graphify-hooks: run this inside a Git repository" >&2
  exit 1
}

cd "$repo_root"

if ! command -v graphify >/dev/null 2>&1; then
  echo "install-graphify-hooks: graphify is not available on PATH" >&2
  exit 1
fi

# Graphify owns the post-commit and post-checkout blocks. Its installer updates
# those blocks in place and preserves any other commands already in the hooks.
graphify hook install

hooks_dir=$(git rev-parse --git-path hooks)
case "$hooks_dir" in
  /*) ;;
  *) hooks_dir="$repo_root/$hooks_dir" ;;
esac

mkdir -p "$hooks_dir"
post_merge="$hooks_dir/post-merge"

if [ ! -e "$post_merge" ]; then
  printf '%s\n' '#!/bin/sh' > "$post_merge"
fi

if ! grep -q '^# graphify-post-merge-hook-start$' "$post_merge"; then
  cat >> "$post_merge" <<'EOF'

# graphify-post-merge-hook-start
# Reuse Graphify's full branch-change refresh after a merge or pull.
if [ "${GRAPHIFY_SKIP_HOOK:-0}" != "1" ]; then
  _graphify_repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
  _graphify_hooks_dir=$(git rev-parse --git-path hooks 2>/dev/null || true)

  case "$_graphify_hooks_dir" in
    /*) _graphify_checkout_hook="$_graphify_hooks_dir/post-checkout" ;;
    *) _graphify_checkout_hook="$_graphify_repo_root/$_graphify_hooks_dir/post-checkout" ;;
  esac

  if [ -n "$_graphify_repo_root" ] && [ -x "$_graphify_checkout_hook" ]; then
    (
      cd "$_graphify_repo_root"
      "$_graphify_checkout_hook" graphify-post-merge "$(git rev-parse HEAD 2>/dev/null)" 1
    ) || echo "[graphify] post-merge refresh could not be launched" >&2
  else
    echo "[graphify] post-merge refresh skipped: post-checkout hook is unavailable" >&2
  fi
fi
# graphify-post-merge-hook-end
EOF
fi

chmod +x "$post_merge"

echo "post-merge: installed at $post_merge"
