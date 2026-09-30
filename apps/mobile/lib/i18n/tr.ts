/**
 * Every Turkish UI string, in one place: the source catalog.
 *
 * Turkish is the language the app is written in and every other catalog
 * (`en.ts`, …) is a translation of this one. Their type is this object's
 * shape (`Strings` in `./index.ts`), so a translation that misses a key,
 * adds one, or gives a function other parameters does not compile, and
 * `catalogs.test.ts` checks what the compiler cannot: lists of the same
 * length and nothing left in Turkish. A new string is added here first,
 * with a comment saying where it shows and why it reads as it does, and
 * then to every translation; the comments live here only.
 */
export const tr = {
  appName: 'Juno',
  welcome: {
    pitch: 'İki haritanın arasında\nne var?',
    // The web's Apple button only; on iOS the system button titles itself.
    // Apple's own Turkish name for the feature, capitals included
    // (apple.com/tr/legal/privacy/data/tr/sign-in-with-apple).
    withApple: 'Apple ile Giriş Yap',
    withGoogle: 'Google ile giriş yap',
    withEmail: 'E-posta ile giriş yap',
    connecting: 'Bağlanıyor…',
  },
  signIn: {
    // Pre-uppercased: RN textTransform maps Turkish i → I, not İ.
    tagline: 'ARANIZDAKİNİ GÖR',
    passwordLabel: 'Parolan',
    submit: 'Giriş yap',
    busy: 'Giriş yapılıyor…',
    toSignUp: 'Hesabın yok mu? Kaydol',
    title: 'Giriş yap',
    emailLabel: 'E-posta adresin',
    emailPlaceholder: 'ornek@eposta.com',
    back: '‹ Geri',
    consent:
      'Devam ederek doğum bilgilerinin ve konumunun uyum hesaplamak için işlenmesini kabul edersin.',
  },
  signUp: {
    title: 'Kaydol',
    submit: 'Kaydol',
    busy: 'Hesap açılıyor…',
    toSignIn: 'Zaten hesabın var mı? Giriş yap',
    passwordHint: (min: number) => `En az ${min} karakter.`,
    errors: {
      email: 'Geçerli bir e-posta adresi gir.',
      password: (min: number, max: number) =>
        `Parola en az ${min}, en fazla ${max} karakter olmalı.`,
    },
  },
  /**
   * The code screen. It stands between `signUp` and a session: the account
   * exists, the address is not confirmed yet, and nothing else in the app
   * is reachable until the code from the mail is typed here.
   */
  verify: {
    title: 'Kodu gir',
    subtitle: (email: string) =>
      `${email} adresine altı haneli bir kod gönderdik.`,
    label: 'Doğrulama kodu',
    placeholder: '••••••',
    submit: 'Doğrula',
    busy: 'Doğrulanıyor…',
    resend: 'Kodu tekrar gönder',
    resendIn: (seconds: number) => `Kodu tekrar gönder (${seconds} sn)`,
    resent: 'Yeni kod gönderildi.',
    // When the server refuses to send one. It refuses both for a mail it
    // sent moments ago and because the project has sent too many this
    // hour, and the two leave the person in different places — one has a
    // code, the other has none — so the sentence claims neither.
    notSent:
      'Şu an yeni kod gönderemedik. Gelen kutunda kod varsa onu yaz, yoksa birazdan tekrar iste.',
    spamHint: 'Gelmediyse birkaç saniye bekle, sonra spam klasörüne bak.',
    wrongAddress: 'Adresi yanlış mı yazdın? Geri dön, baştan kaydol.',
    back: '‹ Geri',
  },
  onboarding: {
    title: 'Doğum bilgilerin',
    subtitle:
      'Haritanı çıkarmak için yer, tarih ve saat gerekiyor. Saat zorunlu.',
    name: 'Adın',
    gender: 'Cinsiyetin',
    genders: {
      woman: 'Kadın',
      man: 'Erkek',
      unspecified: 'Belirtmek istemiyorum',
    },
    interest: 'Kiminle tanışmak istersin?',
    interests: { women: 'Kadınlar', men: 'Erkekler', everyone: 'Herkes' },
    consent:
      'Doğum bilgilerimin uyum hesaplamak, konumumun ise yakındaki kişileri göstermek için işlenmesini kabul ediyorum.',
    consentLink: 'Gizlilik metnini oku',
    city: 'Doğum yerin',
    cityPlaceholder: 'Şehir ara…',
    date: 'Doğum tarihin (gün / ay / yıl)',
    time: 'Doğum saatin (saat : dakika)',
    // What the date and time fields show while empty: the letters of the
    // units, the way the language abbreviates them (gün, ay, yıl; saat,
    // dakika).
    datePlaceholders: {
      day: 'GG',
      month: 'AA',
      year: 'YYYY',
      hour: 'SS',
      minute: 'DD',
    },
    submit: 'Haritamı çıkar',
    computing: 'Hesaplanıyor…',
    errors: {
      name: 'Adını yaz (en fazla 40 karakter).',
      city: 'Listeden bir şehir seç.',
      date: 'Geçerli bir tarih gir.',
      time: 'Doğum saatin gerekli (00:00–23:59).',
      underage: 'Juno 18 yaş ve üzeri içindir.',
      birthInstant:
        'Doğum saatin sunucuda hesaplanamadı. Bağlantını kontrol edip tekrar dene.',
      unknownCity:
        'Bu şehir şu an kullanılamıyor. Yakınındaki başka bir şehri seç.',
      consent: 'Devam etmek için onay kutusunu işaretle.',
      generic: 'Bir şeyler ters gitti, tekrar dene.',
    },
    switchAccount: 'Farklı bir hesapla gir',
    // Onboarding is the one screen a person who meant their old account
    // reaches instead, when Apple or Google carried a different address
    // (ADR-0013). An account a provider was linked onto hears neither.
    accountNote: {
      // `link` is `switchAccount` itself, so the sentence cannot name a
      // link that has been reworded. Tapping it deletes the account: it
      // holds a provider's identity and nothing else (ADR-0013).
      provider: (provider: string, email: string, link: string) =>
        `Bu hesap ${provider} ile, ${email} adresiyle açıldı. Daha önce başka bir adresle kaydolduysan “${link}” bağlantısına dokun: bu boş hesap silinir ve o adresle giriş yaparsın.`,
      relay: (link: string) =>
        `Apple e-posta adresini gizlediği için bu yeni bir hesap. Daha önce e-postayla kaydolduysan “${link}” bağlantısına dokun: bu boş hesap silinir ve o adresle giriş yaparsın.`,
    },
    providerNames: { apple: 'Apple', google: 'Google' },
    // The delete could not be done; the next tap on `link` only signs out.
    abandonFailed: (link: string) =>
      `Bu boş hesap şu an silinemedi; internet bağlantın kopmuş olabilir. “${link}” bağlantısına yeniden dokunursan yalnızca çıkış yapılır. Hesabı silmek için daha sonra aynı yolla girip buraya yeniden dokunabilirsin.`,
    locationHint:
      'Konum izni verirsen mesafeler daha doğru olur; vermezsen doğum şehrin kullanılır.',
  },
  /**
   * Re-consent (KVKK): the screen a member meets when the privacy notice
   * changed after they accepted it (lib/consent.ts). The rest of the app
   * waits behind it. Declining is leaving: withdrawing consent is deleting
   * the account, as the notice itself says, and signing out only puts the
   * question off to the next sign-in.
   */
  reconsent: {
    title: 'Gizlilik metni güncellendi',
    body: (date: string) =>
      `Kişisel verilerini nasıl işlediğimizi anlatan metin ${date} tarihinde değişti. Devam etmek için güncel metni okuyup onaylaman gerekiyor.`,
    agree:
      'Güncel gizlilik metnini okudum; doğum bilgilerimin ve konumumun bu metinde yazan amaçlarla işlenmesini kabul ediyorum.',
    submit: 'Onayla ve devam et',
    busy: 'Kaydediliyor…',
    failed: 'Onayın kaydedilemedi. Bağlantını kontrol edip tekrar dene.',
    declineTitle: 'Onaylamak istemiyor musun?',
    decline:
      'Rızanı geri almak hesabını silmek demek: profilin, haritan, eşleşmelerin ve mesajların silinir. Yalnızca çıkış yaparsan bir sonraki girişinde bu ekran yeniden açılır.',
  },
  chart: {
    title: 'Doğum haritan',
    sun: 'Güneş',
    moon: 'Ay',
    rising: 'Yükselen',
    placements: 'HARİTA BAŞTAN SONA',
    retrograde: 'R',
    aspects: 'AÇILAR',
    // The profile leads with three placements; the other three and the
    // rest of the chart are behind the popup (PRD amendment 2026-09-10,
    // owner 2026-09-11).
    // Pre-uppercased: RN textTransform maps Turkish i → I, not İ.
    houseMeaning: (house: number) => `${house}. EVDE NE ANLAMA GELİYOR`,
    housesLabel: 'YÜKSELEN VE EVLER',
    risingHasNoHouseTheirs:
      'Yükselen bir evin içinde değil: 1. evin başlangıcı. Haritadaki bütün ev sınırları ondan hesaplanır.',
    risingHasNoHouse:
      'Yükselen bir evin içinde değil: 1. evin başlangıcı. Haritandaki bütün ev sınırları ondan hesaplanır, o yüzden doğum saatin en çok burayı etkiler.',
    fullChart: 'Tüm haritanı gör',
    /** The full chart's two tables (sheet frame 08). */
    planetsTab: 'Gezegenler',
    housesTab: 'Evler',
    house: (n: number) => `${n}. ev`,
    orb: (deg: string) => `${deg} orb`,
    noAspects:
      'Haritanda majör açı yok; gezegenlerin birbirinden bağımsız çalışıyor.',
  },
  tabs: {
    profile: 'Profil',
    discover: 'Keşfet',
    matches: 'Eşleşmeler',
    // What VoiceOver adds to the tab while the badge shows a count.
    unread: (count: number) => `${count} okunmamış mesaj`,
  },
  discover: {
    // What VoiceOver reads for the photo and for the band. A label takes
    // the place of the text inside a button, so it carries what is drawn
    // there first, then what a tap does.
    openPerson: (
      name: string,
      age: number,
      distance: string,
      // What the badge over the name says, when there is one. It has to
      // be in here: a label replaces everything drawn inside the button,
      // so a badge left out of it is a badge VoiceOver never reads
      // (review, 2026-09-23). First, because it is drawn first.
      liked: string | null,
    ) =>
      `${liked === null ? '' : `${liked}. `}${name}, ${age}, ${distance}. Profili gör`,
    openDetail: (band: string) => `${band} uyum. Uyum detayı`,
    // The stamps a drag reveals. Pre-uppercased: RN textTransform maps
    // Turkish i → I, not İ.
    swipeLike: 'BEĞEN',
    swipePass: 'GEÇ',
    swipeSuper: 'SÜPER',
    // No number reaches the screen (ADR-0009 §3): the band word does.
    scoreLabel: 'uyum',
    like: 'Beğen',
    pass: 'Geç',
    superLike: 'Süper beğen',
    under1km: '1 km altı',
    empty:
      'Yakınlarda şimdilik kimse kalmadı. Yarıçapı ayarlardan genişletebilirsin.',
    noAspect:
      'Bu iki harita arasında ortak bir açı yok; beğeni gönderilemiyor.',
    detail: 'Uyum detayı',
    // The badge over the name, for somebody who has already chosen you
    // (owner, 2026-09-23). Only a premium member ever sees one: the view
    // sends null to everybody else, because who has liked you is what
    // the membership sells.
    likedYou: 'Seni beğendi',
    likedYouSuper: 'Seni süper beğendi',
    // In the bio's box on a card whose person wrote none (owner,
    // 2026-09-24: "hakkinda yazilmamis gibi bir placeholder yazsin").
    // Said about them, so a reader cannot take it for their own words.
    noBio: 'Hakkında yazılmamış',
    // What is left of a quota is not drawn anywhere (owner, 2026-09-23:
    // "kac begeni kaldigi gozukmesin, sadece bitince engel olunsun"), so
    // the three lines that counted it down are gone. The sentences for a
    // quota that has run out are in `premium`, where the membership
    // sheet reads them.
  },
  match: {
    // Pre-uppercased: RN textTransform maps Turkish i → I, not İ.
    kicker: 'EŞLEŞTİNİZ',
    title: (name: string) => `${name} ile eşleştin`,
    starterLabel: 'SOHBET BAŞLATICIN',
    noStarter: 'Haritalarınız bir başlangıç cümlesi vermedi; sen bir şey sor.',
    summary: 'UYUM ÖZETİ',
    elements: 'ELEMENTLER',
    drawn: 'NEDEN BİRBİRİNİZE ÇEKİLİYORSUNUZ',
    interesting: 'BURASI İLGİNÇ',
    dimensions: 'BAĞLANTININ TARAFLARI',
    overlays: 'EVLERİNİZDE',
    overlayTheirs: 'Onun gezegenleri senin evlerinde',
    overlayYours: 'Senin gezegenlerin onun evlerinde',
    synastryFailed:
      'Uyum bölümü yüklenemedi. Sayfayı yenilersen tekrar denenir.',
    moreOverlays: (n: number) => `${n} tane daha ›`,
    fewerOverlays: 'Daha az göster',
    /** The moment a match lands (sheet frame 09); owner review pending. */
    arrived: {
      title: 'Eşleştiniz!',
      subtitle: (name: string) => `${name} ile haritalarınız kesişti.`,
      see: 'Bağlantınızı gör',
      notNow: 'Şimdi değil',
    },
  },
  calculating: {
    title: 'Haritan hesaplanıyor',
    steps: [
      'Doğduğun andaki gökyüzü kuruluyor…',
      'Gezegenler ve ev sınırların çıkarılıyor…',
      'Haritan okunuyor…',
    ],
    /** What a screen reader calls the bar under the steps, and its value. */
    progressLabel: 'Hesaplama adımı',
    progress: (n: number, total: number) => `${total} adımdan ${n}. adım`,
  },
  starter: {
    back: '‹ Sohbet',
    title: (name: string) => `${name} ile sohbeti başlat`,
    label: 'SOHBET BAŞLATICIN',
    counter: (n: number, total: number) => `${n} / ${total}`,
    hint: 'Olduğu gibi gönderebilir ya da başka bir açıya bakabilirsin.',
    send: 'Bunu gönder',
    sending: 'Gönderiliyor…',
    another: 'Başka bir tane',
    sendFailed: 'Gönderilemedi, tekrar dene.',
    open: 'Sohbeti başlat ›',
  },
  matches: {
    // Pre-uppercased: RN textTransform maps Turkish i → I, not İ.
    newMatches: 'YENİ EŞLEŞMELER',
    noNewMatches: 'Şimdilik yeni eşleşme yok.',
    noMessages: 'Henüz mesaj yok; başlangıç sorusu sende.',
    youPrefix: 'Sen: ',
  },
  profile: {
    edit: 'Düzenle',
    saving: 'Kaydediliyor…',
    moveLeft: 'Sola al',
    moveRight: 'Sağa al',
    photosHint: (max: number) =>
      `En fazla ${max} fotoğraf. İlk fotoğrafın kartında görünür.`,
    addPhoto: 'Fotoğraf ekle',
    adding: 'Yükleniyor…',
    remove: 'Kaldır',
    noPhotos:
      'Henüz fotoğrafın yok. En az bir tane eklemeden keşfette görünmezsin.',
    bioPlaceholder: 'Birkaç cümle yaz…',
    bioHint: (max: number) => `${max} karaktere kadar.`,
    save: 'Kaydet',
    failed: 'Kaydedilemedi, tekrar dene.',
    photoFailed: 'Fotoğraf yüklenemedi, tekrar dene.',
    /** The four optional fields (owner, 2026-09-21). */
    details: 'Seni anlatanlar',
    height: 'Boy',
    heightAny: 'Belirtmek istemiyorum',
    heightValue: (cm: number) => `${cm} cm`,
    university: 'Üniversite',
    /**
     * The same field's label where it is one of three columns across a
     * card. "Üniversite" is one word and the column is a third of the
     * card, so on a 375pt phone it breaks mid-word as soon as the system
     * text size goes up a step — and a kicker that reads "Üniversit / e"
     * over its value is worse than the shorter word the owner uses for
     * it himself ("okul da gozukmeli", 2026-09-23).
     */
    universityColumn: 'Okul',
    occupation: 'Meslek',
    interests: 'İlgi alanların',
    interestsHint: (max: number) =>
      `En fazla ${max} tane seçebilirsin. Profilinde görünür.`,
    interestsFull: (max: number) =>
      `${max} tanesini seçtin. Başka bir tane için önce birini çıkar.`,
    /**
     * The picker's own strings. The tags are not on the edit page any
     * more (owner, 2026-09-23: "boşken hiçbir şey gözükmesin ama
     * tıklanınca bir popup açılsın, orada hepsi gözüksün; arama da
     * popuptan yapılsın") — the box there opens this sheet, and these
     * name it for a screen reader, which has no border to go by.
     */
    interestsChoose: 'İlgi alanlarını seç',
    interestsNone: 'Hiçbiri seçilmedi',
    interestSearch: 'Ara',
    interestSearchEmpty: 'Bu aramayla eşleşen ilgi alanı yok.',
    detailsEmpty:
      'Boy, ilgi alanların, üniversite ve meslek isteğe bağlı; boş bırakabilirsin.',
    interestNames: {
      music: 'Müzik',
      live_music: 'Canlı müzik',
      dancing: 'Dans',
      cinema: 'Sinema',
      series: 'Dizi',
      books: 'Kitap',
      poetry: 'Şiir',
      art: 'Sanat',
      photography: 'Fotoğraf',
      theatre: 'Tiyatro',
      travel: 'Seyahat',
      camping: 'Kamp',
      hiking: 'Doğa yürüyüşü',
      sea: 'Deniz',
      skiing: 'Kayak',
      cycling: 'Bisiklet',
      running: 'Koşu',
      gym: 'Spor salonu',
      yoga: 'Yoga',
      pilates: 'Pilates',
      football: 'Futbol',
      basketball: 'Basketbol',
      cooking: 'Yemek yapmak',
      coffee: 'Kahve',
      wine: 'Şarap',
      brunch: 'Brunch',
      street_food: 'Sokak lezzetleri',
      cats: 'Kediler',
      dogs: 'Köpekler',
      plants: 'Bitkiler',
      board_games: 'Kutu oyunları',
      video_games: 'Video oyunları',
      technology: 'Teknoloji',
      astrology: 'Astroloji',
      meditation: 'Meditasyon',
      volunteering: 'Gönüllülük',
    },
  },
  safety: {
    title: 'GÜVENLİK',
    block: 'Engelle',
    blockConfirmTitle: 'Evet, engelle',
    blockConfirm: (name: string) =>
      `${name} artık seni göremeyecek, eşleşmeniz ve sohbetiniz iki taraftan da kapanacak.`,
    report: 'Şikâyet et',
    reportTitle: 'Neden şikâyet ediyorsun?',
    /** The `report_reason` enum's values, as the report sheet lists them. */
    reasons: {
      harassment: 'Taciz veya hakaret',
      spam: 'Spam veya reklam',
      fake_profile: 'Sahte profil',
      nudity: 'Uygunsuz içerik',
      underage: '18 yaşından küçük',
      other: 'Diğer',
    },
    reported:
      'Şikâyetin alındı ve incelenecek. Bu kişi artık keşfette karşına çıkmaz; mesajlaşmayı da kesmek istersen Engelle.',
    cancel: 'Vazgeç',
    failed: 'İşlem tamamlanamadı, tekrar dene.',
    deleteAccount: 'Hesabımı sil',
    deleteTitle: 'Evet, hesabımı sil',
    deleteConfirm:
      'Profilin, haritan, eşleşmelerin ve tüm mesajların kalıcı olarak silinir. Bu işlem geri alınamaz.',
    deleting: 'Siliniyor…',
    deleteFailed: 'Hesap silinemedi, tekrar dene.',
  },
  chat: {
    backToMatches: '‹ Eşleşmeler',
    backToMatchesLabel: 'Eşleşmelere dön',
    tabThread: 'Sohbet',
    tabMatch: 'Uyum',
    read: 'Okundu',
    reply: 'Yanıtla',
    cancelReply: 'Yanıtlamaktan vazgeç',
    you: 'Sen',
    replyUnavailable: 'Önceki bir mesaj',
    placeholder: 'Bir şeyler yaz…',
    send: 'Gönder',
    sendFailed: 'Mesaj gönderilemedi, tekrar dene.',
    open: 'Sohbeti aç ›',
  },
  // Someone else, wherever they are shown: the deck's profile sheet and
  // the chat header's. There is no person *page* any more (owner,
  // 2026-09-14: the deck opens a popup), so nothing here names a screen.
  person: {
    openProfile: (name: string) => `${name} profilini aç`,
    chartTitle: (name: string) => `${name} haritası`,
    fullChart: 'Tüm haritasını gör',
  },
  filters: {
    title: 'Keşif ayarları',
    age: 'Yaş aralığı',
    ageMin: 'En küçük yaş',
    ageMax: 'En büyük yaş',
    ageHint:
      'Bu aralığın dışındakiler sana gösterilmez; sen de onların aralığının dışındaysan onlara görünmezsin.',
    minBand: 'En az uyum',
    // The lowest band as a minimum: it filters nobody out.
    anyBand: 'Hepsi',
    minBandHint:
      'Seçtiğin bandın altındaki eşleşmeler keşfette çıkmaz. Düşük bir bant kötü bir eşleşme demek değil, sadece haritalarınızın az noktada kesiştiği anlamına gelir.',
    elements: 'Güneş elementi',
    elementsHint:
      'Hiçbirini seçmezsen hepsi gösterilir. Bu bir uyum ölçüsü değil, bir tercih.',
    elementNames: {
      fire: 'Ateş',
      earth: 'Toprak',
      air: 'Hava',
      water: 'Su',
    },
    failed: 'Kaydedilemedi, tekrar dene.',
    // A write that got no answer may still have landed; the panel reads the
    // stored row back instead of reverting.
    unanswered: 'Bağlantı yanıt vermedi; kayıtlı ayar yeniden yüklendi.',
    sort: 'Sıralama',
    sortDistance: 'Yakınlık',
    sortCompatibility: 'Uyum',
    sortHint:
      'Kartlar sana en yakın kişiden başlayarak gelir. Premium ile uyumu en yüksek kişiden başlatabilirsin.',
    sortHintPremium:
      'Kartların hangi sırayla geleceğini sen seçersin: en yakındakiler ya da uyumu en yüksek olanlar.',
  },
  settings: {
    title: 'Ayarlar',
    premium: 'Premium üyelik',
    // The sheet's chevron, from blocked people, the privacy text or the
    // membership page.
    backLabel: 'Ayarlara dön',
    signOut: 'Çıkış yap',
    radius: 'Keşif yarıçapı',
    radiusHint:
      'Bu mesafe içindeki kişiler sana gösterilir; seni kimlerin göreceğini onların yarıçapı belirler. Konumun başkalarına sadece km olarak görünür.',
    location: 'Konum',
    updateLocation: 'Konumu güncelle',
    locating: 'Konum alınıyor…',
    locationUpdated: 'Konumun güncellendi.',
    locationDenied:
      'Konum alınamadı. Ayarlardan izni açıp tekrar dene; şimdilik kayıtlı konumun değişmedi.',
    locationFailed: 'Konum kaydedilemedi, tekrar dene.',
    locationHint:
      'Konumun ~1 km’lik bir hücreye yuvarlanarak saklanır; kimse tam yerini görmez.',
    /**
     * The language row and the page it opens. Each language is listed in
     * its own name (`LANGUAGE_NAMES`), so these three are the only words
     * of it that follow the current language.
     */
    language: 'Dil',
    languageDevice: 'Cihazın dili',
    languageHint: 'Burada bir dil seçmezsen Juno cihazının dilini kullanır.',
  },
  /**
   * The membership and the two screens it opens. There is no price and no
   * payment step yet (owner, 2026-09-21), so nothing here names a sum or
   * a period — "al" makes you premium in that tap.
   */
  premium: {
    title: 'Premium üyelik',
    kicker: 'JUNO PREMIUM',
    pitch: 'Haritan kadar geniş bir keşif.',
    benefits: (dailyLikes: number, superLikes: number) => [
      'Sınırsız beğeni',
      `Haftada ${superLikes} süper beğeni`,
      'Seni beğenenleri gör',
      'Kartları uyuma göre sırala',
      `Ücretsiz üyelikte günde ${dailyLikes} beğeni hakkın var.`,
    ],
    buy: 'Premium ol',
    buying: 'Açılıyor…',
    failed: 'Premium açılamadı, tekrar dene.',
    active: 'Premium üyeliğin açık.',
    since: (date: string) => `${date} tarihinden beri premium üyesin.`,
    noPayment:
      'Ödeme adımı henüz yok: şimdilik dokunduğun anda premium oluyorsun.',
    /** The upsell shown where a free member meets a premium-only thing. */
    lockedLikes:
      'Bugünkü beğeni hakkın bitti. Premium ile sınırsız beğenebilirsin.',
    lockedSuper: 'Süper beğeni premium üyelere özel.',
    lockedSuperSpent: 'Bu haftaki süper beğenilerin bitti.',
    lockedSort: 'Uyuma göre sıralama premium üyelere özel.',
    open: 'Premium’a bak',
  },
  likedMe: {
    /** A row on the list: what a tap on the person does. */
    openPerson: (name: string) => `${name}. Keşfette aç`,
    title: 'Seni beğenenler',
    /** The chip on the deck, and what VoiceOver reads on it. */
    open: 'Seni beğenenler',
    openCount: (n: number) => `Seni beğenenler, ${n} kişi`,
    empty: 'Henüz kimse seni beğenmedi. Keşfetmeye devam et.',
    lockedTitle: (n: number) =>
      n === 1 ? 'Bir kişi seni beğendi' : `${n} kişi seni beğendi`,
    lockedHint:
      'Kimler olduğunu görmek ve hepsini tek tek beğenmek premium üyelere özel.',
    superBadge: 'Süper beğeni',
    likeBack: 'Beğen',
    passBack: 'Geç',
    failed: 'İşlem tamamlanamadı, tekrar dene.',
    /** How long ago the like landed; days, because the list is not a feed. */
    today: 'Bugün',
    yesterday: 'Dün',
    daysAgo: (n: number) => `${n} gün önce`,
  },
  blocked: {
    open: 'Engellediklerin',
    title: 'Engellediklerin',
    hint: 'Engeli kaldırırsan eşleşmeniz ve eski yazışmanız iki tarafta da geri gelir.',
    empty: 'Kimseyi engellemedin.',
    undo: 'Engeli kaldır',
  },
  legal: {
    open: 'Gizlilik ve lisanslar',
    updated: (date: string) => `Son güncelleme: ${date}`,
    /**
     * Above a translated notice, never above the Turkish one: the Turkish
     * text is the one the member consents to and the one that binds, and
     * a translation says so first.
     */
    translationNote:
      'Bu metin, kolaylık için sunulan bir çeviridir. Bağlayıcı olan Türkçe metindir.',
    /** The link under that note, and back. */
    showOriginal: 'Türkçe aslını göster',
    showTranslation: 'Çeviriyi göster',
  },
  common: {
    loading: 'Yükleniyor…',
    retry: 'Tekrar dene',
    close: 'Kapat',
    // The chat header's and every sheet's way back: the glyph alone, with
    // its own spoken label beside it at each call site.
    backGlyph: '‹',
  },
  errors: {
    generic: 'Bir şeyler ters gitti, tekrar dene.',
    weakPassword:
      'Parola çok zayıf. Daha uzun ya da daha karışık bir parola dene.',
    invalidCredentials: 'E-posta ya da parola yanlış.',
    accountExists: 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.',
    emailNotConfirmed:
      'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.',
    // The provider refused to deliver the code. Nothing the person typed
    // is wrong, so the sentence must not sound as though it were, and the
    // one thing that sometimes helps — a different address — is named.
    mailNotSent:
      'Doğrulama e-postası şu an gönderilemedi. Birazdan tekrar dene; sürerse başka bir adresle dene ya da destek@juno-dating.com adresine yaz.',
    // One sentence for two cases because GoTrue answers both with
    // `otp_expired` and "Token has expired or is invalid": a code that was
    // never issued and a code that ran out are the same 403 (probed
    // against the local stack, 2026-09-16).
    otpInvalid:
      'Kod yanlış ya da süresi dolmuş. Yeni bir kod iste, on dakika içinde kullan.',
    emailInvalid: 'E-posta adresi geçersiz görünüyor.',
    rateLimited: 'Çok sık denedin, biraz bekle.',
    alreadyExists: 'Bu kayıt zaten var.',
    invalidData: 'Girdiğin bilgiler kabul edilmedi, kontrol et.',
    notAllowed: 'Bunu yapmaya iznin yok.',
    // Apple or Google refused, or answered with something unusable. The
    // person did nothing wrong and e-mail is still open to them, so the
    // sentence points there rather than explaining an OAuth failure.
    providerFailed:
      'Giriş tamamlanamadı. Tekrar dene ya da e-posta ile devam et.',
  },
} as const;
