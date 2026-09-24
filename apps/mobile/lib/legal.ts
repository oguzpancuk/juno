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
 * The same rule covers identity providers, and there is one waiting: the
 * welcome screen draws Apple and Google buttons, but both providers are
 * disabled on the hosted project (checked 2026-09-17: `external.apple` and
 * `external.google` are false), so nobody can sign in through them and
 * "Giriş e-posta ve parola ile yapılır" is true today. The change that
 * enables either one must name it here in the same commit, under both
 * "Hesap" and "Kimlerle paylaşılır" — the ROADMAP item for that work says
 * so in its done-when clause.
 */
export interface LegalSection {
  readonly heading: string;
  /** A line starting with "• " is rendered as a bullet. */
  readonly body: readonly string[];
}

/** Shown to the reader. */
export const LEGAL_UPDATED = '21 Eylül 2026';

/**
 * Machine-readable: it is stored on the profile as the version of the
 * notice the member accepted (`profiles.consent_version`, written once at
 * onboarding), so a later version can be told apart from this one.
 *
 * Moves with `LEGAL_UPDATED`: the value is written once, at onboarding,
 * as the version of the text the person read before agreeing, so a
 * profile created after the 11 Eylül wording must say so. It does not
 * touch existing members — nothing re-asks consent yet, and the DB
 * trigger refuses moving a stored version backwards — so a re-consent
 * step, when it exists, starts from an honest record.
 */
export const LEGAL_VERSION = '2026-09-21';

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
      '• E-posta adresin ve parolan. Giriş e-posta ve parola ile yapılır. Parolan yalnızca kimlik altyapısında, geri çevrilemeyen bir özet (hash) olarak saklanır; ne bize ne başkasına gösterilir. E-posta adresin kayıt sırasında doğrulanır: adresine altı haneli bir kod gönderilir ve hesap ancak o kod girilince açılır.',
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
      '• Onay kaydın: bu metnin hangi sürümünü kabul ettiğin ve kabul anının zamanı. Rızanın kanıtı budur ve hesabınla birlikte silinir.',
      'Kullanım',
      '• Beğenilerin, geçtiklerin ve eşleşmelerin.',
      '• Eşleşmelerinle yazıştığın mesajlar ve okunma bilgileri.',
      '• Engellediğin kişiler.',
      '• Gönderdiğin şikâyetler: kimi, hangi sebeple şikâyet ettiğin ve yazdıysan açıklaman.',
      'Uygulama; rehberine, arama geçmişine veya fotoğraf kütüphanenin tamamına erişmez. Fotoğraf seçicisinden yalnızca senin seçtiğin görsel yüklenir. Reklam kimliği toplanmaz, üçüncü taraf reklam veya izleme aracı kullanılmaz.',
    ],
  },
  {
    heading: 'İşleme amaçları ve hukuki sebepler',
    body: [
      '• Doğum haritası ve uyum hesabı. Doğum tarihi, saati ve yeri olmadan ürünün temel işlevi çalışmaz; bu veriler açık rızanla işlenir ve rızanı hesabını silerek geri alabilirsin.',
      '• Yakındaki kişileri gösterme. Konumun, senin yarıçapın içindeki profilleri bulmak ve seni görebilecek kişilere aradaki mesafeyi göstermek için kullanılır. Açık rızaya dayanır.',
      '• Eşleşme ve mesajlaşma. Sözleşmenin kurulması ve ifası için gereklidir (KVKK m. 5/2-c).',
      '• Güvenlik. Engelleme ve şikâyet kayıtları, hizmetin kötüye kullanımını önlemek için işlenir; veri sorumlusunun meşru menfaati (KVKK m. 5/2-f).',
    ],
  },
  {
    heading: 'Kimlerle paylaşılır',
    body: [
      '• Diğer kullanıcılar. Görünen adın, yaşın, cinsiyetin, doğum haritan, fotoğrafların, tanıtım metnin, doldurduysan boyun, ilgi alanların, üniversiten ve mesleğin ile aranızdaki mesafe, seni görebilecek kişilere gösterilir. Önemli bir ayrıntı: kendi arama yarıçapın kimleri göreceğini belirler, seni kimlerin göreceğini değil. Seni, kendi yarıçapı sana ulaşan herkes görebilir. Doğum tarihin, doğum saatin ve doğum şehrin başkalarına gösterilmez; yalnızca bunlardan hesaplanan harita gösterilir. Mesajların yalnızca eşleştiğin kişiye gider.',
      '• Barındırma sağlayıcısı. Veriler, veri işleyen sıfatıyla Supabase altyapısında ve Avrupa Birliği bölgesinde saklanır.',
      '• E-posta sağlayıcısı. Doğrulama kodun, veri işleyen sıfatıyla Resend üzerinden gönderilir; bu sağlayıcıya yalnızca e-posta adresin ve mailin içeriği ulaşır, gönderim Avrupa Birliği bölgesinden yapılır.',
      '• Web sürümünün dağıtıcısı. juno-dating.com adresini tarayıcıdan açtığında sayfa, veri işleyen sıfatıyla Cloudflare üzerinden sunulur; Cloudflare bağlantının IP adresini ve istenen sayfayı görür ve kayıt tutar. Veritabanına, fotoğraflara ve mesajlara erişimi yoktur. iOS uygulamasını kullanıyorsan bu yol hiç devreye girmez.',
      "• Alan adı ve mail yönlendirme sağlayıcısı. Bu metinde yazan iletişim adresine yazdığında mailin, veri işleyen sıfatıyla Namecheap'in yönlendirme servisi üzerinden bize ulaşır ve okunduğu posta kutusunda saklanır. juno-dating.com alan adının DNS kayıtlarını da Cloudflare tutar.",
      '• Bunların dışında hiçbir üçüncü tarafa aktarılmaz, satılmaz veya pazarlama amacıyla paylaşılmaz. Yasal bir talep hâlinde mevzuatın gerektirdiği ölçüde paylaşım yapılabilir.',
    ],
  },
  {
    heading: 'Saklama süresi',
    body: [
      'Verilerin, hesabın açık kaldığı sürece saklanır. Hesabını uygulama içinden sildiğinde profilin, haritan, fotoğrafların, beğenilerin, eşleşmelerin ve mesajların silinir.',
      'İki istisna var. Hakkında yapılmış şikâyet kayıtları, kötüye kullanımın hesap silinerek izinin kaybolmaması için saklanmaya devam eder; bu kayıtta şikâyet edilen kişinin kimliği ve şikâyet metni silinir, yalnızca şikâyetin varlığı, sebebi ve tarihi kalır. Kimlik altyapısının denetim kayıtları da (kayıt olma, giriş, hesap silme olayları) e-posta adresini içerecek şekilde kalır. Bugün bu iki kayıt türü için otomatik bir silme süresi tanımlı değil; bir süre belirlendiğinde bu metin güncellenecek.',
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
