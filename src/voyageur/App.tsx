import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import i18n from './i18n.ts';
import { usePax } from './store.ts';
import { TabBar, BASE } from './ui.tsx';
import { HomeScreen, ItineraryScreen, RouteDetailScreen, StationScreen, LineScreen, TrafficScreen, TicketsScreen, TicketQrScreen, BuyScreen, ControlScreen, AccountScreen, ReportScreen } from './Screens.tsx';

function Shell() {
  const lang = usePax((s) => s.lang);
  useEffect(() => {
    void i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col overflow-hidden bg-[var(--bg)] shadow-xl">
      <main className={`min-h-0 grow overflow-y-auto`}>
        <Routes>
          <Route path={BASE} element={<HomeScreen />} />
          <Route path={`${BASE}/itineraire`} element={<ItineraryScreen />} />
          <Route path={`${BASE}/trajet`} element={<RouteDetailScreen />} />
          <Route path={`${BASE}/gare/:name`} element={<StationScreen />} />
          <Route path={`${BASE}/ligne/:key`} element={<LineScreen />} />
          <Route path={`${BASE}/trafic`} element={<TrafficScreen />} />
          <Route path={`${BASE}/billets`} element={<TicketsScreen />} />
          <Route path={`${BASE}/billets/:id`} element={<TicketQrScreen />} />
          <Route path={`${BASE}/acheter`} element={<BuyScreen />} />
          <Route path={`${BASE}/compte`} element={<AccountScreen />} />
          <Route path={`${BASE}/signaler`} element={<ReportScreen />} />
          <Route path={`${BASE}/controle`} element={<ControlScreen />} />
        </Routes>
      </main>
      <TabBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default function App() {
  return <BrowserRouter><Shell /></BrowserRouter>;
}
