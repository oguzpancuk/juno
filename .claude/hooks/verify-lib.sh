#!/usr/bin/env bash
# The battery's mechanics, in their own file so that
# `.claude/hooks/verify-lib.test.sh` can drive them without running the
# battery. `.claude/hooks/verify.sh` sources this and stays what it was:
# the preconditions, the list of steps, the summary. Running this file
# directly defines the functions and exits; there is nothing to run here.
#
# The two rules the battery has always had (proven in pati) live here:
# attempt EVERY step even after a failure and report them together;
# anything that cannot be verified is a FAIL, never a silent skip.

fail=0
results=()
log=""

# The verdict column is seven wide so ok, FAIL and NOT RUN line up under
# each other in the summary.
_result() { results+=("$(printf '%-7s %s' "$1" "$2")"); }

step() {
  local name="$1"
  shift
  [ -n "$log" ] || log="$(mktemp)"
  # stdin closed, not just stdout and stderr redirected. A step that reads
  # stdin would otherwise consume whatever the battery was started with —
  # it ate the workspace list when that list drove a `while read` loop —
  # or block forever on a terminal. No step needs stdin.
  if "$@" >"$log" 2>&1 </dev/null; then
    _result ok "$name"
  else
    _result FAIL "$name"
    fail=1
    echo "--- $name ---" >&2
    tail -n 60 "$log" >&2
  fi
}

# Is there a daemon behind the `docker` binary? `docker info` is the
# cheapest question that actually reaches one; with no daemon it fails at
# the socket and returns at once. `timeout` guards the case where a
# daemon accepts the connection and then says nothing, and is optional
# because macOS does not ship one.
docker_daemon_reachable() {
  if command -v timeout >/dev/null 2>&1; then
    timeout 20 docker info >/dev/null 2>&1
  else
    docker info >/dev/null 2>&1
  fi
}

# What this machine can do about the supabase workspace's suite, which
# talks to a real local Supabase stack, which is containers. Prints
# `run`, or `not-run:<why>`.
supabase_tests_plan() {
  # CI is where the stack is started (`.github/workflows/ci.yml`), so the
  # suite always runs there and a missing stack is a defect in the run,
  # never a fact about the machine. `-n` is the wrong question: `CI=false`
  # and `CI=0` are the idiom for turning CI behaviour OFF (Expo and CRA
  # build scripts, some sandbox images export it verbatim), and a thread
  # carrying one of them would be forced to run a suite it cannot run.
  case "${CI:-}" in
    '' | false | 0) ;;
    *)
      echo run
      return 0
      ;;
  esac
  # A machine with no docker binary cannot run a container at all.
  if ! command -v docker >/dev/null 2>&1; then
    echo "not-run:no docker on this machine"
    return 0
  fi
  # Nor can one whose binary has no daemon to talk to, and that is the
  # case a cloud thread is actually in: /usr/bin/docker is there,
  # /var/run/docker.sock is not, and nothing in the thread can create it.
  if ! docker_daemon_reachable; then
    echo "not-run:a docker binary, but no daemon answering it"
    return 0
  fi
  # Docker works here. A stack that is down is then this machine's to
  # start (`npx supabase start`) and a failing suite is a real FAIL.
  echo run
}

# NOT RUN is not a third rule and not the silent skip the battery refuses:
# it names a step this machine is incapable of running, it prints in the
# summary beside ok and FAIL, and it says where the real run is. It is
# reached only where a FAIL would pass a verdict on code that was never
# executed.
supabase_tests_step() {
  local name="tests (@juno/supabase)" plan
  plan="$(supabase_tests_plan)"
  case "$plan" in
    run) step "$name" npm run test -w @juno/supabase --if-present ;;
    not-run:*)
      _result "NOT RUN" "$name — CI's \`verify\` is the run (${plan#not-run:})"
      ;;
    # The contract is `run` or `not-run:<why>`, and nothing else may fall
    # through to NOT RUN: that would exit the battery green having never
    # run the suite and never said it could have.
    *)
      _result FAIL "$name — unparseable plan [$plan]"
      fail=1
      ;;
  esac
  return 0
}
