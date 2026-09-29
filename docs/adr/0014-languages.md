# 14. More than one language: Turkish is the source, every other a typed translation

Date: 2026-09-29

## Status

Accepted with this pull request; the library question below is the
owner's (1 i18next, 2 no library) and was open when this was written.

## Context

The owner, 2026-09-29: "uygulamayı İngilizce ve İspanyolcaya çevireceğiz,
her şey çevrilecek". Until then the app was Turkish only by design (PRD,
"single-language, one file"): every UI string in `lib/strings.ts`, every
interpretation text in `packages/astro/content/tr/`, the grammar that
joins planet and sign names in `packages/astro/src/tr.ts`, the privacy
notice in `lib/legal.ts`, and a handful of strings outside all three.

## Decision

1. **Turkish stays the source.** Every other language is a translation of
   the Turkish, key for key. Comments explaining a string live next to the
   Turkish only.
2. **UI strings: one catalog per language, typed by the source.**
   `lib/i18n/tr.ts` is the old `strings.ts`; `en.ts` (and later `es.ts`)
   is typed as the Turkish object's shape, strings widened (`Strings`), so
   a missing key, an extra one or a function with other parameters does
   not compile. `catalogs.test.ts` checks what the type cannot: list
   lengths, strings left in Turkish, arguments a translation drops.
   `t` in `lib/strings.ts` stays the one import and is the catalog of the
   language showing, so no call site changed.
3. **Engine texts: one directory per language**, `content/<language>/`,
   the same files and keys as `content/tr/`, and one `Words` per language
   (`src/words.ts`) for the sentences the engine builds from names, since
   Turkish builds them from case endings and English from word order.
   The engine's language is one setting (`src/language.ts`); nothing it
   computes depends on it.
4. **Which language.** The member's pick in settings, else the device's
   (the iPhone's language list, the browser's languages), else Turkish.
   The language list is `LANGUAGES` in `@juno/astro`; the app's catalog
   record is typed by it, so the two cannot disagree.
5. **A switch remounts the navigator** under the new language and returns
   to the profile. Screens memoise readings and labels; a remount is the
   one way nothing drawn in the old language survives.
6. **The privacy notice binds in Turkish.** Each translation is of the
   current version, line for line, shown under a sentence saying the
   Turkish binds and with a link to it. Translating never moves
   `LEGAL_VERSION`: what a member consents to has not changed.
7. **What iOS draws before JavaScript** (the location prompt, the Apple
   button's language) comes from the bundle: `app.json` declares every
   language and carries a permission sentence per language (`locales/`).
8. **The sign-up mail carries every language**, Turkish first: GoTrue
   knows only the address when it sends it, and storing a language on the
   account would be personal data the notice does not list.

## Consequences

- Adding a language is: `LANGUAGES`, `content/<language>/`, a `Words`, a
  UI catalog, a notice translation and its date, a `locales/` file, and a
  part in the mail; the tests above name whatever is missing.
- A new UI string is a change in every catalog in the same pull request.
- Members' own text (bio, messages, school) is not translated; a starter
  sent in one language reads in that language to the other person.
- If the owner picks i18next, points 2 and 5 change (JSON catalogs with
  `{{placeholders}}`, `t('key')` call sites, expo-localization); the key
  names, the engine side and points 4, 6–8 do not.
