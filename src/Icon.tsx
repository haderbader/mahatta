import { ICONS } from './util.ts';
export const Icon = ({ k }: { k: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden dangerouslySetInnerHTML={{ __html: ICONS[k] }} />
);
