// UI strings (fr / ar) ported from the prototype.
import type { Tr } from '../shared/domain.ts';
const T = (fr: string, ar: string): Tr => ({ fr, ar });
export const S = {
 service:T('Prise de service','بداية الخدمة'), scanCab:T('Scanner le QR code de la cabine','امسح رمز QR الخاص بالمقصورة'), scanned:T('Cabine identifiée','تم التعرف على المقصورة'),
 chooseTrain:T('Choisir le train du roulement','اختر القطار'), start:T('Commencer le service','ابدأ الخدمة'), driver:T('Conducteur','السائق'),
 net:T('Réseau 4G','شبكة 4G'), offline:T('Hors réseau','بدون شبكة'), end:T('Fin de service','نهاية الخدمة'),
 trip:T('Trajet','الرحلة'), speed:T('km/h','كم/سا'), running:T('En marche','في السير'), stopped:T('À l\'arrêt depuis','متوقف منذ'),
 next:T('Prochain arrêt','المحطة القادمة'), delay:T('Retard','التأخير'), onTime:T('À l\'heure','في الموعد'),
 why:T('Train à l\'arrêt ? Déclarez la cause.','القطار متوقف؟ صرّح بالسبب.'), oneTap:T('Un appui suffit. Le centre et les voyageurs sont prévenus.','لمسة واحدة تكفي. يتم إبلاغ المركز والمسافرين.'),
 remind:T('Arrêt détecté depuis plus d\'une minute : déclarez la cause.','تم رصد توقف منذ أكثر من دقيقة: صرّح بالسبب.'),
 rame:T('Changement de matériel','تغيير العتاد'), messages:T('Centre de pilotage','مركز القيادة'), queue:T('Envois','الإرسالات'), history:T('Historique du service','سجل الخدمة'),
 detail:T('Précisez (facultatif)','حدّد (اختياري)'), dur:T('Reprise estimée','الاستئناف المتوقع'), unknown:T('Inconnue','غير معروف'),
 preview:T('Message affiché aux voyageurs','الرسالة المعروضة للمسافرين'), sensitiveNote:T('Cause sensible : les voyageurs voient un message neutre. Le détail va au régulateur, qui valide.','سبب حساس: يرى المسافرون رسالة محايدة. التفاصيل تذهب للمنظّم.'),
 send:T('Envoyer','إرسال'), cancel:T('Annuler','إلغاء'), sent:T('Reçu par le centre','استلمها المركز'), pending:T('En attente de réseau','في انتظار الشبكة'),
 since:T('depuis','منذ'), extend:T('Prolonger','تمديد'), resume:T('Reprise de marche','استئناف السير'), update:T('Modifier la cause','تعديل السبب'),
 ack:T('Bien reçu','تم الاستلام'), acked:T('Lu','مقروء'), confirm:T('Confirmer la bascule','تأكيد التغيير'), scanNew:T('Scanner le QR code de la nouvelle rame','امسح رمز QR للعربة الجديدة'),
 swapDone:T('Train basculé sur la rame','تم نقل القطار إلى العربة'), keep:T('Les voyageurs gardent le suivi du train.','يحتفظ المسافرون بتتبع القطار.'),
 day:T('Jour','نهار'), night:T('Nuit','ليل'), demo:T('Démo :','عرض:'), simStop:T('Simuler un arrêt','محاكاة توقف'), simRun:T('Simuler la reprise','محاكاة الاستئناف'), simMsg:T('Message du centre','رسالة من المركز'),
 none:T('Aucun envoi','لا إرسال'), minutes:T('min','د'), endConfirm:T('Terminer le service ? Le train sera détaché de la rame.','إنهاء الخدمة؟ سيتم فصل القطار عن العربة.'), yes:T('Terminer','إنهاء'),

 noCamera:T('Caméra indisponible : utilisez la démo.','الكاميرا غير متاحة: استعمل العرض.'), simScan:T('Simuler le scan','محاكاة المسح'),
 badCab:T('QR code inconnu','رمز QR غير معروف'), sameRame:T('C\'est déjà la rame en service','هذه هي العربة الحالية'),
 apiDown:T('Serveur injoignable','الخادم غير متاح'), gps:T('GPS réel','GPS حقيقي'),
 train:T('Train','القطار'), rameCur:T('Rame actuelle','العربة الحالية'), rameNew:T('Nouvelle rame','العربة الجديدة'),
 ctrlTitle:T('Centre de pilotage (démo)','مركز القيادة (عرض)'), activeSvc:T('Services en cours','الخدمات الجارية'),
 feed:T('Déclarations reçues','التصريحات المستلمة'), sendMsg:T('Message au conducteur','رسالة إلى السائق'),
 msgFr:T('Texte en français','النص بالفرنسية'), msgAr:T('Texte en arabe','النص بالعربية'), toTrain:T('Train','القطار'),
 paxSees:T('Voyageurs','المسافرون'), acknowledged:T('Lu par le conducteur','قرأها السائق'), noService:T('Aucun service en cours','لا توجد خدمة جارية'),
 cabsTitle:T('QR codes des cabines','رموز QR للمقصورات'), print:T('Imprimer','طباعة')
} as const satisfies Record<string, Tr>;
