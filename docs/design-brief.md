# Juno — design brief for Claude Design

<!-- Regenerated 2026-09-11, after ROADMAP C2–C6. Three screens changed
     shape under the PRD amendment of 2026-09-10 and
     docs/adr/0009-presentation.md: the chart screen leads with six
     product-language cards, no compatibility score is ever printed as a
     number, and the match screen is a band plus two aspect sections. The
     strings below are the ones in apps/mobile/lib/strings.ts as shipped. -->

Paste the "Prompt" section into a new Claude Design project, then feed the
rest of this file as context. Everything below is derived from
`docs/PRD.md`, `docs/ROADMAP.md` and the shipped screens; the UI strings
are the exact ones in `apps/mobile/lib/strings.ts`. Keep the text as is —
the app is Turkish-only and every string is already reviewed.

## Prompt

> Design the complete mobile UI for **Juno**, a Turkish dating app
> whose whole point is astrology done properly: users enter birth place,
> date and time; the app computes their real natal chart, explains it in
> plain language, shows what is happening between two charts, and gives
> matched pairs a chart-based first message so nobody has to open with
> "selam".
>
> Two rules govern every decision. **The chart is the hero, the photo is
> the context** — astrology is not a badge under a photograph here. And
> **show the calculation, soften the conclusion** — the real aspect, the
> real orb to the arcminute, stay on screen, while what is drawn from them
> is written as a tendency, never as a verdict or a measurement. There is
> no compatibility percentage anywhere in this product, by decision.
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
city, date and time → see your natal chart (six product-language cards, with
the ten planets, houses and aspects one tap behind them, all explained in
Turkish) → add photos and
a bio → swipe through people within a radius, each with a compatibility
band and a one-line "why" → on a mutual like, a match screen shows the
band, the sides of the connection, why you are drawn to each other, where
it gets interesting, and a conversation starter → text chat with that
starter pinned on top. Block, report and
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
  / _Juno 18 yaş ve üzeri içindir._
- Footer link **Farklı bir hesapla gir**

### 3. Natal chart (`chart`)

The user's own chart, and the screen where the product's first rule shows
most: the chart is the hero. It leads with six editorial cards, not a
ten-row report. Everything else is one tap away and stays there.

- Title **Doğum haritan**, name underneath
- Section **BÜYÜK ÜÇLÜN**: three chips **Güneş / Ay / Yükselen**, each with
  a sign name (e.g. "Akrep"). This trio is also the badge on every profile
  card.
- **Six cards, in this order.** Each has a product-language title, the
  astrology underneath it in a quieter weight, then a 1–2 sentence Turkish
  reading. This hierarchy is the design problem on this screen: the title
  must read first, the astrology must stay visible, and neither may look
  like a subtitle of the other.

  | Title                        | Second line         | Example reading                              |
  | ---------------------------- | ------------------- | -------------------------------------------- |
  | **Çekirdek benlik**          | Güneş Yengeç'te     | "Kimliğin duygudan ve aidiyetten örülür…"    |
  | **Duygusal dünya**           | Ay Kova'da          | "Duygularını mesafeden gözlemler…"           |
  | **İlk izlenim**              | Yükselen İkizler'de | "Meraklı, konuşkan ve hareketli görünürsün…" |
  | **Nasıl düşünürsün**         | Merkür Yengeç'te    | "Duyguyla düşünür, hafızayla konuşursun…"    |
  | **Nasıl seversin**           | Venüs Yengeç'te     | "Sevgin koruyucu ve besleyicidir…"           |
  | **Seni ne harekete geçirir** | Mars Başak'ta       | "Hareket tarzın titiz ve ölçülü…"            |

- Disclosure **Tüm haritanı gör** / **Haritayı kapat**. Opened, it reveals
  the old depth and nothing is lost: section **GEZEGENLER** with ten rows
  (planet, sign, degree, house "7. ev", retrograde **R**, then the
  sign and house readings), and section **AÇILAR** with rows like
  "Güneş kare Ay · 2°06′ orb" and a meaning. Empty state: _Haritanda majör
  açı yok; gezegenlerin birbirinden bağımsız çalışıyor._
- A chart wheel illustration is welcome but optional; the six cards are the
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
  Yükselen with sign); **the compatibility band** — a word beside a
  four-step meter, with the small label **uyum** under it; one-line why,
  e.g. _Ay'ın onun Venüs'üyle üçgen yapıyor._ Fallback why:
  _Haritalarınız birbirine değmiyor._
- **There is no score number anywhere in this product.** The four band
  words are **Kendi ritminde**, **Dengeli**, **Belirgin**, **Nadir**, and
  the meter is four bars of rising height with the first N filled. It must
  stay comparable at a glance between two cards — that is the one job a
  number did well — without implying that two adjacent pairs can be told
  apart. Precision has to match confidence.
- Toggle **Uyum detayı** / **Detayı gizle** expands: the band's sentence,
  **BAĞLANTININ TARAFLARI** as up to five small chips (axis name over a
  label: "Duygusal bağ / Kolay yakınlık", "Kimya / Manyetik", "Anlaşma /
  Farklı diller", "Zemin / Sağlam", "Devinim / Dönüştüren"), **Elementler**
  with two lines, then 1–4 aspect rows each with a headline and a meaning.
  A chip is absent, never shown at a low value, when that dimension has no
  aspect behind it.
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
- Section **UYUM ÖZETİ**: the band word in display size (no number),
  then its one-sentence summary, then **BAĞLANTININ TARAFLARI** as the
  five chips.
- Section **NEDEN BİRBİRİNİZE ÇEKİLİYORSUNUZ**: up to three aspect cards.
  Each card is a title ("Kolay yakınlık", "Aynı tempo", "Doğal kimya"),
  then the astrology with its orb ("Ay'ın onun Venüs'üyle kavuşuyor ·
  2°10′ orb"), then the meaning. Show the calculation, soften the
  conclusion — the orb is deliberately visible.
- Section **BURASI İLGİNÇ**: exactly one card, same shape, for a tense
  aspect ("Ayrı yollardan", "Farklı zihinler", "Yüklü kimya"). It must not
  read as a warning: same weight, same colour, no red. A square is a
  dynamic, not a fault. **Either section is omitted with its heading when
  there is nothing to show** — never padded, never filled with a verdict.
- Section **EVLERİNİZDE**: one card by default, the rest behind
  **N tane daha ›** / **Daha az göster**. Card title is the house's
  meaning ("Ortaklık", "Yakınlık ve yoğunluk", "Söylenmeyen"), body names
  the placement ("Onun Güneş'i senin 8. evinde: …").
- Section **ELEMENTLER**: two lines.
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
- Compatibility band (word + four-step meter), with a small variant
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
