/** All Turkish UI strings in one place (PRD: single-language, one file). */
export const t = {
  appName: 'Juno',
  welcome: {
    pitch: 'İki haritanın\narasında\nne var?',
    withApple: 'Apple ile giriş yap',
    withGoogle: 'Google ile giriş yap',
    haveAccount: 'Zaten hesabın var mı? Giriş yap',
    withEmail: 'E-posta ile devam et',
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
    locationHint:
      'Konum izni verirsen mesafeler daha doğru olur; vermezsen doğum şehrin kullanılır.',
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
    openPerson: (name: string, age: number, distance: string) =>
      `${name}, ${age}, ${distance}. Profili gör`,
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
  },
  safety: {
    title: 'GÜVENLİK',
    block: 'Engelle',
    blockConfirmTitle: 'Evet, engelle',
    blockConfirm: (name: string) =>
      `${name} artık seni göremeyecek, eşleşmeniz ve sohbetiniz iki taraftan da kapanacak.`,
    report: 'Şikâyet et',
    reportTitle: 'Neden şikâyet ediyorsun?',
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
    // The header control: the glyph alone, with its own spoken label.
    backGlyph: '‹',
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
    // Inside the sheet, from blocked people or the privacy text.
    back: '‹ Ayarlar',
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
  },
  common: { loading: 'Yükleniyor…', retry: 'Tekrar dene', close: 'Kapat' },
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
