import type { LegalSection } from './legal';

export const legalSectionsEn: readonly LegalSection[] = [
  {
    heading: 'Privacy Policy and KVKK Privacy Notice',
    body: [
      'This text explains, under Law No. 6698 on the Protection of Personal Data (KVKK), which of your personal data are processed when you use the app, why they are processed, and what rights you have over that data.',
    ],
  },
  {
    heading: 'Data controller',
    body: ['Data controller: Oğuz Pançuk.', 'Contact: destek@juno-dating.com.'],
  },
  {
    heading: 'Data processed',
    body: [
      'The app stores the following data.',
      'Account',
      '• Your e-mail address and, if you signed up with e-mail, your password. You sign in with an e-mail address and password, or with your Apple or Google account. Your password is stored only in the identity infrastructure, as an irreversible digest (hash); it is shown neither to us nor to anyone else. If you sign up with e-mail, your address is verified during sign-up: a six-digit code is sent to your address, and the account is opened only once that code is entered.',
      '• If you sign in with Apple or Google: the ID number by which that provider identifies you, and your e-mail address as verified by the provider. Along with these, Google also passes on your name and the link to your profile photo; if you sign in with Apple on the website for the first time, Apple also passes on the name you chose to share. These stay in the identity infrastructure; the app does not use them and does not show them to anyone. If you choose to hide your e-mail at Apple, the forwarding address Apple gives is stored, and your real address does not reach us. If the address verified by the provider is the same as the address of an account opened here with e-mail, the sign-in is linked to that account and no second account is opened.',
      '• Sign-in records: for each session, the identity infrastructure keeps the IP address you connected from and information about the app/browser you used. These are kept for security and to prevent abuse.',
      'Profile',
      '• Your display name.',
      '• Your date of birth, time of birth and city of birth. These three are required to calculate your natal chart; your date of birth is also used to check the 18-year age limit.',
      '• Your calculated natal chart and your sun, moon and rising signs.',
      '• Your gender and who you want to match with.',
      '• Your Discover filters: the age range you want to see, the minimum compatibility band and the zodiac elements you want to see.',
      '• Your location. It is stored rounded to a grid of approximately 1 kilometer: the distance shown to others is calculated from this rounded point, and your exact location is never written to the database.',
      '• Your search radius.',
      '• The photos you upload and the short bio you write.',
      '• If you fill them in, the fields that describe your profile: your height, the interests you choose, your university and your occupation. All four are optional; you can leave them blank and change or delete them at any time later.',
      '• Your membership information: whether you are a premium member, the moment your membership started, and whether you sort people in Discover by distance or by compatibility.',
      '• Your consent record: which version of this text you accepted and the time you accepted it. This is the proof of your consent and is deleted together with your account.',
      'Usage',
      '• Your likes (including super likes), your passes and your matches.',
      '• The messages you exchange with your matches, and read receipts.',
      '• The people you block.',
      '• The reports you submit: whom you reported, for what reason and, if you wrote one, your explanation.',
      'Crash reports',
      '• When the app crashes or runs into an unexpected error: the technical record of the error (the error message and the line of code it happened on), your device model, operating system and app version, the screen the error happened on, and whether the session ended in a crash. Nothing that identifies you is added to this record: your name, e-mail, account number, location and messages are not sent; account, match and message numbers and e-mail addresses appearing in the error text are removed before the record leaves the device, and your IP address is not stored.',
      'The app does not access your contacts, your call history or your entire photo library. From the photo picker, only the image you select is uploaded. No advertising ID is collected, and no third-party advertising or tracking tools are used.',
    ],
  },
  {
    heading: 'Purposes of processing and legal bases',
    body: [
      '• Natal chart and compatibility calculation. Without your date, time and place of birth, the core function of the product does not work; this data is processed with your explicit consent, and you can withdraw your consent by deleting your account.',
      '• Showing people nearby. Your location is used to find profiles within your radius and to show the distance between you to people who can see you and to people you like. It is based on explicit consent.',
      '• Membership. Your premium membership information is processed to provide what membership offers (unlimited likes, super likes, seeing who liked you, sorting by compatibility) and to enforce the daily like limit for free members and the weekly super like limit for premium members; for these limits, the number and time of your recent likes (including super likes) are used. It is necessary for the establishment and performance of the contract (KVKK Art. 5(2)(c)).',
      '• Matching and messaging. Necessary for the establishment and performance of the contract (KVKK Art. 5(2)(c)).',
      '• Security. Block and report records are processed to prevent abuse of the service; legitimate interest of the data controller (KVKK Art. 5(2)(f)).',
      '• App stability. Crash reports are processed to find and fix errors and to measure how often the app crashes; legitimate interest of the data controller (KVKK Art. 5(2)(f)).',
    ],
  },
  {
    heading: 'Who it is shared with',
    body: [
      '• Other users. Your display name, age, gender, natal chart, photos, bio and, if you filled them in, your height, interests, university and occupation, together with the distance between you, are shown to people who can see you. An important detail: your own search radius determines whom you see, not who sees you. Anyone whose own radius reaches you can see you; the people you like can see you even if their radius does not reach you (next item). Your date of birth, time of birth and city of birth are not shown to others; only the chart calculated from them is shown. Your messages go only to the person you matched with.',
      '• The person you like. When you like someone, if that person is a premium member, they see you in the "Liked you" list: your profile information listed above and the distance between you are shown to them even if their own radius or filters do not reach you; whether your like was a super like and when it was made are also visible. Premium membership is currently free and is turned on with a single tap, and a person who turns on membership later also sees likes that came in before; for this reason, you should assume that everyone you like can see these. A person without membership turned on sees only that someone liked them, whether it was a super like and when it was made; they do not see who it was. If your card appears in a premium member\'s Discover, it reads "Liked you", or "Super liked you" if you super liked them. Nothing is shown to people you pass. You are removed from the list when your like is answered or when one of you blocks the other.',
      '• Sign-in providers. If you sign in with Apple or Google, that provider verifies your sign-in and it also knows that you signed in to Juno; this is subject to their own privacy terms. The app sends them nothing from your profile, your chart or your messages.',
      '• Hosting provider. Data is stored on the infrastructure of Supabase, acting as data processor, in a European Union region.',
      '• E-mail provider. Your verification code is sent through Resend, acting as data processor; only your e-mail address and the content of the e-mail reach this provider, and sending takes place from a European Union region.',
      '• Distributor of the web version. When you open juno-dating.com in a browser, the page is served through Cloudflare, acting as data processor; Cloudflare sees the IP address of your connection and the requested page, and keeps logs. It has no access to the database, photos or messages. If you use the iOS app, this path is not involved at all.',
      "• Domain name and mail forwarding provider. When you write to the contact address given in this text, your e-mail reaches us through Namecheap's forwarding service, acting as data processor, and is stored in the mailbox where it is read. The DNS records of the juno-dating.com domain are also kept by Cloudflare.",
      '• Crash reporting provider. Crash reports, from both the iOS app and the web version, are sent to the infrastructure of Sentry (Functional Software, Inc.), acting as data processor, and stored in a European Union region (Germany). Nothing beyond the technical record listed above is sent to Sentry; it has no access to the database, photos or messages.',
      '• Beyond these, data is not transferred to any third party, sold or shared for marketing purposes. In the event of a legal request, it may be shared to the extent required by legislation.',
    ],
  },
  {
    heading: 'Retention period',
    body: [
      'Your data is kept for as long as your account remains open. When you delete your account from within the app, your profile, chart, photos, likes, matches and messages are deleted.',
      "There are two exceptions. Report records made about you continue to be kept, so that the trace of abuse is not lost by deleting the account; in this record, the identity of the reported person and the report text are deleted, and only the existence of the report, its reason and its date remain. The identity infrastructure's audit logs (sign-up, sign-in and account deletion events) also remain, including the e-mail address. At present no automatic deletion period is defined for these two types of record; when a period is set, this text will be updated.",
      // The label is typed out, not imported from the English UI strings:
      // UI copy must not change this text under an unchanged version.
      'An account opened with Apple or Google and left without birth details being entered is deleted with “Use a different account” on the birth details screen. If the deletion cannot be done at that moment (for example, if there is no connection), this is said on screen and the account remains; it also remains if you close the screen and leave. In either case, you can sign in again with the same provider and delete it there.',
      'Crash reports are kept at Sentry for at most 90 days, then deleted automatically.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'Under KVKK Art. 11, you have the right to learn whether your personal data are processed, to request information if they have been processed, to learn the purpose of processing, to request their correction if they have been processed incompletely or incorrectly, to request their deletion when the conditions are met, and to object if a result arises against you as a consequence of the processing.',
      'You can correct your profile information, remove your photos and delete your account entirely from within the app. For other requests, you can write to the contact address above.',
    ],
  },
  {
    heading: 'Children',
    body: [
      'The app is not intended for people under 18 years of age. During sign-up, an account cannot be created with a date of birth under 18 years of age.',
    ],
  },
  {
    heading: 'Changes',
    body: [
      'If this text changes, the updated version is published at the same address and the date above is updated.',
    ],
  },
  {
    heading: 'Sources and licenses',
    body: [
      '• City list: GeoNames (CC BY 4.0).',
      '• Planetary positions: astronomy-engine (MIT).',
      '• The astrological interpretation texts belong to the app; their sources are listed in the docs/astro-sources.md file.',
    ],
  },
];
