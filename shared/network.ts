// Passenger-side network model: lines, stations (approximate coordinates), theoretical frequencies.
export type LineKey = 'E' | 'O' | 'Z' | 'A' | 'GO' | 'GA' | 'GB' | 'GS';
export type Status = 'ok' | 'warn' | 'bad';
export interface Line { key: LineKey; code: string; name: string; kind: 'sub' | 'main'; freq: number; color: string; stations: string[] }

export const COORDS: Record<string, [number, number]> = {
  'Alger': [3.06, 36.77], 'Agha': [3.059, 36.7625], 'Les Ateliers': [3.07, 36.75], 'Hussein Dey': [3.099, 36.743],
  'Caroubier': [3.117, 36.739], 'El Harrach': [3.135, 36.728], 'Oued Smar': [3.156, 36.711], 'Bab Ezzouar': [3.185, 36.716],
  'Dar El Beïda': [3.212, 36.712], 'Rouiba': [3.28, 36.738], 'Réghaïa': [3.34, 36.744], 'Boudouaou': [3.408, 36.73],
  'Corso': [3.439, 36.743], 'Boumerdès': [3.472, 36.76], 'Thénia': [3.55, 36.727], 'Aéroport': [3.215, 36.693],
  'Gué de Constantine': [3.033, 36.703], 'Baba Ali': [3.0, 36.66], 'Birtouta': [2.986, 36.633], 'Boufarik': [2.91, 36.575],
  'Béni Mered': [2.866, 36.533], 'Blida': [2.828, 36.472], 'Chiffa': [2.75, 36.45], 'Mouzaïa': [2.68, 36.456],
  'El Affroun': [2.628, 36.464], 'Tessala El Merdja': [2.95, 36.61], 'Sidi Abdellah': [2.88, 36.65], 'Zéralda': [2.845, 36.71],
  'Khemis Miliana': [2.227, 36.262], 'Chlef': [1.334, 36.165], 'Relizane': [0.556, 35.737], 'Mohammadia': [0.072, 35.594],
  'Oran': [-0.633, 35.697], 'Bouira': [3.902, 36.374], 'Bordj Bou Arréridj': [4.761, 36.073], 'Sétif': [5.413, 36.191],
  'Constantine': [6.615, 36.365], 'Annaba': [7.767, 36.9], 'Béni Mansour': [4.334, 36.493], 'Béjaïa': [5.056, 36.751],
  'Sidi Bel Abbès': [-0.63, 35.19], 'Saïda': [0.15, 34.83], 'Béchar': [-2.216, 31.616],
};

const L = (key: LineKey, code: string, name: string, kind: Line['kind'], freq: number, color: string, stations: string[]): Line =>
  ({ key, code, name, kind, freq, color, stations });

export const LINES: Record<LineKey, Line> = {
  E: L('E', 'E', 'Alger – Thénia', 'sub', 15, '#1E5AA8', ['Alger', 'Agha', 'Les Ateliers', 'Hussein Dey', 'Caroubier', 'El Harrach', 'Oued Smar', 'Bab Ezzouar', 'Dar El Beïda', 'Rouiba', 'Réghaïa', 'Boudouaou', 'Corso', 'Boumerdès', 'Thénia']),
  O: L('O', 'O', 'Alger – El Affroun', 'sub', 20, '#D9731A', ['Alger', 'Agha', 'Hussein Dey', 'El Harrach', 'Gué de Constantine', 'Baba Ali', 'Birtouta', 'Boufarik', 'Béni Mered', 'Blida', 'Chiffa', 'Mouzaïa', 'El Affroun']),
  Z: L('Z', 'Z', 'Birtouta – Zéralda', 'sub', 30, '#2E8B57', ['Birtouta', 'Tessala El Merdja', 'Sidi Abdellah', 'Zéralda']),
  A: L('A', 'A', 'Agha – Aéroport', 'sub', 30, '#7A4FB0', ['Agha', 'El Harrach', 'Bab Ezzouar', 'Aéroport']),
  GO: L('GO', 'GL', 'Alger – Oran', 'main', 120, '#0B1D3A', ['Alger', 'Blida', 'El Affroun', 'Khemis Miliana', 'Chlef', 'Relizane', 'Mohammadia', 'Oran']),
  GA: L('GA', 'GL', 'Alger – Annaba', 'main', 180, '#0B1D3A', ['Alger', 'Thénia', 'Bouira', 'Bordj Bou Arréridj', 'Sétif', 'Constantine', 'Annaba']),
  GB: L('GB', 'GL', 'Alger – Béjaïa', 'main', 240, '#0B1D3A', ['Alger', 'Thénia', 'Bouira', 'Béni Mansour', 'Béjaïa']),
  GS: L('GS', 'GL', 'Oran – Béchar', 'main', 720, '#0B1D3A', ['Oran', 'Sidi Bel Abbès', 'Saïda', 'Béchar']),
};
export const LINE_KEYS = Object.keys(LINES) as LineKey[];

export const STATIONS: Record<string, LineKey[]> = {};
for (const k of LINE_KEYS) for (const s of LINES[k].stations) (STATIONS[s] ??= []).push(k);
export const STATION_NAMES = Object.keys(STATIONS).sort((a, b) => a.localeCompare(b, 'fr'));

/** Driver trains run on the Alger–Oran main line. */
export const TRAIN_LINE: Record<string, LineKey> = { '1042': 'GO', '1047': 'GO' };

export interface LineStatus { status: Status; title?: { fr: string; ar: string }; detail?: { fr: string; ar: string }; since?: number; train?: string }
