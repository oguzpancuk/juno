/** All Turkish UI strings in one place (PRD: single-language, one file). */
export const t = {
  appName: 'Juno',
  welcome: {
    pitch: 'İki haritanın\narasında ne var,\nonu gör.',
    withApple: 'Apple ile giriş yap',
    withGoogle: 'Google ile giriş yap',
    haveAccount: 'Zaten hesabın var mı? Giriş yap',
    withEmail: 'E-posta ile devam et',
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
    // Only when the auth project confirms addresses by mail: the account
    // exists but there is no session until the mail is acted on.
    confirmSent:
      'Hesabın açıldı. E-postana gelen doğrulama adımını tamamla, sonra giriş yap.',
    errors: {
      email: 'Geçerli bir e-posta adresi gir.',
      password: (min: number, max: number) =>
        `Parola en az ${min}, en fazla ${max} karakter olmalı.`,
    },
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
    orb: (deg: string) => `${deg} orb`,
    noAspects:
      'Haritanda majör açı yok; gezegenlerin birbirinden bağımsız çalışıyor.',
  },
  tabs: { profile: 'Profil', discover: 'Keşfet', matches: 'Eşleşmeler' },
  discover: {
    openProfile: 'Profili gör',
    // The stamps a drag reveals. Pre-uppercased: RN textTransform maps
    // Turkish i → I, not İ.
    swipeLike: 'BEĞEN',
    swipePass: 'GEÇ',
    // No number reaches the screen (ADR-0009 §3): the band word does.
    scoreLabel: 'uyum',
    like: 'Beğen',
    pass: 'Geç',
    under1km: '1 km altı',
    empty:
      'Yakınlarda şimdilik kimse kalmadı. Yarıçapı ayarlardan genişletebilirsin.',
    noAspect:
      'Bu iki harita arasında ortak bir açı yok; beğeni gönderilemiyor.',
    detail: 'Uyum detayı',
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
  },
  calculating: {
    title: 'Haritan hesaplanıyor',
    steps: [
      'Doğduğun andaki gökyüzü kuruluyor…',
      'Gezegenler ve ev sınırların çıkarılıyor…',
      'Haritan okunuyor…',
    ],
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
    // Settings is the only way in, and the control goes back there.
    back: '‹ Ayarlar',
    title: 'Keşif ayarları',
    age: 'Yaş aralığı',
    ageHint:
      'Bu aralığın dışındakiler sana gösterilmez; sen de onların aralığının dışındaysan onlara görünmezsin.',
    minBand: 'En az uyum',
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
    open: 'Keşif ayarları ›',
    failed: 'Kaydedilemedi, tekrar dene.',
  },
  settings: {
    title: 'Ayarlar',
    signOut: 'Çıkış yap',
    back: '‹ Profil',
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
  blocked: {
    open: 'Engellediklerin',
    back: '‹ Ayarlar',
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
    emailInvalid: 'E-posta adresi geçersiz görünüyor.',
    rateLimited: 'Çok sık denedin, biraz bekle.',
    alreadyExists: 'Bu kayıt zaten var.',
    invalidData: 'Girdiğin bilgiler kabul edilmedi, kontrol et.',
    notAllowed: 'Bunu yapmaya iznin yok.',
  },
} as const;
