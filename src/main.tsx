import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/400.css'; import '@fontsource/barlow/600.css'; import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/600.css'; import '@fontsource/barlow-condensed/700.css';
import '@fontsource/noto-kufi-arabic/400.css'; import '@fontsource/noto-kufi-arabic/700.css';
import './styles.css';
import { useStore } from './store.ts';
import { Driver } from './Driver.tsx';
import { Cabines } from './Cabines.tsx';

function App() {
  const [ready, setReady] = useState(useStore.persist.hasHydrated());
  const { lang, theme } = useStore();
  useEffect(() => useStore.persist.onFinishHydration(() => setReady(true)), []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-theme', theme);
  }, [lang, theme]);
  if (!ready) return null;
  if (location.pathname.startsWith('/cabines')) return <Cabines />;
  return <Driver />;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
