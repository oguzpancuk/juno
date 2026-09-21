#!/usr/bin/env bash
# THE verification battery — the single source of truth for "green".
# CI runs this same file. Two rules (proven in pati): attempt EVERY step
# even after a failure and report them together; anything that cannot be
# verified is a FAIL, never a silent skip.
set -uo pipefail

# Where this file lives, resolved BEFORE the `cd`: after it the cwd is the
# repo root, so a relative `$0`/`$BASH_SOURCE` would resolve against the
# wrong directory and `cd .claude/hooks && bash verify.sh` would source
# nothing and report every step as a missing command.
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here/../.."

# Preconditions — a missing skeleton or missing deps is a FAIL.
if [ ! -f package.json ]; then
  echo "FAIL skeleton — no root package.json yet (ROADMAP walking-skeleton not started)" >&2
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "FAIL deps — node_modules missing (run: npm ci)" >&2
  exit 1
fi

# `fail`, `results`, `log`, `step` and the supabase-suite decision.
# shellcheck source=verify-lib.sh
source "$here/verify-lib.sh"

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

# One step per workspace, not `npm run test --workspaces`. That was one
# step, and `step` prints only the last 60 lines of a failing step's log:
# on 2026-09-21 the supabase suite's failure scrolled three passing
# workspaces out of the report, so a thread could not tell which suites
# had actually run. The list is read from npm rather than written out
# here, so a workspace added later cannot quietly lose its tests; a list
# that cannot be read, or that comes back empty, is a FAIL.
workspace_names() {
  npm query .workspace --json |
    node -e 'let s = "";
      process.stdin.on("data", (d) => (s += d)).on("end", () => {
        for (const w of JSON.parse(s)) process.stdout.write(w.name + "\n");
      });'
}

# Read the whole list into an array BEFORE any step runs. `step`
# redirects only stdout and stderr, so a step reading stdin inside a
# `while read … <<<` loop would swallow the rest of the list: the loop
# would end early, the remaining workspaces would get no line at all, and
# the battery would print a short but entirely green summary — the silent
# skip this file's header rule forbids, and an invisible one.
names="$(workspace_names)" || names=""
workspaces=()
while IFS= read -r ws; do
  [ -n "$ws" ] || continue
  workspaces+=("$ws")
done <<<"$names"

if [ "${#workspaces[@]}" -eq 0 ]; then
  _result FAIL "tests — cannot list the workspaces (npm query .workspace)"
  fail=1
else
  for ws in "${workspaces[@]}"; do
    case "$ws" in
      # The one workspace whose suite needs a machine that can run
      # containers; verify-lib.sh decides whether this one can.
      @juno/supabase) supabase_tests_step ;;
      *) step "tests ($ws)" npm run test -w "$ws" --if-present ;;
    esac
  done
fi

# The battery's own mechanics, driven where they cannot be driven for
# real: no daemon, no stack, six decisions.
step "battery self-test" bash "$here/verify-lib.test.sh"
step "docs"      bash .claude/hooks/docs-figures.sh

[ -z "$log" ] || rm -f "$log"
printf '%s\n' "${results[@]}"
exit $fail
