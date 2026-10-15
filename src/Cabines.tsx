import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { RAMES, cabPayload } from '../shared/domain.ts';
import { useT } from './util.ts';

export function Cabines() {
  const t = useT();
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    void Promise.all(RAMES.map(async (r) => [r, await QRCode.toDataURL(cabPayload(r), { margin: 1, width: 400 })] as const))
      .then((e) => setUrls(Object.fromEntries(e)));
  }, []);
  return (
    <div className="page">
      <h1 style={{ margin: 0, font: '600 40px var(--display)' }}>{t('cabsTitle')}</h1>
      <button className="btn noprint" onClick={() => print()}>{t('print')}</button>
      <div className="qrs">{RAMES.map((r) => <figure key={r}>{urls[r] && <img src={urls[r]} alt={cabPayload(r)} />}<b>Rame {r} · A</b></figure>)}</div>
    </div>
  );
}
