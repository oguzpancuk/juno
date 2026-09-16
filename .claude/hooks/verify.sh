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

# Every tracked shell script must keep its exec bit. Three commits in five
# were spent putting one back (NOTES 2026-09-16): an editor that writes a
# temporary file and renames it over the original gives the new file the
# default 644, the change is invisible in a content diff, and the whole
# battery stays green while `./contracts/init.sh` stops working.
exec_bits() {
  local listed bad="" gone="" file
  # `core.quotePath=false`, because git otherwise escapes a path with a
  # non-ASCII character into C-quoted form and the name that comes back is
  # not a name on disk — an executable `ölçüm.sh` would be reported as
  # missing its bit. NUL separation would be the textbook answer and is
  # the wrong one here: a command substitution cannot hold a NUL, so
  # `$(git ls-files -z)` arrives as one run-together string and
  # `read -d ''` then finds no terminator, runs the loop zero times and
  # reports success — the silent skip this whole function exists to refuse.
  # A path containing a newline is still quoted by git whatever this
  # setting says; it lands in the "missing from the tree" list below,
  # which is a failure, which is the safe direction.
  #
  # A gate that cannot list the files must fail, not pass quietly: outside
  # a git checkout `git ls-files` prints to stderr and exits non-zero, and
  # `step` hides that unless the step itself fails.
  listed="$(git -c core.quotePath=false ls-files -- '*.sh')" || {
    echo "cannot list tracked shell scripts (not a git checkout?)"
    return 1
  }
  [ -n "$listed" ] || { echo "no tracked shell scripts found at all"; return 1; }
  # The working tree, not the index. The accident this catches — a rename
  # over a file dropping its mode — happens before anything is staged, and
  # a run that only read the index would report it a commit too late. A
  # file git tracks and the tree no longer has is its own sentence: `chmod`
  # is not the fix for it.
  while IFS= read -r file; do
    if [ ! -e "$file" ]; then
      gone="$gone $file"
    elif [ ! -x "$file" ]; then
      bad="$bad $file"
    fi
  done <<<"$listed"
  [ -z "$gone" ] || echo "tracked shell scripts missing from the tree:$gone"
  [ -z "$bad" ] || {
    echo "tracked shell scripts without the exec bit:$bad"
    echo "fix with: chmod +x <path> && git update-index --chmod=+x <path>"
  }
  [ -z "$gone$bad" ] || return 1
}

step "exec bits" exec_bits
step "typecheck" npm run typecheck --workspaces --if-present
step "lint"      npm run lint --workspaces --if-present
step "format"    npx prettier --check .
step "tests"     npm run test --workspaces --if-present
step "docs"      bash .claude/hooks/docs-figures.sh

rm -f "$log"
printf '%s\n' "${results[@]}"
exit $fail
