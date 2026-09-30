import { ordinalEn } from '@juno/astro';
import type { Strings } from './index';

/**
 * The English catalog: a translation of `tr.ts`, key for key. Comments on
 * what a string is for live there; here only what differs in English.
 * US English, the way Apple's and Google's own English buttons read.
 */
export const en: Strings = {
  appName: 'Juno',
  welcome: {
    pitch: 'What lies between\ntwo charts?',
    // Apple's own English title for the button.
    withApple: 'Sign in with Apple',
    withGoogle: 'Sign in with Google',
    withEmail: 'Sign in with email',
    connecting: 'Connecting…',
  },
  signIn: {
    tagline: 'SEE WHAT’S BETWEEN YOU',
    passwordLabel: 'Your password',
    submit: 'Sign in',
    busy: 'Signing in…',
    toSignUp: 'Don’t have an account? Sign up',
    title: 'Sign in',
    emailLabel: 'Your email',
    emailPlaceholder: 'name@example.com',
    back: '‹ Back',
    consent:
      'By continuing, you agree to your birth details and location being processed to calculate compatibility.',
  },
  signUp: {
    title: 'Sign up',
    submit: 'Sign up',
    busy: 'Creating your account…',
    toSignIn: 'Already have an account? Sign in',
    passwordHint: (min: number) => `At least ${min} characters.`,
    errors: {
      email: 'Enter a valid email address.',
      password: (min: number, max: number) =>
        `Your password must be ${min} to ${max} characters long.`,
    },
  },
  verify: {
    title: 'Enter the code',
    subtitle: (email: string) => `We sent a six-digit code to ${email}.`,
    label: 'Verification code',
    placeholder: '••••••',
    submit: 'Verify',
    busy: 'Verifying…',
    resend: 'Send the code again',
    resendIn: (seconds: number) => `Send the code again (${seconds}s)`,
    resent: 'A new code is on its way.',
    notSent:
      'We couldn’t send a new code just now. If there’s a code in your inbox, enter it; if not, ask again in a moment.',
    spamHint:
      'If it hasn’t arrived, wait a few seconds, then check your spam folder.',
    wrongAddress: 'Typed the wrong address? Go back and sign up again.',
    back: '‹ Back',
  },
  onboarding: {
    title: 'Your birth details',
    subtitle:
      'Your chart needs a place, a date and a time. The time is required.',
    name: 'Your name',
    gender: 'Your gender',
    genders: {
      woman: 'Woman',
      man: 'Man',
      unspecified: 'Prefer not to say',
    },
    interest: 'Who would you like to meet?',
    interests: { women: 'Women', men: 'Men', everyone: 'Everyone' },
    consent:
      'I agree to my birth details being processed to calculate compatibility, and my location to show people nearby.',
    consentLink: 'Read the privacy notice',
    city: 'Your birthplace',
    cityPlaceholder: 'Search for a city…',
    date: 'Your date of birth (day / month / year)',
    time: 'Your time of birth (hour : minute)',
    datePlaceholders: {
      day: 'DD',
      month: 'MM',
      year: 'YYYY',
      hour: 'HH',
      minute: 'MM',
    },
    submit: 'Draw my chart',
    computing: 'Calculating…',
    errors: {
      name: 'Enter your name (40 characters at most).',
      city: 'Pick a city from the list.',
      date: 'Enter a valid date.',
      time: 'Your time of birth is required (00:00–23:59).',
      underage: 'Juno is for people 18 and over.',
      birthInstant:
        'The server couldn’t work out your time of birth. Check your connection and try again.',
      unknownCity:
        'This city isn’t available right now. Pick another city near it.',
      consent: 'Tick the box to continue.',
      generic: 'Something went wrong. Try again.',
    },
    switchAccount: 'Use a different account',
    accountNote: {
      provider: (provider: string, email: string, link: string) =>
        `This account was opened with ${provider}, using ${email}. If you signed up with a different address before, tap “${link}”: this empty account is deleted and you sign in with that address.`,
      relay: (link: string) =>
        `Apple hid your email address, so this is a new account. If you signed up with email before, tap “${link}”: this empty account is deleted and you sign in with that address.`,
    },
    providerNames: { apple: 'Apple', google: 'Google' },
    abandonFailed: (link: string) =>
      `This empty account couldn’t be deleted just now; your connection may have dropped. Tapping “${link}” again only signs you out. To delete the account, sign in the same way later and tap it here again.`,
    locationHint:
      'If you allow location access, distances are more accurate; if not, your birth city is used.',
  },
  chart: {
    title: 'Your birth chart',
    sun: 'Sun',
    moon: 'Moon',
    rising: 'Rising',
    placements: 'YOUR CHART, START TO FINISH',
    retrograde: 'R',
    aspects: 'ASPECTS',
    houseMeaning: (house: number) =>
      `WHAT THE ${ordinalEn(house).toUpperCase()} HOUSE MEANS`,
    housesLabel: 'RISING AND HOUSES',
    risingHasNoHouseTheirs:
      'The Ascendant isn’t inside a house: it is where the 1st house begins. Every house boundary in the chart is calculated from it.',
    risingHasNoHouse:
      'The Ascendant isn’t inside a house: it is where your 1st house begins. Every house boundary in your chart is calculated from it, which is why your time of birth matters most here.',
    fullChart: 'See your full chart',
    planetsTab: 'Planets',
    housesTab: 'Houses',
    house: (n: number) => `${ordinalEn(n)} house`,
    orb: (deg: string) => `${deg} orb`,
    noAspects:
      'Your chart has no major aspects; your planets work independently of each other.',
  },
  tabs: {
    profile: 'Profile',
    discover: 'Discover',
    matches: 'Matches',
    unread: (count: number) =>
      count === 1 ? '1 unread message' : `${count} unread messages`,
  },
  discover: {
    openPerson: (
      name: string,
      age: number,
      distance: string,
      liked: string | null,
    ) =>
      `${liked === null ? '' : `${liked}. `}${name}, ${age}, ${distance}. View profile`,
    openDetail: (band: string) =>
      `${band} compatibility. Compatibility details`,
    swipeLike: 'LIKE',
    swipePass: 'PASS',
    swipeSuper: 'SUPER',
    scoreLabel: 'compatibility',
    like: 'Like',
    pass: 'Pass',
    superLike: 'Super like',
    under1km: 'Under 1 km',
    empty:
      'No one else is nearby for now. You can widen your radius in settings.',
    noAspect: 'These two charts share no aspect, so a like can’t be sent.',
    detail: 'Compatibility details',
    likedYou: 'Liked you',
    likedYouSuper: 'Super liked you',
    noBio: 'No bio yet',
  },
  match: {
    kicker: 'IT’S A MATCH',
    title: (name: string) => `You matched with ${name}`,
    starterLabel: 'YOUR CONVERSATION STARTER',
    noStarter:
      'Your charts didn’t offer an opening line; ask them something yourself.',
    summary: 'COMPATIBILITY SUMMARY',
    elements: 'ELEMENTS',
    drawn: 'WHY YOU’RE DRAWN TO EACH OTHER',
    interesting: 'THIS IS INTERESTING',
    dimensions: 'SIDES OF YOUR CONNECTION',
    overlays: 'IN YOUR HOUSES',
    overlayTheirs: 'Their planets in your houses',
    overlayYours: 'Your planets in their houses',
    synastryFailed:
      'The compatibility section couldn’t load. Refresh the page to try again.',
    moreOverlays: (n: number) => `${n} more ›`,
    fewerOverlays: 'Show less',
    arrived: {
      title: 'It’s a match!',
      subtitle: (name: string) => `Your chart and ${name}’s cross paths.`,
      see: 'See your connection',
      notNow: 'Not now',
    },
  },
  calculating: {
    title: 'Calculating your chart',
    steps: [
      'Setting up the sky at the moment you were born…',
      'Working out your planets and house cusps…',
      'Reading your chart…',
    ],
    progressLabel: 'Calculation step',
    progress: (n: number, total: number) => `Step ${n} of ${total}`,
  },
  starter: {
    back: '‹ Chat',
    title: (name: string) => `Start the chat with ${name}`,
    label: 'YOUR CONVERSATION STARTER',
    counter: (n: number, total: number) => `${n} / ${total}`,
    hint: 'Send it as it is, or look at another aspect.',
    send: 'Send this',
    sending: 'Sending…',
    another: 'Another one',
    sendFailed: 'Couldn’t send. Try again.',
    open: 'Start the chat ›',
  },
  matches: {
    newMatches: 'NEW MATCHES',
    noNewMatches: 'No new matches for now.',
    noMessages: 'No messages yet; the first question is yours.',
    youPrefix: 'You: ',
  },
  profile: {
    edit: 'Edit',
    saving: 'Saving…',
    moveLeft: 'Move left',
    moveRight: 'Move right',
    photosHint: (max: number) =>
      `Up to ${max} photos. Your first photo appears on your card.`,
    addPhoto: 'Add a photo',
    adding: 'Uploading…',
    remove: 'Remove',
    noPhotos:
      'You have no photos yet. You won’t appear in Discover until you add at least one.',
    bioPlaceholder: 'Write a few sentences…',
    bioHint: (max: number) => `Up to ${max} characters.`,
    save: 'Save',
    failed: 'Couldn’t save. Try again.',
    photoFailed: 'Couldn’t upload the photo. Try again.',
    details: 'About you',
    height: 'Height',
    heightAny: 'Prefer not to say',
    heightValue: (cm: number) => `${cm} cm`,
    university: 'University',
    universityColumn: 'School',
    occupation: 'Job',
    interests: 'Your interests',
    interestsHint: (max: number) =>
      `Pick up to ${max}. They appear on your profile.`,
    interestsFull: (max: number) =>
      `You’ve picked ${max}. Remove one before adding another.`,
    interestsChoose: 'Choose your interests',
    interestsNone: 'None selected',
    interestSearch: 'Search',
    interestSearchEmpty: 'No interests match this search.',
    detailsEmpty:
      'Height, interests, university and job are optional; you can leave them blank.',
    interestNames: {
      music: 'Music',
      live_music: 'Live music',
      dancing: 'Dancing',
      cinema: 'Movies',
      series: 'TV series',
      books: 'Books',
      poetry: 'Poetry',
      art: 'Art',
      photography: 'Photography',
      theatre: 'Theater',
      travel: 'Travel',
      camping: 'Camping',
      hiking: 'Hiking',
      sea: 'The sea',
      skiing: 'Skiing',
      cycling: 'Cycling',
      running: 'Running',
      gym: 'Gym',
      yoga: 'Yoga',
      pilates: 'Pilates',
      football: 'Soccer',
      basketball: 'Basketball',
      cooking: 'Cooking',
      coffee: 'Coffee',
      wine: 'Wine',
      brunch: 'Brunch',
      street_food: 'Street food',
      cats: 'Cats',
      dogs: 'Dogs',
      plants: 'Plants',
      board_games: 'Board games',
      video_games: 'Video games',
      technology: 'Technology',
      astrology: 'Astrology',
      meditation: 'Meditation',
      volunteering: 'Volunteering',
    },
  },
  safety: {
    title: 'SAFETY',
    block: 'Block',
    blockConfirmTitle: 'Yes, block',
    blockConfirm: (name: string) =>
      `${name} won’t be able to see you anymore, and your match and chat will close for both of you.`,
    report: 'Report',
    reportTitle: 'Why are you reporting them?',
    reasons: {
      harassment: 'Harassment or insults',
      spam: 'Spam or advertising',
      fake_profile: 'Fake profile',
      nudity: 'Inappropriate content',
      underage: 'Under 18',
      other: 'Other',
    },
    reported:
      'Your report was received and will be reviewed. This person won’t show up in Discover anymore; to stop messaging too, block them.',
    cancel: 'Cancel',
    failed: 'That didn’t work. Try again.',
    deleteAccount: 'Delete my account',
    deleteTitle: 'Yes, delete my account',
    deleteConfirm:
      'Your profile, chart, matches and all your messages are deleted for good. This cannot be undone.',
    deleting: 'Deleting…',
    deleteFailed: 'Couldn’t delete the account. Try again.',
  },
  chat: {
    backToMatches: '‹ Matches',
    backToMatchesLabel: 'Back to matches',
    tabThread: 'Chat',
    tabMatch: 'Compatibility',
    read: 'Read',
    reply: 'Reply',
    cancelReply: 'Cancel reply',
    you: 'You',
    replyUnavailable: 'An earlier message',
    placeholder: 'Write something…',
    send: 'Send',
    sendFailed: 'Your message couldn’t be sent. Try again.',
    open: 'Open the chat ›',
  },
  person: {
    openProfile: (name: string) => `Open ${name}’s profile`,
    chartTitle: (name: string) => `${name}’s chart`,
    fullChart: 'See their full chart',
  },
  filters: {
    title: 'Discovery settings',
    age: 'Age range',
    ageMin: 'Minimum age',
    ageMax: 'Maximum age',
    ageHint:
      'People outside this range aren’t shown to you; if you’re outside their range, you aren’t shown to them.',
    minBand: 'Minimum compatibility',
    anyBand: 'All',
    minBandHint:
      'Matches below the band you pick won’t appear in Discover. A low band isn’t a bad match; it only means your charts meet at fewer points.',
    elements: 'Sun element',
    elementsHint:
      'If you pick none, everyone is shown. This isn’t a measure of compatibility, just a preference.',
    elementNames: {
      fire: 'Fire',
      earth: 'Earth',
      air: 'Air',
      water: 'Water',
    },
    failed: 'Couldn’t save. Try again.',
    unanswered:
      'The connection didn’t respond; your saved settings were reloaded.',
    sort: 'Order',
    sortDistance: 'Distance',
    sortCompatibility: 'Compatibility',
    sortHint:
      'Cards start with the person closest to you. With Premium you can start with the most compatible.',
    sortHintPremium:
      'You choose the order your cards come in: the closest first, or the most compatible first.',
  },
  settings: {
    title: 'Settings',
    premium: 'Premium membership',
    backLabel: 'Back to settings',
    signOut: 'Sign out',
    radius: 'Discovery radius',
    radiusHint:
      'People within this distance are shown to you; who sees you depends on their radius. Others only ever see your location as a distance in km.',
    location: 'Location',
    updateLocation: 'Update location',
    locating: 'Getting your location…',
    locationUpdated: 'Your location was updated.',
    locationDenied:
      'Couldn’t get your location. Turn the permission on in Settings and try again; your saved location hasn’t changed.',
    locationFailed: 'Couldn’t save your location. Try again.',
    locationHint:
      'Your location is stored rounded to a cell of about 1 km; no one sees exactly where you are.',
    language: 'Language',
    languageDevice: 'Device language',
    languageHint:
      'Juno follows your device’s language unless you pick one here.',
  },
  premium: {
    title: 'Premium membership',
    kicker: 'JUNO PREMIUM',
    pitch: 'Discovery as wide as your chart.',
    benefits: (dailyLikes: number, superLikes: number) => [
      'Unlimited likes',
      `${superLikes} super likes a week`,
      'See who liked you',
      'Sort cards by compatibility',
      `With a free membership you get ${dailyLikes} likes a day.`,
    ],
    buy: 'Go Premium',
    buying: 'Turning it on…',
    failed: 'Couldn’t turn on Premium. Try again.',
    active: 'Your Premium membership is on.',
    since: (date: string) => `You’ve been a Premium member since ${date}.`,
    noPayment:
      'There’s no payment step yet: for now you become Premium the moment you tap.',
    lockedLikes:
      'You’ve used today’s likes. With Premium you can like without limits.',
    lockedSuper: 'Super likes are for Premium members.',
    lockedSuperSpent: 'You’ve used this week’s super likes.',
    lockedSort: 'Sorting by compatibility is for Premium members.',
    open: 'See Premium',
  },
  likedMe: {
    openPerson: (name: string) => `${name}. Open in Discover`,
    title: 'Liked you',
    open: 'Liked you',
    openCount: (n: number) =>
      `Liked you, ${n} ${n === 1 ? 'person' : 'people'}`,
    empty: 'No one has liked you yet. Keep exploring.',
    lockedTitle: (n: number) =>
      n === 1 ? 'One person liked you' : `${n} people liked you`,
    lockedHint:
      'Seeing who they are and liking them back one by one is for Premium members.',
    superBadge: 'Super like',
    likeBack: 'Like',
    passBack: 'Pass',
    failed: 'That didn’t work. Try again.',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: (n: number) => `${n} days ago`,
  },
  blocked: {
    open: 'Blocked people',
    title: 'Blocked people',
    hint: 'If you unblock someone, your match and your past chat come back for both of you.',
    empty: 'You haven’t blocked anyone.',
    undo: 'Unblock',
  },
  legal: {
    open: 'Privacy and licenses',
    updated: (date: string) => `Last updated: ${date}`,
    translationNote:
      'This is an English translation, provided for your convenience. The Turkish text is the binding version.',
    showOriginal: 'Read the Turkish original',
    showTranslation: 'Back to the translation',
  },
  common: {
    loading: 'Loading…',
    retry: 'Try again',
    close: 'Close',
    backGlyph: '‹',
  },
  errors: {
    generic: 'Something went wrong. Try again.',
    weakPassword: 'That password is too weak. Try a longer or more varied one.',
    invalidCredentials: 'Wrong email or password.',
    accountExists: 'An account with this email already exists. Try signing in.',
    emailNotConfirmed:
      'Your email address isn’t verified yet. Check your inbox.',
    mailNotSent:
      'The verification email couldn’t be sent just now. Try again in a moment; if it keeps happening, try a different address or write to destek@juno-dating.com.',
    otpInvalid:
      'The code is wrong or has expired. Ask for a new one and use it within ten minutes.',
    emailInvalid: 'That email address doesn’t look valid.',
    rateLimited: 'Too many tries. Wait a little.',
    alreadyExists: 'This already exists.',
    invalidData: 'What you entered wasn’t accepted. Check it and try again.',
    notAllowed: 'You’re not allowed to do that.',
    providerFailed: 'Sign-in didn’t finish. Try again, or continue with email.',
  },
};
