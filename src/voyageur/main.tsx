import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/400.css'; import '@fontsource/barlow/600.css'; import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/600.css'; import '@fontsource/barlow-condensed/700.css';
import '@fontsource/noto-kufi-arabic/400.css'; import '@fontsource/noto-kufi-arabic/700.css';
import './app.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
