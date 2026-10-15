// Domain data shared by the cab app, the control-room page and the server.
export type Lang = 'fr' | 'ar';
export type Tr = Record<Lang, string>;
const T = (fr: string, ar: string): Tr => ({ fr, ar });

export interface Cause {
  k: string;
  n: Tr;
  s: Tr;
  sub: Tr[];
  pax: Tr;
  sens?: boolean;
}

export const CAUSES: Cause[] = [
  { k: 'depart', n: T('Non-départ', 'عدم الانطلاق'), s: T("Attente d'autorisation", 'انتظار الإذن'),
    sub: [T("Attente d'autorisation", 'انتظار الإذن'), T('Retard du personnel', 'تأخر الطاقم'), T('Train précédent', 'القطار السابق')],
    pax: T("Départ retardé, en attente d'autorisation.", 'تأخر الانطلاق في انتظار الإذن.') },
  { k: 'slow', n: T('Ralentissement', 'تباطؤ'), s: T('Limitation, travaux', 'تحديد السرعة، أشغال'),
    sub: [T('Limitation temporaire', 'تحديد مؤقت'), T('Travaux sur la voie', 'أشغال على السكة'), T('Météo', 'الطقس')],
    pax: T('Marche ralentie sur ce tronçon.', 'سير بطيء في هذا المقطع.') },
  { k: 'pn', n: T('Passage à niveau', 'ممر مستوي'), s: T('Obstacle, PN ouvert', 'عائق، ممر مفتوح'),
    sub: [T('Véhicule sur la voie', 'مركبة على السكة'), T('Barrières non fermées', 'حواجز غير مغلقة'), T('Piétons sur la voie', 'مشاة على السكة')],
    pax: T('Arrêt au passage à niveau, pour votre sécurité.', 'توقف عند الممر المستوي من أجل سلامتكم.') },
  { k: 'acc', n: T('Accident', 'حادث'), s: T('Collision, personne', 'اصطدام، شخص'),
    sub: [T('Collision', 'اصطدام'), T('Personne sur la voie', 'شخص على السكة'), T('Animal', 'حيوان')],
    pax: T("Incident d'exploitation, train à l'arrêt.", 'حادث استغلال، القطار متوقف.'), sens: true },
  { k: 'panne', n: T('Panne', 'عطل'), s: T('Traction, freins, portes', 'الجر، الفرامل، الأبواب'),
    sub: [T('Traction', 'الجر'), T('Freins', 'الفرامل'), T('Portes', 'الأبواب'), T('Climatisation', 'التكييف')],
    pax: T('Incident technique sur le train.', 'عطل تقني في القطار.') },
  { k: 'infra', n: T('Infrastructure', 'البنية التحتية'), s: T('Signal, caténaire, sable', 'إشارة، خط كهربائي، رمال'),
    sub: [T('Signal fermé', 'إشارة مغلقة'), T('Caténaire', 'الخط الكهربائي'), T('Ensablement', 'زحف الرمال'), T('Vandalisme', 'تخريب')],
    pax: T("Incident sur la voie, train à l'arrêt.", 'حادث على السكة، القطار متوقف.') },
  { k: 'exploit', n: T('Exploitation', 'الاستغلال'), s: T('Croisement, correspondance', 'تقاطع، ربط'),
    sub: [T('Attente de croisement', 'انتظار التقاطع'), T('Attente de correspondance', 'انتظار الربط'), T('Voie occupée', 'السكة مشغولة')],
    pax: T("Attente d'un autre train, reprise prochaine.", 'انتظار قطار آخر، استئناف قريب.') },
  { k: 'voy', n: T('Voyageurs', 'المسافرون'), s: T('Malaise, sécurité à bord', 'وعكة، أمن على المتن'),
    sub: [T("Malaise d'un voyageur", 'وعكة مسافر'), T('Incident de sécurité', 'حادث أمني'), T("Signal d'alarme", 'إنذار')],
    pax: T('Intervention à bord, merci de votre patience.', 'تدخل على متن القطار، شكرا لصبركم.'), sens: true },
];

export interface TrainDef { n: string; r: Tr; h: string; stops: [string, string][] }
export const TRAINS: TrainDef[] = [
  { n: '1042', r: T('Alger → Oran', 'الجزائر ← وهران'), h: '08:15',
    stops: [['Alger', '08:15'], ['Blida', '08:52'], ['El Affroun', '09:10'], ['Khemis Miliana', '09:58'], ['Chlef', '10:41'], ['Relizane', '11:52'], ['Mohammadia', '12:31'], ['Oran', '13:15']] },
  { n: '1047', r: T('Oran → Alger', 'وهران ← الجزائر'), h: '14:30',
    stops: [['Oran', '14:30'], ['Mohammadia', '15:14'], ['Relizane', '15:53'], ['Chlef', '17:04'], ['Khemis Miliana', '17:47'], ['El Affroun', '18:35'], ['Blida', '18:53'], ['Alger', '19:30']] },
];

/** Rames equipped with a cab QR code. Payload printed in the cab: `mahatta:cab:<rame>:<cab>`. */
export const RAMES = ['Z-217', 'Z-305'];
export const cabPayload = (rame: string, cab = 'A') => `mahatta:cab:${rame}:${cab}`;
export function parseCab(payload: string): { rame: string; cab: string } | null {
  const m = /^mahatta:cab:([A-Z]-\d+):([A-Z])$/.exec(payload.trim());
  return m && RAMES.includes(m[1]) ? { rame: m[1], cab: m[2] } : null;
}

/** Message shown to passengers. Sensitive causes only ever expose the neutral wording. */
export function paxMessage(c: Cause, est: number): Tr {
  const add: Tr = est ? { fr: ` Reprise estimée dans ${est} min.`, ar: ` الاستئناف المتوقع خلال ${est} د.` } : { fr: '', ar: '' };
  return { fr: c.pax.fr + add.fr, ar: c.pax.ar + add.ar };
}

export type EventKind = 'declare' | 'extend' | 'modify' | 'resume' | 'ack' | 'swap';
export interface DriverEvent {
  clientId: string;
  kind: EventKind;
  at: number; // client timestamp (ms), kept even when sent late
  data: Record<string, unknown>;
}
