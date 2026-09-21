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
  # A template, not a bare `mktemp`: BSD mktemp — the one macOS ships —
  # refuses to run without one, and the substitution would then be empty
  # and every redirection below ambiguous. GNU accepts the template too.
  [ -n "$log" ] || log="$(mktemp "${TMPDIR:-/tmp}/juno-verify.XXXXXX")"
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

# The workspaces whose `test` script the battery runs, one name per line.
# Read from npm rather than written out, so a workspace added later cannot
# quietly lose its tests.
workspace_names() {
  npm query .workspace --json |
    node -e 'let s = "";
      process.stdin.on("data", (d) => (s += d)).on("end", () => {
        for (const w of JSON.parse(s)) process.stdout.write(w.name + "\n");
      });'
}

# One step per workspace, not `npm run test --workspaces`. That was one
# step, and `step` prints only the last 60 lines of a failing step's log:
# on 2026-09-21 the supabase suite's failure scrolled three passing
# workspaces out of the report, so a thread could not tell which suites
# had actually run.
#
# The whole list is read into an array BEFORE any step runs. Driving the
# loop from a here-string would leave the list on stdin, and a step that
# reads stdin would swallow the rest of it: the loop would end early, the
# remaining workspaces would get no line at all, and the battery would
# print a short but entirely green summary — the silent skip this file's
# header rule forbids, and an invisible one. `step` closes stdin as well,
# which is the half of that fix this loop cannot do for it.
tests_steps() {
  local names ws
  local -a workspaces=()
  names="$(workspace_names)" || names=""
  while IFS= read -r ws; do
    [ -n "$ws" ] || continue
    workspaces+=("$ws")
  done <<<"$names"

  # A list that cannot be read, or that comes back empty, is a FAIL: no
  # list means no test step at all, and a battery that runs no tests must
  # not say so in silence.
  if [ "${#workspaces[@]}" -eq 0 ]; then
    _result FAIL "tests — cannot list the workspaces (npm query .workspace)"
    fail=1
    return 0
  fi

  for ws in "${workspaces[@]}"; do
    case "$ws" in
      # The one workspace whose suite needs a machine that can run
      # containers; supabase_tests_step decides whether this one can.
      @juno/supabase) supabase_tests_step ;;
      *) step "tests ($ws)" npm run test -w "$ws" --if-present ;;
    esac
  done
}
