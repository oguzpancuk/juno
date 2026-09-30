import type { Strings } from './index';

/**
 * The Spanish catalog: a translation of `tr.ts`, key for key. Comments on
 * what a string is for live there; here only what differs in Spanish.
 * Neutral international Spanish with "tú", as the Turkish says "sen": no
 * vosotros, no voseo, no word only one country uses. A match is "match",
 * a like "like", the way Spanish-language dating apps say them.
 */
export const es: Strings = {
  appName: 'Juno',
  welcome: {
    pitch: '¿Qué hay entre\ndos cartas?',
    // Apple's own Spanish title for the button.
    withApple: 'Iniciar sesión con Apple',
    withGoogle: 'Iniciar sesión con Google',
    withEmail: 'Iniciar sesión con correo',
    connecting: 'Conectando…',
  },
  signIn: {
    tagline: 'MIRA LO QUE HAY ENTRE USTEDES',
    passwordLabel: 'Tu contraseña',
    submit: 'Iniciar sesión',
    busy: 'Iniciando sesión…',
    toSignUp: '¿No tienes cuenta? Regístrate',
    title: 'Iniciar sesión',
    emailLabel: 'Tu correo electrónico',
    emailPlaceholder: 'nombre@ejemplo.com',
    back: '‹ Atrás',
    consent:
      'Al continuar, aceptas que tus datos de nacimiento y tu ubicación se traten para calcular la compatibilidad.',
  },
  signUp: {
    title: 'Regístrate',
    submit: 'Regístrate',
    busy: 'Creando tu cuenta…',
    toSignIn: '¿Ya tienes cuenta? Inicia sesión',
    passwordHint: (min: number) => `Al menos ${min} caracteres.`,
    errors: {
      email: 'Escribe un correo electrónico válido.',
      password: (min: number, max: number) =>
        `La contraseña debe tener entre ${min} y ${max} caracteres.`,
    },
  },
  verify: {
    title: 'Escribe el código',
    subtitle: (email: string) =>
      `Enviamos un código de seis dígitos a ${email}.`,
    label: 'Código de verificación',
    placeholder: '••••••',
    submit: 'Verificar',
    busy: 'Verificando…',
    resend: 'Reenviar el código',
    resendIn: (seconds: number) => `Reenviar el código (${seconds} s)`,
    resent: 'Enviamos un código nuevo.',
    notSent:
      'No pudimos enviar un código nuevo ahora. Si tienes un código en tu bandeja de entrada, escríbelo; si no, pide otro en un momento.',
    spamHint:
      'Si no llegó, espera unos segundos y luego revisa la carpeta de spam.',
    wrongAddress:
      '¿Escribiste mal la dirección? Vuelve atrás y regístrate de nuevo.',
    back: '‹ Atrás',
  },
  onboarding: {
    title: 'Tus datos de nacimiento',
    subtitle:
      'Para calcular tu carta hacen falta el lugar, la fecha y la hora. La hora es obligatoria.',
    name: 'Tu nombre',
    gender: 'Tu género',
    genders: {
      woman: 'Mujer',
      man: 'Hombre',
      unspecified: 'Prefiero no decirlo',
    },
    interest: '¿A quién quieres conocer?',
    interests: { women: 'Mujeres', men: 'Hombres', everyone: 'Todo el mundo' },
    consent:
      'Acepto que mis datos de nacimiento se traten para calcular la compatibilidad, y mi ubicación para mostrarme personas cercanas.',
    consentLink: 'Leer el aviso de privacidad',
    city: 'Tu lugar de nacimiento',
    cityPlaceholder: 'Buscar ciudad…',
    date: 'Tu fecha de nacimiento (día / mes / año)',
    time: 'Tu hora de nacimiento (hora : minutos)',
    // día, mes, año; hora, minutos.
    datePlaceholders: {
      day: 'DD',
      month: 'MM',
      year: 'AAAA',
      hour: 'HH',
      minute: 'MM',
    },
    submit: 'Calcular mi carta',
    computing: 'Calculando…',
    errors: {
      name: 'Escribe tu nombre (máximo 40 caracteres).',
      city: 'Elige una ciudad de la lista.',
      date: 'Escribe una fecha válida.',
      time: 'Tu hora de nacimiento es obligatoria (00:00–23:59).',
      underage: 'Juno es para mayores de 18 años.',
      birthInstant:
        'No pudimos calcular tu hora de nacimiento en el servidor. Revisa tu conexión e inténtalo de nuevo.',
      unknownCity:
        'Esta ciudad no está disponible ahora. Elige otra ciudad cercana.',
      consent: 'Marca la casilla para continuar.',
      generic: 'Algo salió mal, inténtalo de nuevo.',
    },
    switchAccount: 'Entrar con otra cuenta',
    accountNote: {
      provider: (provider: string, email: string, link: string) =>
        `Esta cuenta se abrió con ${provider}, con la dirección ${email}. Si antes te registraste con otra dirección, toca “${link}”: esta cuenta vacía se elimina y entras con esa dirección.`,
      relay: (link: string) =>
        `Como Apple ocultó tu correo, esta es una cuenta nueva. Si antes te registraste con tu correo, toca “${link}”: esta cuenta vacía se elimina y entras con esa dirección.`,
    },
    providerNames: { apple: 'Apple', google: 'Google' },
    abandonFailed: (link: string) =>
      `No pudimos eliminar esta cuenta vacía ahora; puede que se haya cortado tu conexión a internet. Si vuelves a tocar “${link}”, solo se cerrará la sesión. Para eliminar la cuenta, más tarde entra de la misma forma y vuelve a tocarlo aquí.`,
    locationHint:
      'Si das permiso de ubicación, las distancias serán más exactas; si no, se usa tu ciudad de nacimiento.',
  },
  chart: {
    title: 'Tu carta natal',
    sun: 'Sol',
    moon: 'Luna',
    rising: 'Ascendente',
    placements: 'TU CARTA DE PRINCIPIO A FIN',
    retrograde: 'R',
    aspects: 'ASPECTOS',
    houseMeaning: (house: number) => `QUÉ SIGNIFICA EN LA CASA ${house}`,
    housesLabel: 'ASCENDENTE Y CASAS',
    risingHasNoHouseTheirs:
      'El Ascendente no está dentro de una casa: es donde empieza la casa 1. Todas las cúspides de la carta se calculan a partir de él.',
    risingHasNoHouse:
      'El Ascendente no está dentro de una casa: es donde empieza tu casa 1. Todas las cúspides de tu carta se calculan a partir de él; por eso tu hora de nacimiento pesa más que nada aquí.',
    fullChart: 'Ver toda tu carta',
    planetsTab: 'Planetas',
    housesTab: 'Casas',
    house: (n: number) => `casa ${n}`,
    orb: (deg: string) => `orbe de ${deg}`,
    noAspects:
      'Tu carta no tiene aspectos mayores; tus planetas funcionan de forma independiente.',
  },
  tabs: {
    profile: 'Perfil',
    discover: 'Descubrir',
    matches: 'Matches',
    unread: (count: number) =>
      count === 1 ? '1 mensaje sin leer' : `${count} mensajes sin leer`,
  },
  discover: {
    openPerson: (
      name: string,
      age: number,
      distance: string,
      liked: string | null,
    ) =>
      `${liked === null ? '' : `${liked}. `}${name}, ${age}, ${distance}. Ver perfil`,
    // The band's name is a label, not always an adjective ("A su propio
    // ritmo"), so it stands after a colon as it is written.
    openDetail: (band: string) =>
      `Compatibilidad: ${band}. Detalle de compatibilidad`,
    swipeLike: 'ME GUSTA',
    swipePass: 'PASO',
    swipeSuper: 'SUPERLIKE',
    scoreLabel: 'compatibilidad',
    like: 'Me gusta',
    pass: 'Pasar',
    superLike: 'Superlike',
    under1km: 'A menos de 1 km',
    empty:
      'Por ahora no queda nadie cerca. Puedes ampliar el radio en los ajustes.',
    noAspect:
      'Estas dos cartas no comparten ningún aspecto; no se puede enviar un like.',
    detail: 'Detalle de compatibilidad',
    likedYou: 'Le gustas',
    likedYouSuper: 'Te dio un superlike',
    noBio: 'Sin descripción',
  },
  match: {
    kicker: 'ES UN MATCH',
    title: (name: string) => `Hiciste match con ${name}`,
    starterLabel: 'PARA ROMPER EL HIELO',
    noStarter: 'Sus cartas no dieron una frase para empezar; pregunta tú algo.',
    summary: 'RESUMEN DE COMPATIBILIDAD',
    elements: 'ELEMENTOS',
    drawn: 'POR QUÉ SE ATRAEN',
    interesting: 'AQUÍ HAY ALGO INTERESANTE',
    dimensions: 'LOS LADOS DEL VÍNCULO',
    overlays: 'EN SUS CASAS',
    overlayTheirs: 'Sus planetas en tus casas',
    overlayYours: 'Tus planetas en sus casas',
    synastryFailed:
      'No se pudo cargar la sección de compatibilidad. Si recargas la página, se vuelve a intentar.',
    moreOverlays: (n: number) => `${n} más ›`,
    fewerOverlays: 'Mostrar menos',
    arrived: {
      title: '¡Es un match!',
      subtitle: (name: string) => `Tu carta y la de ${name} se cruzaron.`,
      see: 'Ver su vínculo',
      notNow: 'Ahora no',
    },
  },
  calculating: {
    title: 'Calculando tu carta',
    steps: [
      'Montando el cielo del momento en que naciste…',
      'Ubicando tus planetas y las cúspides de tus casas…',
      'Leyendo tu carta…',
    ],
    progressLabel: 'Paso del cálculo',
    progress: (n: number, total: number) => `Paso ${n} de ${total}`,
  },
  starter: {
    back: '‹ Chat',
    title: (name: string) => `Empieza a chatear con ${name}`,
    label: 'PARA ROMPER EL HIELO',
    counter: (n: number, total: number) => `${n} / ${total}`,
    hint: 'Puedes enviarlo tal cual o mirar otro aspecto.',
    send: 'Enviar este',
    sending: 'Enviando…',
    another: 'Otro',
    sendFailed: 'No se pudo enviar, inténtalo de nuevo.',
    open: 'Empezar el chat ›',
  },
  matches: {
    newMatches: 'MATCHES NUEVOS',
    noNewMatches: 'Por ahora no hay matches nuevos.',
    noMessages: 'Aún no hay mensajes; te toca la primera pregunta.',
    youPrefix: 'Tú: ',
  },
  profile: {
    edit: 'Editar',
    saving: 'Guardando…',
    moveLeft: 'Mover a la izquierda',
    moveRight: 'Mover a la derecha',
    photosHint: (max: number) =>
      `Máximo ${max} fotos. Tu primera foto aparece en tu tarjeta.`,
    addPhoto: 'Añadir foto',
    adding: 'Subiendo…',
    remove: 'Quitar',
    noPhotos:
      'Aún no tienes fotos. Sin al menos una, no apareces en Descubrir.',
    bioPlaceholder: 'Escribe unas frases…',
    bioHint: (max: number) => `Hasta ${max} caracteres.`,
    save: 'Guardar',
    failed: 'No se pudo guardar, inténtalo de nuevo.',
    photoFailed: 'No se pudo subir la foto, inténtalo de nuevo.',
    details: 'Lo que te describe',
    height: 'Estatura',
    heightAny: 'Prefiero no decirlo',
    heightValue: (cm: number) => `${cm} cm`,
    university: 'Universidad',
    // One short word for a column a third of the card wide.
    universityColumn: 'Estudios',
    occupation: 'Profesión',
    interests: 'Tus intereses',
    interestsHint: (max: number) =>
      `Puedes elegir hasta ${max}. Aparecen en tu perfil.`,
    interestsFull: (max: number) =>
      `Ya elegiste ${max}. Para añadir otro, primero quita uno.`,
    interestsChoose: 'Elige tus intereses',
    interestsNone: 'Ninguno elegido',
    interestSearch: 'Buscar',
    interestSearchEmpty: 'Ningún interés coincide con esta búsqueda.',
    detailsEmpty:
      'La estatura, los intereses, la universidad y la profesión son opcionales; puedes dejarlos en blanco.',
    interestNames: {
      music: 'Música',
      live_music: 'Música en vivo',
      dancing: 'Baile',
      cinema: 'Cine',
      series: 'Series',
      books: 'Libros',
      poetry: 'Poesía',
      art: 'Arte',
      photography: 'Fotografía',
      theatre: 'Teatro',
      travel: 'Viajes',
      camping: 'Acampar',
      hiking: 'Senderismo',
      sea: 'El mar',
      skiing: 'Esquí',
      cycling: 'Ciclismo',
      running: 'Correr',
      gym: 'Gimnasio',
      yoga: 'Yoga',
      pilates: 'Pilates',
      football: 'Fútbol',
      basketball: 'Baloncesto',
      cooking: 'Cocinar',
      coffee: 'Café',
      wine: 'Vino',
      brunch: 'Brunch',
      street_food: 'Comida callejera',
      cats: 'Gatos',
      dogs: 'Perros',
      plants: 'Plantas',
      board_games: 'Juegos de mesa',
      video_games: 'Videojuegos',
      technology: 'Tecnología',
      astrology: 'Astrología',
      meditation: 'Meditación',
      volunteering: 'Voluntariado',
    },
  },
  safety: {
    title: 'SEGURIDAD',
    block: 'Bloquear',
    blockConfirmTitle: 'Sí, bloquear',
    blockConfirm: (name: string) =>
      `${name} ya no podrá verte, y el match y el chat se cerrarán para las dos partes.`,
    report: 'Denunciar',
    reportTitle: '¿Por qué denuncias este perfil?',
    reasons: {
      harassment: 'Acoso o insultos',
      spam: 'Spam o publicidad',
      fake_profile: 'Perfil falso',
      nudity: 'Contenido inapropiado',
      underage: 'Menor de 18 años',
      other: 'Otro motivo',
    },
    reported:
      'Recibimos tu denuncia y la revisaremos. Esta persona ya no te aparecerá en Descubrir; si también quieres dejar de recibir sus mensajes, bloquéala.',
    cancel: 'Cancelar',
    failed: 'No se pudo completar, inténtalo de nuevo.',
    deleteAccount: 'Eliminar mi cuenta',
    deleteTitle: 'Sí, eliminar mi cuenta',
    deleteConfirm:
      'Tu perfil, tu carta, tus matches y todos tus mensajes se eliminan para siempre. Esto no se puede deshacer.',
    deleting: 'Eliminando…',
    deleteFailed: 'No se pudo eliminar la cuenta, inténtalo de nuevo.',
  },
  chat: {
    backToMatches: '‹ Matches',
    backToMatchesLabel: 'Volver a los matches',
    tabThread: 'Chat',
    tabMatch: 'Compatibilidad',
    read: 'Leído',
    reply: 'Responder',
    cancelReply: 'Cancelar respuesta',
    you: 'Tú',
    replyUnavailable: 'Un mensaje anterior',
    placeholder: 'Escribe algo…',
    send: 'Enviar',
    sendFailed: 'No se pudo enviar el mensaje, inténtalo de nuevo.',
    open: 'Abrir el chat ›',
  },
  person: {
    openProfile: (name: string) => `Abrir el perfil de ${name}`,
    chartTitle: (name: string) => `Carta de ${name}`,
    fullChart: 'Ver toda su carta',
  },
  filters: {
    title: 'Ajustes de búsqueda',
    age: 'Rango de edad',
    ageMin: 'Edad mínima',
    ageMax: 'Edad máxima',
    ageHint:
      'No te mostramos a quienes están fuera de este rango; y si tú estás fuera del suyo, no te ven.',
    minBand: 'Compatibilidad mínima',
    anyBand: 'Todas',
    minBandHint:
      'Los perfiles por debajo del nivel que elijas no aparecen en Descubrir. Un nivel bajo no significa un mal match; solo quiere decir que sus cartas se cruzan en pocos puntos.',
    elements: 'Elemento del Sol',
    elementsHint:
      'Si no eliges ninguno, se muestran todos. No es una medida de compatibilidad, sino una preferencia.',
    elementNames: {
      fire: 'Fuego',
      earth: 'Tierra',
      air: 'Aire',
      water: 'Agua',
    },
    failed: 'No se pudo guardar, inténtalo de nuevo.',
    unanswered:
      'La conexión no respondió; volvimos a cargar el ajuste guardado.',
    sort: 'Orden',
    sortDistance: 'Cercanía',
    sortCompatibility: 'Compatibilidad',
    sortHint:
      'Las tarjetas empiezan por la persona más cercana. Con Premium puedes empezar por la de mayor compatibilidad.',
    sortHintPremium:
      'Tú eliges en qué orden llegan tus tarjetas: primero las personas más cercanas o las de mayor compatibilidad.',
  },
  settings: {
    title: 'Ajustes',
    premium: 'Membresía Premium',
    backLabel: 'Volver a los ajustes',
    signOut: 'Cerrar sesión',
    radius: 'Radio de búsqueda',
    radiusHint:
      'Te mostramos a las personas dentro de esta distancia; quién te ve a ti lo decide su propio radio. Nadie más ve tu ubicación, solo una distancia en km.',
    location: 'Ubicación',
    updateLocation: 'Actualizar ubicación',
    locating: 'Obteniendo tu ubicación…',
    locationUpdated: 'Tu ubicación se actualizó.',
    locationDenied:
      'No se pudo obtener tu ubicación. Activa el permiso en Ajustes e inténtalo de nuevo; tu ubicación guardada no cambió.',
    locationFailed: 'No se pudo guardar tu ubicación, inténtalo de nuevo.',
    locationHint:
      'Tu ubicación se guarda redondeada a una celda de unos 1 km; nadie ve dónde estás exactamente.',
    language: 'Idioma',
    languageDevice: 'Idioma del dispositivo',
    languageHint:
      'Juno usa el idioma de tu dispositivo, a menos que elijas uno aquí.',
  },
  premium: {
    title: 'Membresía Premium',
    kicker: 'JUNO PREMIUM',
    pitch: 'Descubrir tan amplio como tu carta.',
    benefits: (dailyLikes: number, superLikes: number) => [
      'Likes ilimitados',
      `${superLikes} superlikes por semana`,
      'Mira a quién le gustas',
      'Ordena las tarjetas por compatibilidad',
      `Con la membresía gratuita tienes ${dailyLikes} likes al día.`,
    ],
    buy: 'Hazte Premium',
    buying: 'Activando…',
    failed: 'No se pudo activar Premium, inténtalo de nuevo.',
    active: 'Tu membresía Premium está activa.',
    since: (date: string) => `Eres Premium desde el ${date}.`,
    noPayment:
      'Todavía no hay un paso de pago: por ahora eres Premium en cuanto tocas.',
    lockedLikes:
      'Se acabaron tus likes de hoy. Con Premium tienes likes ilimitados.',
    lockedSuper: 'Los superlikes son exclusivos de Premium.',
    lockedSuperSpent: 'Se acabaron tus superlikes de esta semana.',
    lockedSort: 'Ordenar por compatibilidad es exclusivo de Premium.',
    open: 'Ver Premium',
  },
  likedMe: {
    openPerson: (name: string) => `${name}. Abrir en Descubrir`,
    title: 'A quién le gustas',
    open: 'A quién le gustas',
    openCount: (n: number) =>
      `A quién le gustas, ${n} ${n === 1 ? 'persona' : 'personas'}`,
    empty: 'Todavía no le gustas a nadie. Sigue descubriendo.',
    lockedTitle: (n: number) =>
      n === 1 ? 'Le gustas a una persona' : `Le gustas a ${n} personas`,
    lockedHint: 'Ver quiénes son y darles like es exclusivo de Premium.',
    superBadge: 'Superlike',
    likeBack: 'Me gusta',
    passBack: 'Pasar',
    failed: 'No se pudo completar, inténtalo de nuevo.',
    today: 'Hoy',
    yesterday: 'Ayer',
    daysAgo: (n: number) => `Hace ${n} días`,
  },
  blocked: {
    open: 'Personas bloqueadas',
    title: 'Personas bloqueadas',
    hint: 'Si desbloqueas a alguien, el match y los mensajes anteriores vuelven para las dos partes.',
    empty: 'No bloqueaste a nadie.',
    undo: 'Desbloquear',
  },
  legal: {
    open: 'Privacidad y licencias',
    updated: (date: string) => `Última actualización: ${date}`,
    translationNote:
      'Esta es una traducción al español para tu comodidad. La versión vinculante es el texto en turco.',
    showOriginal: 'Leer el original en turco',
    showTranslation: 'Volver a la traducción',
  },
  common: {
    loading: 'Cargando…',
    retry: 'Reintentar',
    close: 'Cerrar',
    backGlyph: '‹',
  },
  errors: {
    generic: 'Algo salió mal, inténtalo de nuevo.',
    weakPassword:
      'La contraseña es muy débil. Prueba una más larga o más variada.',
    invalidCredentials: 'El correo o la contraseña no son correctos.',
    accountExists:
      'Ya hay una cuenta con este correo. Prueba a iniciar sesión.',
    emailNotConfirmed:
      'Tu correo todavía no está verificado. Revisa tu bandeja de entrada.',
    mailNotSent:
      'No pudimos enviar el correo de verificación ahora. Inténtalo de nuevo en un momento; si sigue fallando, prueba con otra dirección o escribe a destek@juno-dating.com.',
    otpInvalid:
      'El código no es correcto o caducó. Pide uno nuevo y úsalo antes de diez minutos.',
    emailInvalid: 'El correo electrónico no parece válido.',
    rateLimited: 'Lo intentaste demasiadas veces, espera un poco.',
    alreadyExists: 'Esto ya existe.',
    invalidData: 'No se aceptaron los datos que escribiste, revísalos.',
    notAllowed: 'No tienes permiso para hacer esto.',
    providerFailed:
      'No se pudo completar el inicio de sesión. Inténtalo de nuevo o continúa con tu correo.',
  },
};
