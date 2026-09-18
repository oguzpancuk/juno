# Driving the web client

Step files for `scripts/web-drive.mjs`, which renders the exported web
client at a real phone viewport and writes PNGs.

`l1-web.json` is the run behind `screenshots/l1-web-*.png`: the door, the
privacy notice as a sheet, the onboarding fields, a seeded demo in the
deck, and the match that a like on one produces. To repeat it:

```sh
# 1. a local stack with the demos in it
npx supabase db reset
eval "$(npx supabase status -o env | grep -E '^(API_URL|SERVICE_ROLE_KEY|ANON_KEY)=')"
SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
  npx tsx supabase/scripts/seed-demo.ts

# 2. a confirmed account with no profile yet — the run does the onboarding
curl -s -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"email":"l1-shots@test.local","password":"juno-drive-password","email_confirm":true}'

# 3. a build pointed at that stack, served with an SPA fallback
cd apps/mobile
EXPO_PUBLIC_SUPABASE_URL="$API_URL" EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
  npx expo export -p web --clear --output-dir dist-local
npx serve dist-local -s -l 8097   # anything that serves index.html for unknown paths

# 4. the run
node scripts/web-drive.mjs http://127.0.0.1:8097 ../../screenshots scripts/steps/l1-web.json
```

The account has to be fresh each time: the run walks onboarding, and
onboarding is not reachable once a profile exists.

The deck shows one card at a time, so the other half of the ROADMAP's
done-when for L1 — that all twenty demos are in range — is counted rather
than photographed. Same stack, after the run:

```sh
docker exec supabase_db_juno psql -U postgres -d postgres -t -c "
select count(*) from public.profiles p
 join public.profiles me
   on me.id = (select id from auth.users where email = 'l1-shots@test.local')
 where p.is_demo
   and p.id <> me.id
   and extensions.st_dwithin(p.location, me.location, me.radius_km * 1000)
   and cardinality(p.photos) > 0;"
```

It answers `20`: every demo passes the radius and photo conditions
`discover` applies, and the preference conditions hold because the demos
are interested in everyone and the run's viewer is too.
