# 8. The session lives in the keychain, and what that leaves open

Date: 2026-09-10

## Status

Accepted

## Context

The Supabase session is a refresh token: whoever reads it is signed in as
that person until it is revoked. Supabase's documented Expo default keeps
it in AsyncStorage, which is a plain SQLite file in the app sandbox — fine
against another app, useless against anyone who reaches the file system.

Seven review rounds went into moving it. Most of what they found was
fixed; what remains are limits of the platform rather than of the code,
and they are worth writing down once instead of being rediscovered.

## Decision

The session goes into the keychain whole, through
`expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. A session left
by an older build is moved across on first read and the clear-text copy
deleted. On the web there is no keychain, so the browser's own storage
stands.

An iOS keychain entry outlives the app that wrote it, so a marker in
AsyncStorage — which does go with the app — distinguishes a fresh install
from an upgrade. Until this install has stored something of its own,
every key is cleared the first time it is used.

## Consequences, and the risks accepted with them

**A key this install never touches keeps a previous install's value.** The
wipe is per key and can only run when a key is used. Today only one key
exists (`flowType` is `implicit` and `userStorage` is unset, so
supabase-js writes just `sb-<ref>-auth-token`), and it is read on every
launch by `initialize()`. Switching to PKCE or setting `userStorage`
introduces keys that a launch may not touch before the marker is written,
and a previous install's copy of those would survive. Neither is a
session, but if either is adopted, this file needs a list of keys to
clear rather than clearing them as they arrive. (`${storageKey}-user` is
read and removed by supabase-js even with `userStorage` unset, on the
branch where a stored session carries no user — so "one key" describes
what is written, not every name that can reach this store.)

**On iOS a delete never fails, which is worse than failing.**
`SecureStoreModule.swift` discards the status of `SecItemDelete`, so a
delete that did not happen is reported as success. The store's retry
machinery — which answers null and tries again — is therefore unreachable
on iOS: a failed delete surfaces as a sign-out that comes back after a
relaunch. `signOut` defaults to global scope, so _when the revoke reached
the server_ what returns is a dead credential rather than an open
account — but supabase-js clears the local session and reports the error
even when it did not, and the app routes to the sign-in screen either
way. Signing out with no connection, on a device whose keychain silently
refused the delete, returns a live refresh token on the next launch.
Android does report a failed delete, and the retry machinery is real
there.

**An iCloud restore carries AsyncStorage to a new device.** The keychain
entry does not travel (that is what `THIS_DEVICE_ONLY` buys), but a
clear-text session left by a pre-keychain build would be migrated into the
new device's keychain on first launch. No such build has shipped, so this
is closed by history rather than by code; it stays true only as long as
that remains the case.

**The clear-text copy is deleted, not overwritten.** On Android
AsyncStorage is one SQLite file and a delete frees the page without
zeroing it, so the token stays recoverable from the free list until
something overwrites it. Against "anyone who reaches the file system",
the Android migration removes the row, not the bytes.

**A plain store that cannot be written keeps checking; one that cannot be
read declines to check at all.** The marker is written when this install
first stores something, so if that write keeps failing every launch
treats the install as fresh and wipes again — a sign-in per launch, and
the right way round, because the other way leaves someone else's account
open on a resold phone. The read side is the opposite trade and it is
deliberate: a launch that cannot read the marker does not know whether
the install is fresh, so it does not wipe, and it hands that launch
whatever the keychain holds — a previous install's session included. It
self-heals the moment the store reads again, and wiping on a guess would
sign out every user on a transient failure.
