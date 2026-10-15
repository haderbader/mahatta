import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Icon } from './Icon.tsx';
import { useT } from './util.ts';
import { cabPayload } from '../shared/domain.ts';

/** Real camera QR scan (qr-scanner). The demo button stands in when no camera is available. */
export function Scan({ label, demoRame, onResult }: { label: string; demoRame: string; onResult: (payload: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || !video.current) return;
    const sc = new QrScanner(video.current, (r) => { sc.stop(); setOpen(false); onResult(r.data); },
      { preferredCamera: 'environment', highlightScanRegion: true, returnDetailedScanResult: true });
    sc.start().catch(() => { setErr(true); setOpen(false); });
    return () => { sc.stop(); sc.destroy(); };
  }, [open, onResult]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {open ? <video ref={video} className="cam" playsInline muted /> : (
        <button className="scan" onClick={() => { setErr(false); setOpen(true); }}>
          <Icon k="scan" /><span>{label}</span>
        </button>)}
      {err && <span className="status">{t('noCamera')}</span>}
      <div className="demo"><span>{t('demo')}</span>
        <button onClick={() => onResult(cabPayload(demoRame))}>{t('simScan')} {demoRame}</button></div>
    </div>
  );
}
