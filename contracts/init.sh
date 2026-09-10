#!/usr/bin/env bash
# Boots the app for a work session in one command: local Supabase stack
# (Docker), then the Expo dev server on port 8082 with the local keys.
# Idempotent: re-running attaches to whatever is already up.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d node_modules ] || npm ci

if ! docker info >/dev/null 2>&1; then
  echo "init: Docker is not running (needed for supabase start)" >&2
  exit 1
fi

# Local Supabase: start only if the API is not already answering.
if ! curl -sf http://127.0.0.1:54321/auth/v1/health >/dev/null 2>&1; then
  # Studio stays on: ROADMAP manual checks read rows there (port 54323).
  npx supabase start -x imgproxy,logflare,vector >/dev/null
fi
curl -sf http://127.0.0.1:54321/auth/v1/health >/dev/null  # smoke: auth up

# Keys come from the running stack; never hard-coded. eval is safe here:
# the input is the local CLI's own KEY="value" lines, filtered to two keys.
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY)=')"
export EXPO_PUBLIC_SUPABASE_URL="$API_URL"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"

# Expo dev server, detached from the caller's process group (an agent's
# shell tool waits on and kills the group). Port 8082: 8081 is often taken.
# --clear: in CI mode Metro does not watch files, so a stale transform
# cache would otherwise serve the previous session's code.
if ! curl -sf http://localhost:8082/status >/dev/null 2>&1; then
  (cd apps/mobile && perl -MPOSIX -e 'POSIX::setsid(); exec @ARGV' -- \
     nohup env CI=1 npx expo start --port 8082 --clear >/tmp/juno-expo.log 2>&1 </dev/null &)
  for _ in $(seq 1 60); do
    curl -sf http://localhost:8082/status >/dev/null 2>&1 && break
    sleep 1
  done
fi
curl -sf http://localhost:8082/status >/dev/null  # smoke: Metro up

echo "init: Supabase at $API_URL, Expo at http://localhost:8082 (log: /tmp/juno-expo.log)"
echo "init: open in the simulator with: xcrun simctl openurl booted exp://127.0.0.1:8082"
