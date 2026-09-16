# 11. The door: a mailed code, and providers that sign in natively

Date: 2026-09-16

## Status

Accepted

## Context

Until now an address was never verified. `[auth.email] enable_confirmations`
was off — the owner's call of 2026-09-11, "maili sonra ayarlarız, şimdilik
direkt kaydolsun" — so a sign-up handed out a session immediately and
anyone could register `birisi@example.com` and be that person to the
product for ever. Beside it, the welcome screen carried an "Apple ile giriş
yap" and a "Google ile giriş yap" button with nothing behind them, also by
owner decision, and App Store Review Guideline 4.8 makes that a submission
blocker: a reviewer taps them.

The owner closed both on 2026-09-16: "kayıt olma esnasında gerçekten kodun
mail olarak iletilmesini sağlamamız lazım. ayrıca google ve apple ile
girişi."

For the providers there were two routes, and they differ in what they cost
and what they leave the person doing:

- **Native SDKs.** `expo-apple-authentication` opens the system sheet and
  Face ID finishes it; `@react-native-google-signin` opens Google's account
  picker. Each returns an ID token that Supabase exchanges for a session.
  Nothing is redirected, so no deep link and no URL allow-list is in the
  path. The cost is that both are native modules, and a native module is
  not in Expo Go.
- **A browser redirect** through `supabase.auth.signInWithOAuth`. It keeps
  Expo Go working and is one code path for phone and web. The cost lands
  on the person: Sign in with Apple becomes a web page asking for an Apple
  ID and a 2FA code instead of a thumb on a sensor.

The owner chose native, knowing the Expo Go cost.

## Decision

**Sign-up mails a six-digit code.** Confirmations are on. `signUp` returns a
user and no session; GoTrue mails `{{ .Token }}` from
`supabase/templates/verification_code.html`, and `app/verify.tsx` spends it
through `verifyOtp({ type: 'signup' })`. A sign-in refused with
`email_not_confirmed` lands on the same screen with a fresh code already on
its way. The mail carries a code and no link, because a link would have to
re-enter the app through a deep link that the simulator, a dev build and
the web client each resolve differently.

**Apple and Google go through their own SDKs**, and the ID token they
return is exchanged with `signInWithIdToken`. On the web, where those
modules do not exist, Metro swaps in `lib/providers.web.ts`, which sends
the tab to Google and back. Apple is not offered off iOS at all.

**A provider that cannot work is not drawn.** `lib/oauth.ts` `availability`
decides: Apple where the device offers it, Google where a client ID was
compiled into the build. The credentials themselves reach the build as
`EXPO_PUBLIC_*` variables, and `app.config.ts` derives the iOS URL scheme
from the client ID rather than taking it as a second value, so the two
cannot disagree.

## Consequences, and the risks accepted with them

**Expo Go is gone as a way to run this app.** The simulator needs a dev
build — `npx expo run:ios` once, and then the same Metro reload loop as
before. `contracts/init.sh` says so where it used to print an `exp://` URL.
This was the price of the owner's choice and it is paid on the first build
of the day, not on every change; it also had to be paid before TestFlight
regardless, since that is a real build too.

**A hosted project is now unusable until SMTP is configured.** Before this,
a project with no mailer still let people in. Now nobody can complete a
sign-up without receiving mail, and Supabase's built-in sender is capped at
two an hour and only reaches project members. The deploy checklist and
`docs/auth-setup.md` carry the step; a deploy that skips it produces an app
where every new account stalls on the code screen.

**The battery reads an inbox.** `supabase/tests/auth.test.ts` fetches the
mail out of the local Mailpit and verifies the code it finds, because a
test that only asserted "no session" would pass with the mailer switched
off — which is exactly the failure this ADR exists to prevent. It ties the
suite to the local stack's mail server, which it was already tied to for
Postgres and Storage.

**The provider buttons cannot be proven by the battery, and were not proven
on a device in the session that built them.** Both paths need credentials
that only exist in a Google Cloud project and an Apple Developer account,
neither of which existed on 2026-09-16. What was verified is everything up
to the token: the config plugins produce the Sign in with Apple entitlement
and the reversed-client-id URL scheme, the pure half is covered by
`lib/oauth.test.ts`, and the screens render with and without each provider.
The first real sign-in is an owner step, and it is the last item of
`docs/auth-setup.md`.

**Apple is missing on the web and on Android.** Reaching Apple through a
browser needs a Services ID and a signing key that the iOS App ID does not
provide. E-mail and password are the way in on those platforms. If the web
client ever becomes the main door, this is the first thing to revisit.

**Two more values must match across three places.** The OTP length and
expiry live in `supabase/config.toml`, in the mail template's prose ("10
dakika") and in the hosted project's dashboard. Nothing checks the third,
so the dashboard drifting is a silent failure — a code of a different
length that the app's field will not even accept.
