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
 * `apps/mobile/package.json`). A third joins them now that mail is really
 * sent: every data processor that touches personal data is named under
 * "Kimlerle paylaşılır", which as of today means Supabase and Resend.
 */
export interface LegalSection {
  readonly heading: string;
  /** A line starting with "• " is rendered as a bullet. */
  readonly body: readonly string[];
}

/** Shown to the reader. */
export const LEGAL_UPDATED = '17 Eylül 2026';

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
export const LEGAL_VERSION = '2026-09-17';

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
      '• Konumun. Yaklaşık 1 kilometrelik bir ızgaraya yuvarlanarak saklanır: başkalarına gösterilen mesafe bu yuvarlanmış noktadan hesaplanır, tam konumun veritabanına hiç yazılmaz.',
      '• Arama yarıçapın.',
      '• Yüklediğin fotoğraflar ve yazdığın kısa tanıtım metni.',
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
      '• Diğer kullanıcılar. Görünen adın, yaşın, cinsiyetin, doğum haritan, fotoğrafların, tanıtım metnin ve aranızdaki mesafe, seni görebilecek kişilere gösterilir. Önemli bir ayrıntı: kendi arama yarıçapın kimleri göreceğini belirler, seni kimlerin göreceğini değil. Seni, kendi yarıçapı sana ulaşan herkes görebilir. Doğum tarihin, doğum saatin ve doğum şehrin başkalarına gösterilmez; yalnızca bunlardan hesaplanan harita gösterilir. Mesajların yalnızca eşleştiğin kişiye gider.',
      '• Barındırma sağlayıcısı. Veriler, veri işleyen sıfatıyla Supabase altyapısında ve Avrupa Birliği bölgesinde saklanır.',
      '• E-posta sağlayıcısı. Doğrulama kodun, veri işleyen sıfatıyla Resend üzerinden gönderilir; bu sağlayıcıya yalnızca e-posta adresin ve mailin içeriği ulaşır, gönderim Avrupa Birliği bölgesinden yapılır.',
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
