import type { LegalSection } from './legal';

/**
 * The privacy notice in Spanish: a translation of `legalSections` in
 * `legal.ts`, line for line, of the version dated there. The Turkish text
 * binds; this one moves when that one moves.
 */
export const legalSectionsEs: readonly LegalSection[] = [
  {
    heading: 'Política de privacidad y aviso informativo conforme a la KVKK',
    body: [
      'Este texto explica, en el marco de la Ley n.º 6698 de Protección de Datos Personales de Turquía (KVKK), qué datos personales tuyos se tratan cuando usas la aplicación, por qué se tratan y qué derechos tienes sobre estos datos.',
    ],
  },
  {
    heading: 'Responsable del tratamiento',
    body: [
      'Responsable del tratamiento: Oğuz Pançuk.',
      'Contacto: destek@juno-dating.com.',
    ],
  },
  {
    heading: 'Datos tratados',
    body: [
      'La aplicación guarda los siguientes datos.',
      'Cuenta',
      '• Tu dirección de correo electrónico y, si te registraste con correo, tu contraseña. El inicio de sesión se hace con correo y contraseña o con tu cuenta de Apple o Google. Tu contraseña se guarda solo en la infraestructura de identidad, como un resumen irreversible (hash); nadie puede verla, tampoco Juno. Si te registras con correo, tu dirección se verifica durante el registro: se envía un código de seis dígitos a tu dirección y la cuenta solo se abre cuando se introduce ese código.',
      '• Si entras con Apple o Google: el número de identificación con el que ese proveedor te reconoce y tu dirección de correo verificada por el proveedor. Junto con estos, Google también transmite tu nombre y el enlace de tu foto de perfil; si entras con Apple por primera vez en el sitio web, Apple también transmite el nombre que elegiste compartir. Estos datos permanecen en la infraestructura de identidad; la aplicación no los usa ni se los muestra a nadie. Si en Apple eliges ocultar tu correo, se guarda la dirección de reenvío que da Apple y tu dirección real no nos llega. Si la dirección verificada por el proveedor coincide con la de una cuenta abierta aquí con correo, el inicio de sesión se vincula a esa cuenta y no se abre una segunda cuenta.',
      '• Registros de inicio de sesión: la infraestructura de identidad guarda, para cada sesión, la dirección IP desde la que te conectas y la información de la aplicación/navegador que usas. Se guardan con fines de seguridad y de prevención de abusos.',
      'Perfil',
      '• Tu nombre visible.',
      '• Tu fecha, hora y ciudad de nacimiento. Estos tres datos son obligatorios para calcular tu carta natal; la fecha de nacimiento además sirve para controlar el límite de 18 años.',
      '• Tu carta natal calculada y tus signos de Sol, Luna y Ascendente.',
      '• Tu género y con quién quieres hacer match.',
      '• Tus filtros de Descubrir: el rango de edad que quieres ver, la banda mínima de compatibilidad y los elementos de los signos que quieres ver.',
      '• Tu ubicación. Se guarda redondeada a una cuadrícula de aproximadamente 1 kilómetro: la distancia que se muestra a otras personas se calcula desde este punto redondeado; tu ubicación exacta nunca se escribe en la base de datos.',
      '• Tu radio de búsqueda.',
      '• Las fotos que subes y el breve texto de presentación que escribes.',
      '• Si los completas, los campos que describen tu perfil: tu estatura, los intereses que elegiste, la universidad en la que estudias y tu profesión. Los cuatro son opcionales; puedes dejarlos vacíos y cambiarlos o borrarlos más adelante cuando quieras.',
      '• Tu información de membresía: si eres miembro Premium, el momento en que comenzó tu membresía y si en Descubrir ordenas a las personas por distancia o por compatibilidad.',
      '• Tu registro de consentimiento: qué versión de este texto aceptaste y el momento de la aceptación. Es la prueba de tu consentimiento y se elimina junto con tu cuenta.',
      'Uso',
      '• Tus likes (incluidos los superlikes), las personas que pasaste y tus matches.',
      '• Los mensajes que intercambias con tus matches y la información de lectura.',
      '• Las personas que bloqueaste.',
      '• Las denuncias que envías: a quién denunciaste, por qué motivo y, si la escribiste, tu explicación.',
      'Informes de fallos',
      '• Cuando la aplicación se cierra por un fallo o se encuentra con un error inesperado: el registro técnico del error (el mensaje de error, la línea de código en la que ocurrió y las trazas de pila de los hilos de la aplicación en ese momento), el modelo de tu dispositivo, el sistema operativo y el navegador, la versión de la aplicación y si la sesión terminó con un fallo. En la versión web se añade la página en la que ocurrió el error. En la aplicación para iOS se añaden tu configuración de idioma y zona horaria, el estado del dispositivo en ese momento (memoria libre, nivel de batería y si se está cargando, tamaño y orientación de la pantalla, estado del procesador y temperatura, si el dispositivo tiene jailbreak) y dos números: un número generado al azar para la instalación de la aplicación en ese dispositivo y un resumen de un solo sentido derivado del identificador que Apple asigna a este dispositivo para el desarrollador de esta aplicación, del modelo del dispositivo y de la aplicación. Ninguno de estos números está vinculado a tu cuenta ni te identifica por tu nombre. A este registro no se añaden tu nombre, tu correo, tu número de cuenta, tu ubicación ni tus mensajes; en los errores del propio código de la aplicación, los números de cuenta, de match y de mensaje y las direcciones de correo que aparezcan en el texto del error se eliminan antes de que el registro salga del dispositivo; tu dirección IP no se guarda.',
      'La aplicación no accede a tus contactos, a tu historial de llamadas ni a toda tu fototeca. Del selector de fotos solo se sube la imagen que tú eliges. No se recopila el identificador de publicidad ni se usan herramientas de publicidad o seguimiento de terceros.',
    ],
  },
  {
    heading: 'Finalidades del tratamiento y bases jurídicas',
    body: [
      '• Carta natal y cálculo de compatibilidad. Sin la fecha, la hora y el lugar de nacimiento, la función principal del producto no funciona; estos datos se tratan con tu consentimiento explícito y puedes retirar tu consentimiento eliminando tu cuenta.',
      '• Mostrar personas cercanas. Tu ubicación se usa para encontrar los perfiles que están dentro de tu radio y para mostrar la distancia que los separa a las personas que pueden verte y a las personas a las que les das like. Se basa en el consentimiento explícito.',
      '• Membresía. Tu información de membresía Premium se trata para ofrecer lo que incluye la membresía (likes ilimitados, superlikes, ver a quién le gustas, ordenar por compatibilidad) y para aplicar el límite diario de likes de los miembros gratuitos y el límite semanal de superlikes de los miembros Premium; para estos límites se usan el número y el momento de tus likes recientes (incluidos los superlikes). Es necesario para la celebración y ejecución del contrato (art. 5/2-c de la KVKK).',
      '• Matches y mensajería. Es necesario para la celebración y ejecución del contrato (art. 5/2-c de la KVKK).',
      '• Seguridad. Los registros de bloqueos y denuncias se tratan para prevenir el uso abusivo del servicio; interés legítimo del responsable del tratamiento (art. 5/2-f de la KVKK).',
      '• Estabilidad de la aplicación. Los informes de fallos se tratan para encontrar y corregir errores y para medir con qué frecuencia falla la aplicación; interés legítimo del responsable del tratamiento (art. 5/2-f de la KVKK).',
    ],
  },
  {
    heading: 'Con quién se comparten',
    body: [
      '• Otras personas en Juno. Tu nombre visible, tu edad, tu género, tu carta natal, tus fotos, tu texto de presentación y, si los completaste, tu estatura, tus intereses, tu universidad y tu profesión, junto con la distancia que los separa, se muestran a las personas que pueden verte. Un detalle importante: tu propio radio de búsqueda determina a quién ves tú, no quién te ve a ti. Puede verte cualquier persona cuyo propio radio te alcance; las personas a las que les das like, en cambio, pueden verte aunque su radio no te alcance (siguiente punto). Tu fecha, hora y ciudad de nacimiento no se muestran a otras personas; solo se muestra la carta calculada a partir de ellas. Tus mensajes solo llegan a la persona con la que hiciste match.',
      '• La persona a la que le das like. Cuando le das like a alguien, si esa persona es miembro Premium, te ve en la lista "A quién le gustas": tus datos de perfil enumerados arriba y la distancia que los separa se le muestran aunque su propio radio o sus filtros no te alcancen; también ve si tu like fue un superlike y cuándo se dio. La membresía Premium es gratuita por ahora y se activa con un solo toque, y quien activa la membresía más tarde también ve los likes que recibió antes; por eso debes suponer que todas las personas a las que les das like pueden ver esto. Quien no tiene la membresía activa solo ve que alguien le dio like, si fue un superlike y cuándo se dio; no ve quién es. Si tu tarjeta aparece en Descubrir de un miembro Premium, muestra "Le gustas", o "Te dio un superlike" si le diste un superlike. A las personas que pasaste no se les muestra nada. Sales de la lista cuando tu like recibe respuesta o cuando hay un bloqueo entre ustedes.',
      '• Proveedores de inicio de sesión. Si entras con Apple o Google, ese proveedor verifica tu inicio de sesión y también sabe que iniciaste sesión en Juno; esto está sujeto a sus propias condiciones de privacidad. La aplicación no les envía nada de tu perfil, de tu carta ni de tus mensajes.',
      '• Proveedor de alojamiento. Los datos se guardan en la infraestructura de Supabase, como encargado del tratamiento, en la región de la Unión Europea.',
      '• Proveedor de correo electrónico. Tu código de verificación se envía a través de Resend, como encargado del tratamiento; a este proveedor solo le llegan tu dirección de correo y el contenido del correo, y el envío se hace desde la región de la Unión Europea.',
      '• Distribuidor de la versión web. Cuando abres juno-dating.com en el navegador, la página se sirve a través de Cloudflare, como encargado del tratamiento; Cloudflare ve la dirección IP de la conexión y la página solicitada, y guarda registros. No tiene acceso a la base de datos, a las fotos ni a los mensajes. Si usas la aplicación de iOS, esta vía no interviene en absoluto.',
      '• Proveedor del dominio y del reenvío de correo. Cuando escribes a la dirección de contacto que figura en este texto, tu correo nos llega a través del servicio de reenvío de Namecheap, como encargado del tratamiento, y se guarda en el buzón donde se lee. Los registros DNS del dominio juno-dating.com también los mantiene Cloudflare.',
      '• Proveedor de informes de fallos. Los informes de fallos, tanto de la aplicación para iOS como de la versión web, se envían a la infraestructura de Sentry (Functional Software, Inc.), como encargado del tratamiento, y se guardan en la región de la Unión Europea (Alemania). A Sentry no se le envía nada de tu perfil, tu carta natal, tus fotos ni tus mensajes; no tiene acceso a la base de datos, a las fotos ni a los mensajes.',
      '• Fuera de estos, no se transfieren a ningún tercero, no se venden ni se comparten con fines de marketing. Ante un requerimiento legal, pueden compartirse en la medida que exija la normativa.',
    ],
  },
  {
    heading: 'Plazo de conservación',
    body: [
      'Tus datos se guardan mientras tu cuenta siga abierta. Cuando eliminas tu cuenta desde la aplicación, se eliminan tu perfil, tu carta, tus fotos, tus likes, tus matches y tus mensajes.',
      'Hay dos excepciones. Los registros de denuncias presentadas sobre ti se siguen guardando para que el rastro del abuso no se pierda al eliminar la cuenta; en este registro se eliminan la identidad de la persona denunciada y el texto de la denuncia, y solo quedan la existencia de la denuncia, su motivo y su fecha. Los registros de auditoría de la infraestructura de identidad (eventos de registro, inicio de sesión y eliminación de cuenta) también permanecen, incluida la dirección de correo. Hoy no hay un plazo de eliminación automática definido para estos dos tipos de registro; cuando se fije un plazo, este texto se actualizará.',
      'Una cuenta abierta con Apple o Google y abandonada sin introducir los datos de nacimiento se elimina con “Entrar con otra cuenta” en la pantalla de datos de nacimiento. Si la eliminación no puede hacerse en ese momento (por ejemplo, si no hay conexión), la pantalla lo indica y la cuenta se mantiene; si cierras la pantalla y la dejas, también se mantiene. En ambos casos puedes volver a entrar con el mismo proveedor y eliminarla allí.',
      'Los informes de fallos se guardan en Sentry durante 90 días como máximo y después se eliminan automáticamente.',
    ],
  },
  {
    heading: 'Tus derechos',
    body: [
      'Conforme al art. 11 de la KVKK, tienes derecho a saber si tus datos personales se tratan o no, a solicitar información si se han tratado, a conocer la finalidad del tratamiento, a pedir que se corrijan si se trataron de forma incompleta o incorrecta y que se eliminen cuando se den las condiciones, y a oponerte si el tratamiento produce un resultado en tu contra.',
      'Puedes corregir tu información de perfil, quitar tus fotos y eliminar tu cuenta por completo desde la aplicación. Para otras solicitudes, puedes escribir a la dirección de contacto indicada arriba.',
    ],
  },
  {
    heading: 'Menores',
    body: [
      'La aplicación no está dirigida a menores de 18 años. Durante el registro no se puede crear una cuenta cuya fecha de nacimiento indique menos de 18 años.',
    ],
  },
  {
    heading: 'Cambios',
    body: [
      'Si este texto cambia, la versión actualizada se publica en la misma dirección y se actualiza la fecha de arriba.',
    ],
  },
  {
    heading: 'Fuentes y licencias',
    body: [
      '• Lista de ciudades: GeoNames (CC BY 4.0).',
      '• Posiciones planetarias: astronomy-engine (MIT).',
      '• Los textos de interpretación astrológica son propios de la aplicación; sus fuentes se enumeran en el archivo docs/astro-sources.md.',
    ],
  },
];
