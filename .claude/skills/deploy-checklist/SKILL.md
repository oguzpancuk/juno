---
name: deploy-checklist
description: Pre-deploy verification checklist — run before any production deploy, when asked to "deploy", "ship", "release", "canlıya al", or "yayınla". Walks the generic gates, then the product's own deploy steps.
---

# /deploy-checklist

Walk every item IN ORDER; report each as pass / fail / not-applicable-because.
A fail stops the deploy — no "deploy anyway" without my explicit say-so.

## Generic gates (every product)
1. Working tree clean, on the release branch, synced with remote.
2. Full battery green on this exact commit: `bash .claude/hooks/verify.sh`.
3. No secrets in the diff since last deploy (`git diff <last-tag>..HEAD`
   scanned for keys/tokens/passwords).
4. Migrations/data changes: reversible, or the irreversibility is stated
   and acknowledged.
5. Release notes exist for the range (offer /release-notes if not).

## Product steps
All three targets are ask-tier: each command below runs only on the
owner's explicit per-instance yes. Project refs (Supabase project,
Cloudflare Worker and its custom domains, EAS project) are recorded in
`docs/NOTES.md` by the session that creates them; if they are missing,
stop and report "no deploy target provisioned".

### Backend (Supabase)
6. `npx supabase db push --dry-run` — review the migration list, then
   `npx supabase db push`. Migrations are forward-only: an irreversible
   one needs a written down-migration or an explicit acknowledgement (gate 4).
7. `npx supabase functions deploy` — then call each function's health
   route (`/functions/v1/<name>/health`) and expect 200.
8. Rollback: apply the down-migration; redeploy the previous function
   commit with `git checkout <prev> -- supabase/functions && npx supabase functions deploy`.

### Web (Cloudflare)
W1. `npm run deploy -w @juno/mobile`. The gate in front of it refuses a
    bundle pointing at a local or non-https Supabase URL — that URL is
    inlined at export time, so a deploy from an `init.sh` shell would
    publish a site only this machine can use.
W2. Then fetch `/` and `/legal` on both hostnames and expect 200 with a
    certificate that verifies. `/legal` is the privacy notice's public
    home; a legal-text change is not shipped until this step has run.
W3. Rollback: `wrangler rollback` (or redeploy the previous commit's
    export). The Worker keeps prior versions.

### App (EAS)
9. `eas build --platform ios --profile production` (Android: `--platform android`).
10. `eas submit --platform ios` → TestFlight smoke on a real device: sign
    up with a birth date/time/place, see the natal chart, swipe one card,
    reach a match, open the chat and see the conversation starter.
11. JS-only change: `eas update --branch production --message "<release>"`
    instead of a store build. Rollback: `eas update:republish` the previous
    update group; for native builds, halt the App Store phased release.
