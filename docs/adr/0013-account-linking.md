# 13. Apple or Google on an e-mail account's address: linked by the server

Date: 2026-09-28

## Status

Accepted

## Context

The owner, on 2026-09-28, finishing the sign-in item: "daha once mail ile
kayit olmus bir kullanici eger apple veya google ile devam et derse ve mail
ayniysa hesabini baglayabilsin". A member who signed up with e-mail and
later taps "Apple ile giriş yap" or "Google ile giriş yap" must land in the
account they already have, with their profile, not in a second, empty one
that sends them through onboarding again.

Supabase Auth offers two ways to put a second identity on a user:

- **Automatic linking.** On every provider sign-in GoTrue looks for a user
  with the same address and attaches the new identity to it
  (`internal/models/linking.go`, `DetermineAccountLinking`). It considers
  only the addresses the provider marked verified — or every address, when
  e-mail confirmations are off (`Mailer.Autoconfirm`). If the account it
  finds was never confirmed, GoTrue strips that account's password and
  unconfirmed identities before confirming it
  (`internal/api/external.go`, `RemoveUnconfirmedIdentities`), so someone
  who registered another person's address and never typed the code does
  not keep a way in.
- **Manual linking.** A signed-in member calls `linkIdentity` and goes
  through the provider a second time. It needs `enable_manual_linking`,
  a settings screen to start it from, and — for Apple and Google on a
  phone — the ID-token variant of the call, since this app never uses a
  browser for Apple.

Both reach the same end state for the owner's case. Only the first needs
the person to do nothing but tap the button they would tap anyway.

## Decision

**Linking is GoTrue's automatic linking, and nothing else.** The app adds
no code to the sign-in path for it: `signInWithIdToken` (phone) and
`signInWithOAuth` (web, Google only) both end in the same
`createAccountFromExternalIdentity`, and a linked member comes back with
the user id they already had. `/` then finds their profile and sends them
to the deck; onboarding, and the consent box on it, never appear. The
consent they gave at sign-up stays the recorded one.

**It rests on e-mail confirmations staying on.** With confirmations on,
an address counts only if the provider vouches for it — GoTrue reads
Google's `email_verified` claim, and takes every Apple address as verified
(`parseAppleIDToken` sets it unconditionally; Apple hands out only
addresses it has checked) — and every e-mail account here was
confirmed with a code before it could hold a profile. With confirmations
off, GoTrue would link any provider identity onto the account with that
address, verified or not. `supabase/config.toml` and
`docs/auth-setup.md` say so beside the setting.

**Manual linking stays off** (`enable_manual_linking = false`). It is the
route for a member whose provider address differs from their e-mail one,
and nobody has asked for that.

**A different address is a new account, and onboarding says so.** Another
Google account, or Apple's Hide My Email (`…@privaterelay.appleid.com`,
which no e-mail account can share), produces a fresh user with no profile.
Onboarding reads the session's `app_metadata.providers`: when no `email`
is among them, a provider opened this account, and a sentence under the
title says which address it was opened with — or that Apple hid it — and
points at "Farklı bir hesapla gir", which signs out to the e-mail sign-in.
The decision is `lib/oauth.ts` `accountNote`, held by
`lib/oauth.test.ts`. For such an account that link also tries to delete
it before signing out, since it holds only the provider's identity and
nothing else in the app could ever reach it again. The database decides
whether it is empty: `public.abandon_empty_account()`
(`20260928000001_abandon_empty_account.sql`) locks the caller's
`auth.users` row, and deletes it only if no `profiles` row and no photo
exists, in one transaction, so a profile insert cannot land between the
check and the delete. It is a function of its own, not a mode of
`delete-account`: an older server without it answers "not found" and
deletes nothing, whatever order the app, the functions and the migrations
are deployed or rolled back in. (A body flag on `delete-account`, the
first version, failed open: an older function ignores the body and
deletes a full member.) Onboarding is reachable by URL and by deep link,
so the app cannot be the one to know. A member with a profile is only
signed out. When the call fails, the screen says the account is still
there and the next tap only signs out, so the link is never a dead end.
An e-mail account on the same screen is only signed out, as before.

**The consent a linked member gave stays the record.**
`profiles.consent_version` is the notice accepted at onboarding, where
birth data and location start being processed; a link does not touch it.
So a member who signed up under the 2026-09-21 notice and later links
Apple keeps 2026-09-21, although only the 2026-09-29 text describes
provider sign-in. Asking existing members to accept a newer notice is the
re-consent step of the next ROADMAP item ("KVKK consent and privacy
policy"), which covers every notice change, not only this one.

## Consequences

**An empty account can still be left behind**, by closing the app on
onboarding instead of tapping the link, or when the delete fails and the
person signs out anyway. It holds an address and a
provider subject id, nothing else; signing in with that provider again
returns to it, and the link deletes it then. The notice says so under
"Saklama süresi". `metrics_onboarding` counts it as an account that did
not finish onboarding, which is what it is.

**Linking merges metadata.** GoTrue writes the provider's claims into the
user's `raw_user_meta_data` on link; for Google that includes a name and a
picture URL. The app reads neither, and the privacy notice says they are
kept by the identity layer only.

**Nothing in the battery proves the link.** A provider ID token is signed
by Apple or Google and cannot be minted against the local stack. What the
battery holds is the rule onboarding applies afterwards; the link itself
is the owner's check on a device, listed in the pull request.

**Two dashboard settings matter and nothing checks them**: Confirm email
on (the safety of this decision), and Google's "Skip nonce checks" on
(without it no Google sign-in from iOS reaches this decision at all).
Skipping the nonce check gives up one protection: a captured Google ID
token for this app's audience can be exchanged again within its lifetime
(about an hour). Apple's token carries no nonce either, today, for the
reason `docs/NOTES.md` gives (2026-09-28).
