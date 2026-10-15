export type L = 'fr' | 'ar';
const D = {
  title: ['Centre de pilotage', 'مركز القيادة'], live: ['En direct', 'مباشر'], offline: ['Hors connexion', 'غير متصل'],
  k_running: ['En circulation', 'قيد السير'], k_inc: ['Incidents actifs', 'حوادث نشطة'], k_delay: ['Retard cumulé', 'التأخير'],
  k_decl: ['Déclarations', 'التصريحات'], k_stop: ['Arrêt moyen', 'متوسط التوقف'], k_reports: ['Signalements', 'البلاغات'],
  trains: ['Trains en service', 'القطارات في الخدمة'], none: ['Aucun train en service. Lancez une prise de service depuis la cabine.', 'لا قطار في الخدمة. ابدأ الخدمة من المقصورة.'],
  c_train: ['Train', 'القطار'], c_rame: ['Rame', 'العربة'], c_state: ['État', 'الحالة'], c_cause: ['Cause', 'السبب'],
  c_since: ['Depuis', 'منذ'], c_delay: ['Retard', 'التأخير'], c_msg: ['Messages', 'الرسائل'], c_act: ['Action', 'إجراء'],
  running: ['En marche', 'في السير'], stopped: ['À l\'arrêt', 'متوقف'], onTime: ['À l\'heure', 'في الموعد'],
  message: ['Message', 'رسالة'], sendMsg: ['Message au conducteur', 'رسالة إلى السائق'], send: ['Envoyer', 'إرسال'], cancel: ['Annuler', 'إلغاء'],
  templates: ['Messages types', 'رسائل جاهزة'], msgFr: ['Texte en français', 'النص بالفرنسية'], msgAr: ['Texte en arabe', 'النص بالعربية'],
  synoptic: ['Synoptique Alger – Oran', 'مخطط الخط الجزائر – وهران'], tdg: ['Graphique de circulation', 'مخطط الحركة'],
  causes: ['Causes des arrêts du jour', 'أسباب التوقف اليوم'], feed: ['Déclarations conducteurs', 'تصريحات السائقين'],
  reports: ['Signalements voyageurs', 'بلاغات المسافرين'], pax: ['Voyageurs voient', 'يراه المسافرون'],
  acked: ['Lu', 'مقروء'], unread: ['Non lu', 'غير مقروء'], noData: ['Aucune donnée', 'لا بيانات'], min: ['min', 'د'],
  e_declare: ['Déclaration', 'تصريح'], e_modify: ['Modification', 'تعديل'], e_extend: ['Prolongation', 'تمديد'], e_resume: ['Reprise', 'استئناف'],
  e_ack: ['Accusé', 'إشعار'], e_swap: ['Changement de rame', 'تغيير العربة'],
  r_clean: ['Propreté', 'النظافة'], r_safety: ['Sécurité', 'الأمن'], r_aircon: ['Climatisation', 'التكييف'], r_info: ['Information', 'المعلومات'], r_other: ['Autre', 'آخر'],
  now: ['Maintenant', 'الآن'], day: ['Jour', 'نهار'], night: ['Nuit', 'ليل'],
  t1: ['Reprise autorisée.', 'الاستئناف مسموح.'], t2: ['Maintenez l\'arrêt, un agent arrive.', 'ابق متوقفا، سيصل عون.'],
  t3: ['Croisement à Khemis Miliana : attendez le train 1043.', 'تقاطع في خميس مليانة: انتظر القطار 1043.'],
  t4: ['Appelez le régulateur dès que possible.', 'اتصل بالمنظّم في أقرب وقت.'],
} as const;
export type K = keyof typeof D;
export const tx = (l: L, k: K) => D[k][l === 'ar' ? 1 : 0];
export const TEMPLATES: K[] = ['t1', 't2', 't3', 't4'];
