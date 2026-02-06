#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT_PATH="${1:-output/latest-report.html}"

if [[ ! -f "$REPORT_PATH" ]]; then
  echo "Report file not found: $REPORT_PATH" >&2
  echo "Run: npm run monitor:dev (or npm run monitor) to generate it." >&2
  exit 1
fi

WORKTREE_DIR=".worktrees/gh-pages"
mkdir -p ".worktrees"

if [[ ! -d "$WORKTREE_DIR/.git" ]]; then
  git worktree add -f "$WORKTREE_DIR" gh-pages
fi

cp "$REPORT_PATH" "$WORKTREE_DIR/latest-report.html"
cp "$REPORT_PATH" "$WORKTREE_DIR/index.html"

(
  cd "$WORKTREE_DIR"
  git add index.html latest-report.html
  if git diff --cached --quiet; then
    echo "No changes to publish."
    exit 0
  fi
  git commit -m "Update report ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
  git push origin gh-pages
)

echo "Published. URL: https://sylvlondon.github.io/hotelmonitoring/"
