#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/Users/psg/saju"
cd "$REPO_DIR"

git add -A

if git diff --cached --quiet; then
  exit 0
fi

STAMP=$(date '+%Y-%m-%d %H:%M')

git commit -m "chore: auto backup ${STAMP}"

git push
