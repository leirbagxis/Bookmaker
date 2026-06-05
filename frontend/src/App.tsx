import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext';
import { BetSlipProvider } from './context/BetSlipContext';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { BetSlip } from './components/BetSlip';
import { HomePage } from './pages/HomePage';
import { EventPage } from './pages/EventPage';
import { EmptyState } from './components/EmptyState';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page-placeholder">
      <EmptyState
        title={title}
        description="Funcionalidade em breve. Esta é uma demonstração."
      />
    </div>
  );
}

function App() {
  return (
    <WebSocketProvider>
      <BetSlipProvider>
        <BrowserRouter>
          <div className="app">
            <Header />
            <main className="app__main">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/event/:eventId" element={<EventPage />} />
                <Route path="/live" element={<PlaceholderPage title="Ao vivo" />} />
                <Route path="/betslip" element={<PlaceholderPage title="Seu bilhete aparece aqui" />} />
                <Route path="/profile" element={<PlaceholderPage title="Perfil (simulado)" />} />
                <Route path="*" element={<EmptyState title="Página não encontrada" />} />
              </Routes>
            </main>
            <BetSlip />
            <footer className="app__footer">
              Projeto demonstrativo. Apostas simuladas. Não envolve dinheiro real.
            </footer>
            <BottomNavigation />
          </div>
        </BrowserRouter>
      </BetSlipProvider>
    </WebSocketProvider>
  );
}

export default App;
