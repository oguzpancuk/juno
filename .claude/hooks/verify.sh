#!/usr/bin/env bash
# THE verification battery — the single source of truth for "green".
# CI runs this same file. Two rules (proven in pati): attempt EVERY step
# even after a failure and report them together; anything that cannot be
# verified is a FAIL, never a silent skip.
set -uo pipefail
cd "$(dirname "$0")/../.."

# Preconditions — a missing skeleton or missing deps is a FAIL.
if [ ! -f package.json ]; then
  echo "FAIL skeleton — no root package.json yet (ROADMAP walking-skeleton not started)" >&2
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "FAIL deps — node_modules missing (run: npm ci)" >&2
  exit 1
fi

fail=0; results=()
log="$(mktemp)"
step() {
  local name="$1"; shift
  if "$@" >"$log" 2>&1; then
    results+=("ok   $name")
  else
    results+=("FAIL $name")
    fail=1
    echo "--- $name ---" >&2; tail -n 60 "$log" >&2
  fi
}

step "typecheck" npm run typecheck --workspaces --if-present
step "lint"      npm run lint --workspaces --if-present
step "format"    npx prettier --check .
step "tests"     npm run test --workspaces --if-present
step "docs"      bash .claude/hooks/docs-figures.sh

rm -f "$log"
printf '%s\n' "${results[@]}"
exit $fail
