# stardate — design brief for Claude Design

Paste the "Prompt" section into a new Claude Design project, then feed the
rest of this file as context. Everything below is derived from
`docs/PRD.md`, `docs/ROADMAP.md` and the shipped screens; the UI strings
are the exact ones in `apps/mobile/lib/strings.ts`. Keep the text as is —
the app is Turkish-only and every string is already reviewed.

## Prompt

> Design the complete mobile UI for **stardate**, a Turkish dating app
> whose whole point is astrology done properly: users enter birth place,
> date and time; the app computes their real natal chart, explains it,
> shows a compatibility score with every profile, and gives matched pairs
> a chart-based first message so nobody has to open with "selam".
>
> Audience: 20–35 year olds in Istanbul, Ankara and Izmir who use Tinder,
> Bumble or Hinge and are bored of them. iPhone users. They read their
> horoscope and know (or want to know) their rising sign.
>
> Design all 11 screens listed in the brief as iPhone artboards (390 pt
> wide), plus the reusable components and a token sheet (colours, type
> scale, spacing, radii). Dark mode is the primary theme. The look should
> feel like a night sky and a good date, not a fortune-teller's tent: warm,
> modern, a little mystical, never kitsch. All copy is Turkish and is given
> verbatim in the brief; do not invent or translate strings.
>
> The design will be implemented in React Native (Expo) and also rendered
> on the web from the same code, so use layouts that flexbox can express,
> system-safe fonts (or one Google font with a fallback), and no effects
> that need native shaders.

## Product in one paragraph

Sign in with email code → enter name, gender, who you want to meet, birth
city, date and time → see your natal chart (big three, ten planets with
sign and house, major aspects, each explained in Turkish) → add photos and
a bio → swipe through people within a radius, each with a 0–100
compatibility score and a one-line "why" → on a mutual like, a match
screen shows the strongest link between the two charts as a conversation
starter → text chat with that starter pinned on top. Block, report and
account deletion live in every profile and in settings.

## Design principles

1. **The chart is the hero, the photo is the context.** Other apps lead
   with the photo. Here the compatibility score and the "why" line must be
   as prominent as the photo on the discover card.
2. **Explain, never mystify.** Every placement and aspect has a plain
   Turkish sentence. Typography must make long Turkish sentences pleasant
   to read (line height, measure, contrast).
3. **One thing per screen.** Onboarding is a form; chart is a list;
   discover is one card; match is one starter. No tabs, no dashboards.
4. **Calm dark palette.** Current provisional palette (replace freely, but
   keep the mood): background `#0b0b1a`, card `#15142a`, chip `#1c1b33`,
   text `#f5f2ff`, secondary `#c9c4e3`, muted `#9a94b8`, error `#ff7b7b`;
   accent gold `#F2B97E` → rose `#E98FA0` (the mark's gradient, see
   `apps/mobile/assets/brand/mark.svg`).
5. **Apple-compliant dating app.** Block and report reachable from every
   profile and chat; account deletion reachable from settings; 18+ gate
   at onboarding.

## Constraints that shape the design

- Implementation is React Native via Expo Router; the same code renders
  on the web. Flexbox layouts only; no blur-heavy or shader effects.
- No LLM text. Every explanation is a hand-written template, so text
  lengths are known: chart explanations are 1–3 sentences, starters are
  one sentence plus a question.
- Location is shown as a distance in km ("3 km", "1 km altı"), never a
  map or coordinates.
- Photos: 1–6 per profile, portrait, the first one is the card photo.
- Turkish uppercase: "İ" must stay "İ" (section labels are pre-uppercased
  in the strings).
- Non-goals to leave out entirely: daily horoscope, transits, premium,
  boosts, super-likes, voice/video, friends, English.

## Screen inventory

Each screen lists what it shows, the exact strings, and the interactions.
Flow: Sign in → Onboarding → Chart → Discover ⇄ Settings/Profile;
Discover → Match → Chat; Matches → Chat.

### 1. Sign in (`sign-in`)

Two states: email entry, then code entry.

- Title: **Giriş yap**
- Email field label: **E-posta adresin**, placeholder `ornek@eposta.com`
- Button: **Kod gönder** (loading: **Gönderiliyor…**)
- Code step: label **E-postana gelen 6 haneli kod**, button **Doğrula**,
  link **Kodu tekrar gönder**
- Consent line under the button: _Devam ederek doğum bilgilerinin ve
  konumunun uyum hesaplamak için işlenmesini kabul edersin._
- Errors: _E-posta adresi geçersiz görünüyor._ / _Kod geçersiz ya da
  süresi dolmuş. Yeni kod iste._ / _Çok sık denedin, biraz bekle._
- Later: a "Sign in with Apple" button above email (design the slot now).

### 2. Onboarding — birth data (`onboarding`)

A single scrolling form. Birth time is mandatory; the submit button stays
disabled until all fields validate.

- Title **Doğum bilgilerin**, subtitle _Haritanı çıkarmak için yer, tarih
  ve saat gerekiyor. Saat zorunlu._
- **Adın** (text, max 40)
- **Cinsiyetin**: segmented choice **Kadın / Erkek / Belirtmek istemiyorum**
- **Kiminle tanışmak istersin?**: **Kadınlar / Erkekler / Herkes**
- **Doğum yerin**: search field, placeholder **Şehir ara…**, shows a
  dropdown of matching cities ("İstanbul, Türkiye"); must pick from list.
- **Doğum tarihin (gün / ay / yıl)**: three numeric fields
- **Doğum saatin (saat : dakika)**: two numeric fields
- Hint: _Konum izni verirsen mesafeler daha doğru olur; vermezsen doğum
  şehrin kullanılır._
- Submit **Haritamı çıkar** (loading **Hesaplanıyor…**)
- Inline errors: _Adını yaz (en fazla 40 karakter)._ / _Listeden bir şehir
  seç._ / _Geçerli bir tarih gir._ / _Doğum saatin gerekli (00:00–23:59)._
  / _stardate 18 yaş ve üzeri içindir._
- Footer link **Farklı bir hesapla gir**

### 3. Natal chart (`chart`)

The user's own chart. Data comes from the engine; the screen renders it.

- Title **Doğum haritan**
- Section **BÜYÜK ÜÇLÜN**: three chips **Güneş / Ay / Yükselen**, each with
  a sign name (e.g. "Akrep") and a degree ("14°"). This trio is also the
  badge shown on every profile card.
- Section **GEZEGENLER**: ten rows (Güneş, Ay, Merkür, Venüs, Mars,
  Jüpiter, Satürn, Uranüs, Neptün, Plüton). Each row: planet, sign,
  degree, house ("7. ev"), retrograde marker **R**. Tapping a row expands
  a 1–3 sentence Turkish explanation.
- Section **AÇILAR**: rows like "Güneş kare Ay · 2.1° orb" with a
  tap-to-expand meaning. Empty state: _Haritanda majör açı yok;
  gezegenlerin birbirinden bağımsız çalışıyor._
- A chart wheel illustration is welcome but optional; the list is the
  requirement.
- Links: **Keşfet ›**, **Çıkış yap**

### 4. Discover (`discover`)

One card at a time. The compatibility score and the "why" line must be as
strong as the photo.

- Header: title **Keşfet**; links **Haritam**, **Eşleşmeler**, **Ayarlar**
- If the user has no photo yet, a banner: **Keşfette görünmek için bir
  fotoğraf ekle ›**
- Card: portrait photo; name and age ("Elif, 27"); distance ("3 km" or
  **1 km altı**); bio (up to 3 lines); big-three chips (Güneş / Ay /
  Yükselen with sign); the score as a large number with the label
  **uyum** ("78 uyum"); one-line why, e.g. _Ay'ın onun Venüs'üyle üçgen
  yapıyor._ Fallback why: _Haritalarınız birbirine değmiyor._
- Toggle **Uyum detayı** / **Detayı gizle** expands: a band sentence
  (what the score range means), **Elementler** with two lines (Sun
  elements, Moon elements), then 1–4 aspect rows each with a headline and
  a meaning sentence.
- Actions: **Geç** and **Beğen** as two large buttons (swipe gestures are
  a bonus, buttons are required for web).
- Counter under the buttons: "4 kişi daha" / **Sonuncu**
- Empty state: _Yakınlarda şimdilik kimse kalmadı. Yarıçapı ayarlardan
  genişletebilirsin._
- Error line (red): _Bu iki harita arasında ortak bir açı yok; beğeni
  gönderilemiyor._

### 5. Match (`match/[id]`)

Shown the moment both users liked each other, and reachable later from
the chat.

- Kicker **EŞLEŞTİNİZ**, title "Elif ile eşleştin"
- Both users' first photos (side by side or overlapping)
- Section **SOHBET BAŞLATICIN**: the starter as a pull quote, e.g.
  _Senin Ay'ın onun Venüs'üyle üçgen yapıyor: birbirinizin yanında
  rahatlamak kolay, sizce de öyle mi?_ Below it a small **Neden** line
  with the aspect. Empty: _Haritalarınız bir başlangıç cümlesi vermedi;
  sen bir şey sor._
- Section **UYUM ÖZETİ**: score + **uyum**; **ELEMENTLER**; **ÖNE ÇIKAN
  AÇILAR** rows (headline + meaning)
- Primary button **Sohbeti aç ›**; links **Tüm eşleşmeler ›**, **‹ Keşfete
  dön**
- Safety block at the bottom (see §10)

### 6. Matches list (`matches`)

- Title **Eşleşmeler**
- Rows: photo, name, latest message preview ("Sen: …" prefix when it is
  mine), unread indicator, relative time
- Row with no messages yet: _Henüz mesaj yok; başlangıç sorusu sende._
- Empty: _Henüz eşleşme yok. Keşfetmeye devam et._

### 7. Chat (`chat/[id]`)

- Header: **‹ Eşleşmeler**, the other person's name and photo, link
  **Uyum detayı ›**
- Pinned starter card at the top (same sentence as the match screen);
  design it so it is clearly "tap to send / quote this" material
- Message bubbles, mine right, theirs left, timestamps grouped by day
- Composer: placeholder **Bir şeyler yaz…**, button **Gönder**
- Error: _Mesaj gönderilemedi, tekrar dene._

### 8. Profile edit (`profile`)

- Title **Profilin**, back **‹ Ayarlar**
- Section **FOTOĞRAFLAR**: hint _En fazla 6 fotoğraf. İlk fotoğrafın
  kartında görünür._; a 3×2 grid of slots; **Fotoğraf ekle** (loading
  **Yükleniyor…**); per-photo **Kaldır**; empty text _Henüz fotoğrafın
  yok. En az bir tane eklemeden keşfette görünmezsin._
- Section **HAKKINDA**: multiline field, placeholder **Birkaç cümle yaz…**,
  hint _300 karaktere kadar._
- **Kaydet**; feedback _Kaydedildi._ / _Kaydedilemedi, tekrar dene._

### 9. Settings (`settings`)

- Title **Ayarlar**, back **‹ Keşfet**
- Link **Profilini düzenle ›**
- **Keşif yarıçapı**: preset chips (5, 25, 50, 100, 500 km) with a
  custom value hint _Şu an 80 km (özel değer)._ and the explanation _Bu
  mesafe içindeki kişiler gösterilir. Konumun başkalarına sadece km olarak
  görünür._
- **Konum**: button **Konumu güncelle** (loading **Konum alınıyor…**),
  hint _Konumun ~1 km'lik bir hücreye yuvarlanarak saklanır; kimse tam
  yerini görmez._, feedback _Konumun güncellendi._
- Later: a blocked-people list (design the row now)
- Section **GÜVENLİK** with **Çıkış yap** and the destructive
  **Hesabımı sil** (see §10)

### 10. Safety sheet (component, used on match, chat and settings)

- Section label **GÜVENLİK**
- **Engelle** → confirm sheet: _Elif artık seni göremeyecek, eşleşmeniz ve
  sohbetiniz iki taraftan da kapanacak._ with **Evet, engelle** /
  **Vazgeç**
- **Şikâyet et** → sheet titled **Neden şikâyet ediyorsun?** with reason
  options **Taciz veya hakaret / Spam veya reklam / Sahte profil / Uygunsuz
  içerik / 18 yaşından küçük / Diğer** and after sending: _Şikâyetin alındı ve incelenecek. Bu kişi artık
  keşfette karşına çıkmaz; mesajlaşmayı da kesmek istersen Engelle._
- **Hesabımı sil** → confirm: _Profilin, haritan, eşleşmelerin ve tüm
  mesajların kalıcı olarak silinir. Bu işlem geri alınamaz._ with **Evet,
  hesabımı sil** / **Vazgeç**; loading **Siliniyor…**

### 11. Loading, error and empty states (component)

- Loading: **Yükleniyor…** with a spinner
- Generic error: _Bir şeyler ters gitti, tekrar dene._ + **Tekrar dene**
- Permission error: _Bunu yapmaya iznin yok._

## Components to extract

Design these once and reuse them; they will become the shared components
in the app:

- Big-three chip (label + sign + degree) and the compact badge variant
- Compatibility score (large number + "uyum" label), with a small variant
- "Why" line and aspect row (headline + meaning, expandable)
- Profile card (photo, name/age, distance, bio, badges, score)
- Starter quote card (pinned in chat, hero on match)
- Section label (uppercase, muted)
- Text field, numeric field group (date, time), search field with dropdown
- Segmented choice (gender, interest)
- Primary / secondary / destructive buttons, inline link
- Bottom sheet for confirmations
- Message bubble pair and composer
- Photo grid slot (empty, filled, uploading)
- Banner (informational, error)

## Deliverables

1. Eleven iPhone screens above, dark theme, with their empty, loading and
   error states where listed.
2. A token sheet: colours (background, surface, chip, text, secondary,
   muted, accent, error, success), type scale (display, title, body,
   caption, label), spacing scale, radii.
3. The component set above as reusable pieces.
4. Optional: a light theme pass and a chart wheel illustration.

## What happens with the output

The screens are implemented in `apps/mobile` as React Native components;
tokens land in one file and repeated pieces move to
`apps/mobile/components`. Once that library exists it can be synced back
into Claude Design (`/design-sync`) so later designs use the real
components.
