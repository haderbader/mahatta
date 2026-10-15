import { io } from 'socket.io-client';
import QRCode from 'qrcode';

const TABS = ['conducteur', 'centre', 'voyageur', 'tout'] as const;
type Tab = (typeof TABS)[number];
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const stage = $('#stage');

/** Device presets: the hash picks the interface, so a tablet / laptop / phone can each open their own. */
function pick(): Tab {
  const h = location.hash.slice(1) as Tab;
  if (TABS.includes(h)) return h;
  return innerWidth < 700 ? 'voyageur' : 'conducteur';
}
function show(tab: Tab) {
  stage.dataset.tab = tab;
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => {
    if (b.closest('.tabs')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  });
  // iframes load once and stay mounted so each keeps its live socket
  const wanted = tab === 'tout' ? ['conducteur', 'centre', 'voyageur'] : [tab];
  for (const name of wanted) {
    const f = document.querySelector<HTMLIFrameElement>(`[data-pane=${name}] iframe`)!;
    if (!f.src) f.src = f.dataset.src!;
  }
}
document.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((b) =>
  b.addEventListener('click', () => { location.hash = b.dataset.tab!; }));
addEventListener('hashchange', () => show(pick()));
show(pick());
// keep the other two warm so switching tabs is instant and sockets are already connected
setTimeout(() => document.querySelectorAll<HTMLIFrameElement>('iframe').forEach((f) => { if (!f.src) f.src = f.dataset.src!; }), 1500);

const toast = (m: string) => {
  const t = $('#toast');
  t.textContent = m; t.hidden = false;
  setTimeout(() => (t.hidden = true), 2400);
};

const live = $('#live');
const s = io();
s.on('connect', () => live.classList.add('on'));
s.on('disconnect', () => live.classList.remove('on'));

$('#reset').addEventListener('click', async () => {
  if (!confirm('Réinitialiser la démo ? Services, déclarations, messages et signalements seront effacés.')) return;
  await fetch('/api/demo/reset', { method: 'POST' });
  toast('Démo réinitialisée');
  document.querySelectorAll<HTMLIFrameElement>('iframe').forEach((f) => { if (f.src) f.contentWindow?.location.reload(); });
});

$('#share').addEventListener('click', async () => {
  const info = (await fetch('/api/demo/info').then((r) => r.json())) as { addresses: string[]; port: number };
  const host = info.addresses[0] ?? location.hostname;
  const port = location.port || String(info.port);
  const base = `${location.protocol}//${host}:${port}/demo`;
  const items: [string, string, string][] = [
    ['Tablette', 'Conducteur', `${base}#conducteur`],
    ['Ordinateur', 'Centre de pilotage', `${base}#centre`],
    ['Téléphone', 'Voyageur', `${base}#voyageur`],
  ];
  const wrap = $('#qrs');
  wrap.innerHTML = '';
  for (const [dev, name, url] of items) {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.alt = url;
    img.src = await QRCode.toDataURL(url, { margin: 1, width: 340 });
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<b>${dev} · ${name}</b><code>${url}</code>`;
    fig.append(img, cap);
    wrap.append(fig);
  }
  $<HTMLDialogElement>('#dlg').showModal();
});
