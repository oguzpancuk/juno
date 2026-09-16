# Giriş kurulumu — sahibinin yapacakları

<!-- Written 2026-09-16, when the sign-up code started being mailed for real
     and the Apple/Google buttons stopped being placeholders. Everything in
     the repository is done; what is left here needs an account, a card or a
     domain, so it is the owner's to do. Turkish, because it is a checklist
     the owner reads, not code. -->

Kodun tarafı bitti. Burada kalanlar bir hesap, bir alan adı ya da bir
ödeme gerektirdiği için sende: hepsi panolarda tıklanan adımlar. Sırayla
git; her başlığın sonunda "bittiğini nasıl anlarsın" var.

Hiçbir gizli değer bu depoya girmez. Aşağıda **gizli** diye işaretli olan
her şey (Resend API anahtarı, Google client secret, Apple key dosyası)
yalnızca Supabase panosunda yaşar. `.env` dosyasına yalnızca **public**
işaretli client ID'ler yazılır ve `.env` zaten `.gitignore`'da.

---

## 0. Dev build (önce bu)

Apple ve Google girişi yerel (native) modüllerle çalışıyor, dolayısıyla
uygulama artık **Expo Go'da açılmıyor**. Bir kere kendi build'ini alman
gerekiyor; sonrasında her kod değişikliği yine anında yansır.

```bash
npx expo run:ios
```

**Bu adım 2026-09-16'da bu makinede bir kere yapıldı** — simülatörde Juno
kurulu ve çalışıyor. Yeniden alman gereken tek an, `app.config.ts`'i
etkileyen bir değişiklikten sonra; aşağıda Google ve Apple bölümleri bunu
ayrıca söylüyor.

- CocoaPods gerekiyor. `pod --version` çalışmıyorsa: `brew install cocoapods`.
- Kabuğunda UTF-8 yoksa `pod install` anlamsız bir Ruby hatasıyla ölüyor
  (`Unicode Normalization ... ASCII-8BIT`). Çaresi: komutun başına
  `LANG=en_US.UTF-8`.
- İlk derleme 10–20 dakika sürer; sonrakiler saniyeler.
- Simülatörde beliren uygulama artık "Expo Go" değil, "Juno".
- `bash contracts/init.sh` yerel Supabase + Metro'yu ayağa kaldırmaya devam
  ediyor; tek fark simülatöre `exp://` ile değil, kurulu Juno uygulamasını
  açarak bağlanman.

**Bitti mi:** simülatörde Juno açılıyor ve karşılama ekranı geliyor.

---

## 1. E-posta: kodun gerçekten gitmesi

Supabase'in kendi gönderici servisi saatte 2 mail atar ve yalnızca proje
üyelerine ulaşır — üretimde kullanılamaz. Kendi SMTP'n gerekiyor. Seçimin
Resend'di.

### 1a. Alan adı

Mailin spam'e düşmemesi için gönderen adresin kendi alan adında olmalı
(`hesap@juno.app` gibi). Alan adın yoksa önce onu al.

### 1b. Resend

1. [resend.com](https://resend.com) → hesap aç.
2. **Domains → Add Domain** → alan adını yaz.
3. Resend'in verdiği DNS kayıtlarını (MX/TXT — SPF ve DKIM) alan adının DNS
   panosuna ekle. DMARC kaydını da ekle; Gmail 2024'ten beri toplu
   gönderende arıyor:
   `_dmarc` TXT → `v=DMARC1; p=none; rua=mailto:hesap@<alanadın>`
4. Resend'de domain **Verified** olana kadar bekle (genelde dakikalar).
5. **API Keys → Create API Key** → "Juno auth", yetki _Sending access_.
   Bu anahtar **gizli**; bir daha gösterilmez, hemen Supabase'e yapıştır.

### 1c. Supabase panosu

Hosted proje henüz yok — varsa oluştur (bölge: EU, `docs/ROADMAP.md`
TestFlight maddesi). Sonra:

1. **Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: Resend API anahtarı (**gizli**)
   - Sender email: `hesap@<alanadın>`
   - Sender name: `Juno`
2. **Authentication → Sign In / Providers → Email**
   - _Confirm email_: **açık**
   - _Email OTP length_: `6`
   - _Email OTP expiration_: `600` saniye
   - _Minimum password length_: `8`
   - Bu üçü `supabase/config.toml` ile aynı olmalı; ayrı düşerlerse
     uygulama altı hane isteyip sunucu başka bir şey bekler.
3. **Authentication → Rate Limits → Emails per hour**: SMTP planına göre
   (Resend ücretsiz planı ayda 3.000, günde 100). `config.toml` yerelde 100
   diyor; üretimde kendi rakamını yaz.
4. **Authentication → Emails → Confirm signup**
   - Subject: `Juno doğrulama kodun`
   - Body: `supabase/templates/verification_code.html` içeriğini yapıştır.
     Şablon `{{ .Token }}` render ediyor — yani link değil, altı haneli kod.
     Linkli varsayılan şablon kalırsa uygulamadaki kod ekranı boşa bekler.

> Panoya tıklamak yerine depodan da gönderilebilir: projeyi
> `npx supabase link` ile bağla, `supabase/config.toml` içindeki
> `[auth.email.smtp]` bloğunu yorumdan çıkar, `RESEND_API_KEY` değişkenini
> ver ve `npx supabase config push` çalıştır. Ayarların depoda kayıtlı
> kalması iyi, ama **aynı sonuç değil**: `config push` bütün `[auth]`
> bölümünü gönderir, yani yereldeki Mailpit'e göre ayarlanmış iki değeri de
> üretime taşır ve bu belgede elle girdiğin değerlerin üzerine yazar:
>
> - `max_frequency = "1s"` → üretimde `"60s"` yap. Kalırsa uygulamadaki 60
>   saniyelik sayaç arkasız kalır; bir betik doğrulanmamış herhangi bir
>   adrese saniyede bir mail attırıp Resend kotanı bitirebilir.
> - `email_sent = 100` → SMTP planına uyan rakamı yaz.
>
> İkisini düzeltmeden `config push` çalıştırma.

**Bitti mi:** kendi adresinle kaydol; mail gelen kutuna (spam'e değil)
düşüyor, içindeki altı haneyi ekrana yazınca hesap açılıyor.

---

## 2. Google ile giriş

Üç ayrı client ID var ve hangisinin nereye gittiği karışıyor — tablo
aşağıda.

### 2a. Google Cloud

1. [console.cloud.google.com](https://console.cloud.google.com) → yeni
   proje: "Juno".
2. **APIs & Services → OAuth consent screen**
   - User type: External
   - Uygulama adı: Juno, destek e-postası, logo, ana sayfa ve gizlilik
     politikası adresi (gizlilik metni yayına alınınca — `docs/ROADMAP.md`
     KVKK maddesi)
   - Scope: `email`, `profile`, `openid` — fazlası doğrulama gerektirir
   - Yayına almadan önce kendini _Test users_ listesine ekle
3. **Credentials → Create Credentials → OAuth client ID**, üç kere:

   | Tip             | Ne verirsin                                                                 | Ne alırsın                                         | Nereye gider                                        |
   | --------------- | --------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- |
   | Web application | Authorized redirect URI: `https://<proje-ref>.supabase.co/auth/v1/callback` | Client ID (**public**) + Client secret (**gizli**) | ID → `.env` + Supabase; secret → yalnız Supabase    |
   | iOS             | Bundle ID: `com.oguzpancuk.juno`                                            | Client ID (**public**)                             | `.env` ve Supabase'in _Authorized Client IDs_ alanı |
   | Android (sonra) | Package: `com.oguzpancuk.juno` + EAS'ten SHA‑1                              | Client ID (**public**)                             | Supabase'in _Authorized Client IDs_ alanı           |

   Android'i ilk Android build'ine kadar erteleyebilirsin.

### 2b. Supabase panosu

**Authentication → Sign In / Providers → Google**: aç.

- _Client ID_: **web** client ID (iOS'unki değil — token'ın hedef kitlesi
  budur)
- _Client Secret_: web client secret
- _Authorized Client IDs_: iOS client ID (ve varsa Android'inki), virgülle
  ayrı. **Bu alan boş kalırsa telefondaki Google girişi "invalid audience"
  ile reddedilir** — yerel SDK'nın ürettiği token iOS client'ı için
  imzalanmıştır.

### 2c. Uygulama

`apps/mobile/.env` (yoksa `.env.example`'ı kopyala):

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios client id>.apps.googleusercontent.com
```

Sonra **dev build'i yeniden al** (`npx expo run:ios`): iOS'un Google'dan
geri dönerken kullandığı URL şeması bu değerden türetiliyor ve derlemeye
gömülüyor. Değişken yokken uygulama Google düğmesini hiç göstermez — bu
kasıtlı, arkası boş bir düğme yerine hiç düğme.

**Bitti mi:** karşılama ekranında "Google ile giriş yap" beliriyor,
dokununca Google hesap seçici açılıyor ve dönüşte doğum bilgileri ekranına
giriyorsun.

---

## 3. Apple ile giriş

App Store Review 4.8: üçüncü taraf girişi (Google) sunuyorsan Sign in with
Apple da sunmak zorundasın. TestFlight'a çıkmadan önce bitmeli.

1. **Apple Developer Program üyeliği** (yıllık $99) — yoksa önce o.
2. [developer.apple.com](https://developer.apple.com) → **Certificates,
   Identifiers & Profiles → Identifiers** → `com.oguzpancuk.juno` App ID'sini
   oluştur ya da düzenle → **Sign In with Apple** yeteneğini işaretle.
   (Entitlement uygulama tarafında zaten var: `app.config.ts`
   `usesAppleSignIn`.)
3. Supabase panosu → **Authentication → Sign In / Providers → Apple**: aç.
   - _Authorized Client IDs_: `com.oguzpancuk.juno`
   - Telefondaki yerel giriş için **Services ID, Team ID ve key dosyasına
     gerek yok**; onlar yalnız tarayıcı akışı için gerekir ve bu üründe
     tarayıcı akışı Apple için kapalı (`lib/oauth.ts`).
4. Dev build'i yeniden al — entitlement derlemeye giriyor.
5. Simülatörde denemek için simülatörün **Settings → Sign in to your
   iPhone** adımından bir Apple hesabına giriş yapmış olması gerekiyor;
   aksi halde düğme görünür ama Apple sayfası boş gelir.

**Bitti mi:** gerçek bir cihazda (ya da iCloud'a girilmiş bir simülatörde)
"Apple ile giriş yap" → Face ID → doğum bilgileri ekranı.

---

## 4. Web istemcisi (isteğe bağlı, sonra)

Web'de Apple yok, Google tarayıcı yönlendirmesiyle çalışıyor. Yayınlanınca:

**Authentication → URL Configuration → Redirect URLs** listesine web
sürümünün adresini ekle (örn. `https://juno.app`). Listede olmayan bir
adrese Supabase kimseyi geri göndermez.

Web build'ini alırken `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` de ortamda
olmalı. Tarayıcı akışı o değeri kullanmıyor (client ID Supabase panosunda
duruyor), ama uygulama "Google düğmesini göster" kararını ona bakarak
veriyor — kural her platformda aynı: client ID'si olmayan build'de Google
düğmesi yok.

---

## Sırayla, kısa liste

- [ ] `brew install cocoapods` (gerekiyorsa) ve `npx expo run:ios`
- [ ] Alan adı + Resend domain doğrulaması (SPF, DKIM, DMARC)
- [ ] Hosted Supabase projesi (EU) — yoksa oluştur, ref'i
      `docs/NOTES.md`'ye yaz
- [ ] Supabase SMTP ayarları + Confirm email açık + kod şablonu
- [ ] Google Cloud: consent screen + web/iOS client'ları
- [ ] Supabase Google sağlayıcısı (web ID + secret + Authorized Client IDs)
- [ ] `apps/mobile/.env` içine iki client ID, sonra yeniden build
- [ ] Apple Developer üyeliği + App ID'de Sign In with Apple
- [ ] Supabase Apple sağlayıcısı (Authorized Client IDs: bundle ID)
- [ ] Web yayındaysa Redirect URLs
