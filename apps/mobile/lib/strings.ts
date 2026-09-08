/** All Turkish UI strings in one place (PRD: single-language, one file). */
export const t = {
  appName: 'stardate',
  signIn: {
    title: 'Giriş yap',
    emailLabel: 'E-posta adresin',
    emailPlaceholder: 'ornek@eposta.com',
    sendCode: 'Kod gönder',
    codeLabel: 'E-postana gelen 6 haneli kod',
    verify: 'Doğrula',
    sending: 'Gönderiliyor…',
    resend: 'Kodu tekrar gönder',
    consent:
      'Devam ederek doğum bilgilerinin ve konumunun uyum hesaplamak için işlenmesini kabul edersin.',
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
      underage: 'stardate 18 yaş ve üzeri içindir.',
      generic: 'Bir şeyler ters gitti, tekrar dene.',
    },
    locationHint:
      'Konum izni verirsen mesafeler daha doğru olur; vermezsen doğum şehrin kullanılır.',
  },
  chart: {
    title: 'Doğum haritan',
    bigThree: 'Üçlün',
    sun: 'Güneş',
    moon: 'Ay',
    rising: 'Yükselen',
    planets: 'Gezegenler',
    house: 'ev',
    retrograde: 'R',
    signOut: 'Çıkış yap',
  },
  common: { loading: 'Yükleniyor…' },
} as const;
