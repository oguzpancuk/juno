#!/usr/bin/env bash
# Drives the battery's supabase-suite decision, without a Docker daemon
# and without a Supabase stack. Only the decision is under test; running
# the suite itself is CI's job.
#
# Every case builds a PATH holding nothing but symlinks to the tools the
# battery's mechanics use plus the stubs the case wants. Prepending a stub
# directory to the real PATH would not do: "no docker on this machine" has
# to mean absent on the GitHub runner too, where /usr/bin/docker is very
# much present, and the stub `npm` has to be the only npm reachable, or
# the case that must NOT start the suite could start the real one.
set -uo pipefail
cd "$(dirname "$0")"

# shellcheck source=verify-lib.sh
source ./verify-lib.sh

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

failures=0
check() { # check <what> <expected> <actual>
  if [ "$2" = "$3" ]; then
    echo "ok   $1"
  else
    echo "FAIL $1 — expected [$2], got [$3]"
    failures=1
  fi
}

# The stub `npm` records that it was called and then fails the way a
# machine with no stack running fails. The record is the point: a case
# that expects NOT RUN proves the suite was never started, not merely
# that the summary said the right word.
#
# `docker`: absent, present-without-a-daemon (`docker info` fails, as it
# does in a cloud thread), or present with one answering.
sandbox() { # sandbox <dir> <docker: none|no-daemon|daemon>
  local dir="$1" docker="$2" tool
  rm -rf "$dir"
  mkdir -p "$dir/bin"
  # `#!/bin/sh`, not `env`: the sandbox PATH has no `env` and no `bash`.
  for tool in mktemp tail rm; do
    ln -sf "$(command -v "$tool")" "$dir/bin/$tool"
  done
  printf '#!/bin/sh\necho ran >>"%s/npm-was-run"\necho "failed to connect to the local Supabase stack" >&2\nexit 1\n' \
    "$dir" >"$dir/bin/npm"
  chmod +x "$dir/bin/npm"
  case "$docker" in
    none) ;;
    no-daemon) printf '#!/bin/sh\nexit 1\n' >"$dir/bin/docker" ;;
    daemon) printf '#!/bin/sh\nexit 0\n' >"$dir/bin/docker" ;;
    *)
      echo "unknown docker mode: $docker" >&2
      exit 2
      ;;
  esac
  [ ! -e "$dir/bin/docker" ] || chmod +x "$dir/bin/docker"
}

in_sandbox() { # in_sandbox <dir> <CI value, or empty for unset> <command...>
  local dir="$1" ci="$2"
  shift 2
  (
    PATH="$dir/bin"
    export PATH
    if [ -n "$ci" ]; then export CI="$ci"; else unset CI; fi
    "$@"
  )
}

# One canary step stands in for the battery's other steps, so a case can
# say "the supabase step did not take the battery down with it". This runs
# in `in_sandbox`'s subshell, not a child `bash` — the sandbox PATH has no
# bash, and a child would have to be handed the mechanics some other way.
drive() {
  fail=0
  results=()
  log=""
  step "canary" true
  supabase_tests_step
  printf '%s\n' "${results[@]}"
  exit $fail
}

run_case() { # run_case <dir> <CI value, or empty for unset>
  in_sandbox "$1" "$2" drive 2>"$tmp/stderr"
}

verdict() { # verdict <output> <step name> — the verdict word for one line
  local escaped
  escaped="$(printf '%s' "$2" | sed 's/[][\/$*.^]/\\&/g')"
  printf '%s\n' "$1" | sed -n "s/^\(ok\|FAIL\|NOT RUN\)  *$escaped\( .*\)\?$/\1/p"
}

started() { # started <dir> — did anything call the stub npm?
  if [ -f "$1/npm-was-run" ]; then echo yes; else echo no; fi
}

says() { # says <output> <literal> — does the summary carry this text?
  if printf '%s\n' "$1" | grep -qF -- "$2"; then echo yes; else echo no; fi
}

plan_word() { # plan_word <plan> — `run`, or `not-run` without the reason
  case "$1" in
    run) echo run ;;
    not-run:*) echo not-run ;;
    *) echo "unparseable [$1]" ;;
  esac
}

# 1. No docker binary at all: the machine cannot run containers, so the
#    suite is NOT RUN — named in the summary, not failing the battery, and
#    genuinely not started.
sandbox "$tmp/none" none
check "no docker: plan" "not-run" "$(plan_word "$(in_sandbox "$tmp/none" "" supabase_tests_plan)")"
out="$(run_case "$tmp/none" "")"
code=$?
check "no docker: battery exit code" 0 "$code"
check "no docker: supabase verdict" "NOT RUN" "$(verdict "$out" 'tests (@juno/supabase)')"
check "no docker: the other steps stay green" "ok" "$(verdict "$out" 'canary')"
check "no docker: the summary points at CI" "yes" "$(says "$out" "CI's \`verify\` is the run")"
check "no docker: the suite never started" "no" "$(started "$tmp/none")"

# 2. A docker binary with no daemon behind it — a cloud thread. Same
#    verdict: nothing here can create the socket.
sandbox "$tmp/nodaemon" no-daemon
check "no daemon: plan" "not-run" "$(plan_word "$(in_sandbox "$tmp/nodaemon" "" supabase_tests_plan)")"
out="$(run_case "$tmp/nodaemon" "")"
code=$?
check "no daemon: battery exit code" 0 "$code"
check "no daemon: supabase verdict" "NOT RUN" "$(verdict "$out" 'tests (@juno/supabase)')"
check "no daemon: the other steps stay green" "ok" "$(verdict "$out" 'canary')"
check "no daemon: the suite never started" "no" "$(started "$tmp/nodaemon")"

# 3. Docker answers but the stack is down. This machine could have run
#    the suite, so its failure is the code's problem, not the machine's.
sandbox "$tmp/down" daemon
check "stack down: plan" "run" "$(plan_word "$(in_sandbox "$tmp/down" "" supabase_tests_plan)")"
out="$(run_case "$tmp/down" "")"
code=$?
check "stack down: battery exit code" 1 "$code"
check "stack down: supabase verdict" "FAIL" "$(verdict "$out" 'tests (@juno/supabase)')"
check "stack down: the suite really ran" "yes" "$(started "$tmp/down")"

# 4. CI, with no docker binary. CI is where the stack is started, so a
#    missing one there is a defect in the run and never a NOT RUN.
sandbox "$tmp/ci" none
check "CI without docker: plan" "run" "$(plan_word "$(in_sandbox "$tmp/ci" true supabase_tests_plan)")"
out="$(run_case "$tmp/ci" true)"
code=$?
check "CI without docker: battery exit code" 1 "$code"
check "CI without docker: supabase verdict" "FAIL" "$(verdict "$out" 'tests (@juno/supabase)')"
check "CI without docker: the suite really ran" "yes" "$(started "$tmp/ci")"

if [ "$failures" -eq 0 ]; then
  echo "battery self-test: all cases ok"
else
  echo "battery self-test: FAILED" >&2
fi
exit $failures
