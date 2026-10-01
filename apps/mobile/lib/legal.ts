/**
 * The privacy notice and licence credits, shown at `/legal`.
 *
 * This is the canonical text: it lives in the app rather than in `docs/`
 * so there is one copy, and on the web client `/legal` is the public URL
 * the App Store listing needs. Prepared from the actual schema
 * (`supabase/migrations`) — every item names data the app really stores,
 * so a new column holding personal data is a change here too.
 *
 * Not legal advice: the owner reviews this before the app ships. The two
 * placeholders in "Veri sorumlusu" were filled in by the owner on
 * 2026-09-17 (Oğuz Pançuk, destek@juno-dating.com).
 *
 * Two claims have to stay true, and both were checked that day: the
 * hosted Supabase project really is in an EU region (`jkxuhbuuhsumyjmlskls`,
 * eu-central-1, Frankfurt), and no analytics or crash reporter has been
 * added without being listed here (nothing of the kind is in
 * `apps/mobile/package.json`).
 *
 * A third joins them, and it is the one this file keeps getting wrong:
 * every data processor that touches personal data is named under
 * "Kimlerle paylaşılır". The list was Supabase and Resend for half a day,
 * until the web client went onto Cloudflare and the notice's own page
 * started being served by a processor it said did not exist. It is now
 * Supabase, Resend, Cloudflare (the web client only — the iOS app never
 * goes through it) and Namecheap (mail sent to the contact address).
 * Putting infrastructure in front of the product is an edit here, in the
 * same change, not afterwards — pati learned this on 2026-09-10 and juno
 * relearned it on 2026-09-17.
 *
 * The rule is not only about infrastructure: a column that holds personal
 * data belongs in "İşlenen veriler", and one that other members can read
 * belongs in "Kimlerle paylaşılır" as well. On 2026-09-21 four optional
 * profile fields — height, interest tags, university and occupation —
 * went into both, in the change that added them; the university and the
 * occupation are free text a member writes about themselves, which the
 * whole radius can read.
 *
 * On 2026-09-28 the premium release (#10, 2026-09-24) caught up here: the
 * membership columns (`is_premium`, `premium_since`, `sort_by`) under
 * "Profil", the super like under "Kullanım", and under "Kimlerle
 * paylaşılır" what `liked_me` and `discover.likes_me` show the person you
 * liked — to a premium member your whole public card and the distance,
 * past their radius and filters; to a free member the count, the star and
 * the moment (`liked_at` is a full timestamp for everyone; only the
 * screen rounds it to a day). The membership and the quotas also got a
 * purpose and a legal basis. It shipped to the hosted project before this
 * text did. The bullet says premium is free and one tap away, because
 * that is what makes "only premium members see who you are" no promise
 * at all: when payments land, that sentence changes with them.
 *
 * The same rule covers identity providers. Apple and Google are named
 * under "Hesap" and "Kimlerle paylaşılır" from the 2026-09-29 version,
 * in the change that finished the sign-in item (ADR-0013); that version
 * also carries the premium lines above, which were merged first under
 * 2026-09-28. The notice is meant to go out with
 * the deploy before the providers are switched on in the dashboard, so
 * no moment exists where someone signs in through a provider this text
 * does not name. What it says about them was read out of GoTrue, not
 * assumed: a provider sign-in stores the provider's subject id and the
 * address it vouches for, and Google's token also carries a name and a
 * picture URL, which land in the auth user's metadata and nowhere else.
 *
 * Apple on the web (same day, the owner's "webde apple girisi yok") added
 * one clause to that bullet: GoTrue asks Apple's web page for `email name`
 * with no way to narrow it, and stores the name Apple posts back on the
 * first authorisation in the same metadata. The phone asks for the
 * address only. One version, one text: the 29 Eylül text went live the
 * same morning (the owner's deploy of main 5d20145), so this one needed a
 * date of its own. The version is a `date` column, so a second text on
 * the merge day could not be told apart from the first; it is dated 30
 * Eylül, the next day, which the database accepts from the 29th on
 * (`profiles_consent_version_not_future` allows today plus one).
 *
 * Translations (2026-09-29, the owner's "uygulamayı İngilizce ve
 * İspanyolcaya çevireceğiz, her şey çevrilecek"): each language has the
 * notice in its own words (`legal-en.ts`, …), shown with a line above it
 * saying the Turkish text binds, and a link to read that text. The Turkish
 * here is still the one text: a translation is of the version dated
 * below, it moves when this text moves, and translating it never moves
 * the version, because what a member consents to has not changed.
 *
 * Crash reporting (2026-10-01, ROADMAP Metrics, the owner's pick of
 * Sentry's EU region): the second claim at the top stopped being
 * "nothing of the kind" that day, in the change that added
 * `@sentry/react-native`. Sentry is named under "İşlenen veriler" (what a
 * report holds), the purposes (stability, legitimate interest), "Kimlerle
 * paylaşılır" and "Saklama süresi" (90 days at most, the longest any of
 * Sentry's plans keeps an event). What the notice says a report leaves
 * out is enforced on the device (`lib/crash-rules.ts`), the region by the
 * DSN's shape, and the IP address by the project's "Prevent Storing of IP
 * Addresses" setting, which the setup steps require before a DSN is set.
 * `legal.test.ts` now checks the notice against the dependency list. The
 * 30 Eylül text was live (the owner's deploy of #15), so this one is 1
 * Ekim, and every member is asked to accept it.
 */
import type { Language } from '@juno/astro';
import { legalSectionsEn } from './legal-en';
import { legalSectionsEs } from './legal-es';

export interface LegalSection {
  readonly heading: string;
  /** A line starting with "• " is rendered as a bullet. */
  readonly body: readonly string[];
}

/** Shown to the reader. */
export const LEGAL_UPDATED = '1 Ekim 2026';

/**
 * Machine-readable: it is stored on the profile as the version of the
 * notice the member accepted (`profiles.consent_version`, written at
 * onboarding and again at re-consent), so a later version can be told
 * apart from this one.
 *
 * Moves with `LEGAL_UPDATED`: the value is the version of the text the
 * person read before agreeing, so a profile created under a later wording
 * must say so. `supabase/seed.sql` carries it too: rerun
 * `supabase/scripts/gen-seed.ts` when it moves. Moving it reaches every
 * existing member as well: anyone whose record is older is stopped at
 * `/consent` until they accept this text (`lib/consent.ts`), and the DB
 * trigger refuses moving a stored version backwards.
 */
export const LEGAL_VERSION = '2026-10-01';

export const legalSections: readonly LegalSection[] = [
  {
    heading: 'Gizlilik Politikası ve KVKK Aydınlatma Metni',
    body: [
      'Bu metin, uygulamayı kullandığında hangi kişisel verilerinin işlendiğini, neden işlendiğini ve bu veriler üzerinde hangi haklara sahip olduğunu 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında açıklar.',
    ],
  },
  {
    heading: 'Veri sorumlusu',
    body: ['Veri sorumlusu: Oğuz Pançuk.', 'İletişim: destek@juno-dating.com.'],
  },
  {
    heading: 'İşlenen veriler',
    body: [
      'Uygulama aşağıdaki verileri saklar.',
      'Hesap',
      '• E-posta adresin ve, e-postayla kaydolduysan, parolan. Giriş e-posta ve parola ile ya da Apple veya Google hesabınla yapılır. Parolan yalnızca kimlik altyapısında, geri çevrilemeyen bir özet (hash) olarak saklanır; ne bize ne başkasına gösterilir. E-postayla kaydolursan adresin kayıt sırasında doğrulanır: adresine altı haneli bir kod gönderilir ve hesap ancak o kod girilince açılır.',
      "• Apple ya da Google ile girersen: o sağlayıcının seni tanıdığı kimlik numarası ve sağlayıcının doğruladığı e-posta adresin. Google bunlarla birlikte adını ve profil fotoğrafının bağlantısını da iletir; web sitesinde Apple ile ilk kez girersen Apple da paylaşmayı seçtiğin adı iletir. Bunlar kimlik altyapısında durur, uygulama onları kullanmaz ve kimseye göstermez. Apple'da e-postanı gizlemeyi seçersen Apple'ın verdiği yönlendirme adresi saklanır, gerçek adresin bize ulaşmaz. Sağlayıcının doğruladığı adres, burada e-postayla açılmış bir hesabın adresiyle aynıysa giriş o hesaba bağlanır ve ikinci bir hesap açılmaz.",
      '• Giriş kayıtları: kimlik altyapısı, her oturum için bağlandığın IP adresini ve kullandığın uygulama/tarayıcı bilgisini tutar. Bunlar güvenlik ve kötüye kullanımı önleme amacıyla saklanır.',
      'Profil',
      '• Görünen adın.',
      '• Doğum tarihin, doğum saatin ve doğum şehrin. Bu üçü doğum haritanı hesaplamak için zorunludur; doğum tarihi aynı zamanda 18 yaş sınırını denetler.',
      '• Hesaplanan doğum haritan ve güneş, ay, yükselen burçların.',
      '• Cinsiyetin ve kimlerle eşleşmek istediğin.',
      '• Keşfet filtrelerin: görmek istediğin yaş aralığı, en az uyum bandı ve görmek istediğin burç elementleri.',
      '• Konumun. Yaklaşık 1 kilometrelik bir ızgaraya yuvarlanarak saklanır: başkalarına gösterilen mesafe bu yuvarlanmış noktadan hesaplanır, tam konumun veritabanına hiç yazılmaz.',
      '• Arama yarıçapın.',
      '• Yüklediğin fotoğraflar ve yazdığın kısa tanıtım metni.',
      '• Doldurursan profilini anlatan alanlar: boyun, seçtiğin ilgi alanları, okuduğun üniversite ve mesleğin. Dördü de isteğe bağlıdır, boş bırakabilirsin ve sonradan istediğin zaman değiştirebilir ya da silebilirsin.',
      '• Üyelik bilgin: premium üye olup olmadığın, üyeliğinin başladığı an ve keşfette kişileri mesafeye mi uyuma mı göre sıraladığın.',
      '• Onay kaydın: bu metnin hangi sürümünü kabul ettiğin ve kabul anının zamanı. Rızanın kanıtı budur ve hesabınla birlikte silinir.',
      'Kullanım',
      '• Beğenilerin (süper beğeniler dahil), geçtiklerin ve eşleşmelerin.',
      '• Eşleşmelerinle yazıştığın mesajlar ve okunma bilgileri.',
      '• Engellediğin kişiler.',
      '• Gönderdiğin şikâyetler: kimi, hangi sebeple şikâyet ettiğin ve yazdıysan açıklaman.',
      'Çökme raporları',
      '• Uygulama çöktüğünde ya da beklenmedik bir hatayla karşılaştığında: hatanın teknik kaydı (hata mesajı ve kodun hangi satırında olduğu), cihazının modeli, işletim sistemi ve uygulama sürümü, hatanın hangi ekranda olduğu ve kullanım oturumunun bir çökmeyle bitip bitmediği. Bu kayda seni tanıtan bir şey eklenmez: adın, e-postan, hesap numaran, konumun ve mesajların gönderilmez; hata metninde geçen hesap, eşleşme ve mesaj numaraları ile e-posta adresleri kayıt cihazdan çıkmadan silinir ve IP adresin saklanmaz.',
      'Uygulama; rehberine, arama geçmişine veya fotoğraf kütüphanenin tamamına erişmez. Fotoğraf seçicisinden yalnızca senin seçtiğin görsel yüklenir. Reklam kimliği toplanmaz, üçüncü taraf reklam veya izleme aracı kullanılmaz.',
    ],
  },
  {
    heading: 'İşleme amaçları ve hukuki sebepler',
    body: [
      '• Doğum haritası ve uyum hesabı. Doğum tarihi, saati ve yeri olmadan ürünün temel işlevi çalışmaz; bu veriler açık rızanla işlenir ve rızanı hesabını silerek geri alabilirsin.',
      '• Yakındaki kişileri gösterme. Konumun, senin yarıçapın içindeki profilleri bulmak, seni görebilecek kişilere ve beğendiğin kişilere aradaki mesafeyi göstermek için kullanılır. Açık rızaya dayanır.',
      '• Üyelik. Premium üyelik bilgin, üyeliğin sağladıklarını sunmak (sınırsız beğeni, süper beğeni, seni beğenenleri görme, uyuma göre sıralama), ücretsiz üyelerin günlük beğeni sınırını ve premium üyelerin haftalık süper beğeni sınırını uygulamak için işlenir; bu sınırlar için son beğenilerinin (süper beğeniler dahil) sayısı ve zamanı kullanılır. Sözleşmenin kurulması ve ifası için gereklidir (KVKK m. 5/2-c).',
      '• Eşleşme ve mesajlaşma. Sözleşmenin kurulması ve ifası için gereklidir (KVKK m. 5/2-c).',
      '• Güvenlik. Engelleme ve şikâyet kayıtları, hizmetin kötüye kullanımını önlemek için işlenir; veri sorumlusunun meşru menfaati (KVKK m. 5/2-f).',
      '• Uygulamanın kararlılığı. Çökme raporları, hataları bulup düzeltmek ve uygulamanın ne sıklıkla çöktüğünü ölçmek için işlenir; veri sorumlusunun meşru menfaati (KVKK m. 5/2-f).',
    ],
  },
  {
    heading: 'Kimlerle paylaşılır',
    body: [
      '• Diğer kullanıcılar. Görünen adın, yaşın, cinsiyetin, doğum haritan, fotoğrafların, tanıtım metnin, doldurduysan boyun, ilgi alanların, üniversiten ve mesleğin ile aranızdaki mesafe, seni görebilecek kişilere gösterilir. Önemli bir ayrıntı: kendi arama yarıçapın kimleri göreceğini belirler, seni kimlerin göreceğini değil. Seni, kendi yarıçapı sana ulaşan herkes görebilir; beğendiğin kişiler ise yarıçapı sana ulaşmasa da görebilir (bir sonraki madde). Doğum tarihin, doğum saatin ve doğum şehrin başkalarına gösterilmez; yalnızca bunlardan hesaplanan harita gösterilir. Mesajların yalnızca eşleştiğin kişiye gider.',
      '• Beğendiğin kişi. Birini beğendiğinde, o kişi premium üyeyse seni "Seni beğenenler" listesinde görür: yukarıda sayılan profil bilgilerin ve aranızdaki mesafe, kendi yarıçapı ya da filtreleri sana ulaşmasa da ona gösterilir; beğeninin süper beğeni olup olmadığı ve ne zaman yapıldığı da görünür. Premium üyelik şu an ücretsizdir ve tek dokunuşla açılır, üyeliği sonradan açan kişi de daha önce gelen beğenileri görür; bu yüzden beğendiğin herkesin bunları görebileceğini varsaymalısın. Üyeliği açık olmayan kişi yalnızca birinin onu beğendiğini, süper beğeni olup olmadığını ve ne zaman yapıldığını görür; kim olduğunu görmez. Kartın premium bir üyenin keşfetinde çıkarsa üzerinde "Seni beğendi", süper beğendiysen "Seni süper beğendi" yazar. Geçtiğin kişilere hiçbir şey gösterilmez. Beğenin cevaplandığında ya da biriniz diğerini engellediğinde listeden çıkarsın.',
      "• Giriş sağlayıcıları. Apple ya da Google ile girersen girişini o sağlayıcı doğrular ve Juno'ya giriş yaptığını o da bilir; bu, onların kendi gizlilik koşullarına tabidir. Uygulama onlara profilinden, haritandan ya da mesajlarından hiçbir şey göndermez.",
      '• Barındırma sağlayıcısı. Veriler, veri işleyen sıfatıyla Supabase altyapısında ve Avrupa Birliği bölgesinde saklanır.',
      '• E-posta sağlayıcısı. Doğrulama kodun, veri işleyen sıfatıyla Resend üzerinden gönderilir; bu sağlayıcıya yalnızca e-posta adresin ve mailin içeriği ulaşır, gönderim Avrupa Birliği bölgesinden yapılır.',
      '• Web sürümünün dağıtıcısı. juno-dating.com adresini tarayıcıdan açtığında sayfa, veri işleyen sıfatıyla Cloudflare üzerinden sunulur; Cloudflare bağlantının IP adresini ve istenen sayfayı görür ve kayıt tutar. Veritabanına, fotoğraflara ve mesajlara erişimi yoktur. iOS uygulamasını kullanıyorsan bu yol hiç devreye girmez.',
      "• Alan adı ve mail yönlendirme sağlayıcısı. Bu metinde yazan iletişim adresine yazdığında mailin, veri işleyen sıfatıyla Namecheap'in yönlendirme servisi üzerinden bize ulaşır ve okunduğu posta kutusunda saklanır. juno-dating.com alan adının DNS kayıtlarını da Cloudflare tutar.",
      "• Çökme raporlama sağlayıcısı. Çökme raporları, hem iOS uygulamasından hem web sürümünden, veri işleyen sıfatıyla Sentry (Functional Software, Inc.) altyapısına gönderilir ve Avrupa Birliği bölgesinde (Almanya) saklanır. Sentry'ye yukarıda sayılan teknik kayıt dışında hiçbir şey gönderilmez; veritabanına, fotoğraflara ve mesajlara erişimi yoktur.",
      '• Bunların dışında hiçbir üçüncü tarafa aktarılmaz, satılmaz veya pazarlama amacıyla paylaşılmaz. Yasal bir talep hâlinde mevzuatın gerektirdiği ölçüde paylaşım yapılabilir.',
    ],
  },
  {
    heading: 'Saklama süresi',
    body: [
      'Verilerin, hesabın açık kaldığı sürece saklanır. Hesabını uygulama içinden sildiğinde profilin, haritan, fotoğrafların, beğenilerin, eşleşmelerin ve mesajların silinir.',
      'İki istisna var. Hakkında yapılmış şikâyet kayıtları, kötüye kullanımın hesap silinerek izinin kaybolmaması için saklanmaya devam eder; bu kayıtta şikâyet edilen kişinin kimliği ve şikâyet metni silinir, yalnızca şikâyetin varlığı, sebebi ve tarihi kalır. Kimlik altyapısının denetim kayıtları da (kayıt olma, giriş, hesap silme olayları) e-posta adresini içerecek şekilde kalır. Bugün bu iki kayıt türü için otomatik bir silme süresi tanımlı değil; bir süre belirlendiğinde bu metin güncellenecek.',
      // The label is typed out, not imported from lib/strings.ts: UI copy
      // must not change this text under an unchanged version. lib/legal.test.ts
      // goes red when the label is renamed, so both move together.
      'Apple ya da Google ile açılıp doğum bilgileri girilmeden bırakılan bir hesap, doğum bilgileri ekranındaki “Farklı bir hesapla gir” ile silinir. Silme o an yapılamazsa (örneğin bağlantı yoksa) ekranda söylenir ve hesap kalır; ekranı kapatıp bırakırsan da kalır. İkisinde de aynı sağlayıcıyla yeniden girip orada silebilirsin.',
      "Çökme raporları Sentry'de en fazla 90 gün tutulur, sonra kendiliğinden silinir.",
    ],
  },
  {
    heading: 'Haklarınız',
    body: [
      'KVKK m. 11 uyarınca; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını öğrenme, eksik veya yanlış işlenmişse düzeltilmesini, şartları oluştuğunda silinmesini isteme ve işlemenin sonucunda aleyhine bir sonuç doğması hâlinde buna itiraz etme haklarına sahipsin.',
      'Profil bilgilerini uygulama içinden düzeltebilir, fotoğraflarını kaldırabilir ve hesabını tümüyle silebilirsin. Diğer talepler için yukarıdaki iletişim adresine yazabilirsin.',
    ],
  },
  {
    heading: 'Çocuklar',
    body: [
      'Uygulama 18 yaşından küçüklere yönelik değildir. Kayıt sırasında doğum tarihi 18 yaşın altında olan bir hesap oluşturulamaz.',
    ],
  },
  {
    heading: 'Değişiklikler',
    body: [
      'Bu metin değişirse güncellenmiş hâli aynı adreste yayımlanır ve yukarıdaki tarih güncellenir.',
    ],
  },
  {
    heading: 'Kaynaklar ve lisanslar',
    body: [
      '• Şehir listesi: GeoNames (CC BY 4.0).',
      '• Gezegen konumları: astronomy-engine (MIT).',
      '• Astrolojik yorum metinleri uygulamaya aittir; kaynakları docs/astro-sources.md dosyasında listelenir.',
    ],
  },
];

/** The notice in each language; Turkish is the source and the binding one. */
export const LEGAL_SECTIONS: Readonly<
  Record<Language, readonly LegalSection[]>
> = {
  tr: legalSections,
  en: legalSectionsEn,
  es: legalSectionsEs,
};

/**
 * `LEGAL_UPDATED` as each language writes that date. Moves with
 * `LEGAL_VERSION` like the Turkish one; `legal.test.ts` checks each
 * against the version.
 */
export const LEGAL_UPDATED_IN: Readonly<Record<Language, string>> = {
  tr: LEGAL_UPDATED,
  en: 'October 1, 2026',
  es: '1 de octubre de 2026',
};
