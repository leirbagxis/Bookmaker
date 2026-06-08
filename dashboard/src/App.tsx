import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Shop from './pages/Shop';
import Ranking from './pages/Ranking';
import Admin from './pages/Admin';
import GovDashboard from './pages/GovDashboard';
import axios from 'axios';

declare global {
  interface Window {
    Telegram: any;
  }
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const authenticate = async () => {
      try {
        const tg = window.Telegram?.WebApp;
        if (tg) {
          tg.ready();
          tg.expand();
        }
        
        // Extração robusta do botId (Pega o primeiro segmento do path)
        const pathname = location.pathname;
        const segments = pathname.split('/').filter(Boolean);
        let botId = segments[0];

        const isNumeric = (val: string) => /^\d+$/.test(val);

        // FLUXO GOV: Se a rota for /gov, tentamos autenticar como Super Admin
        if (botId === 'gov') {
          if (tg?.initData) {
            try {
              await axios.post('/api/v1/auth/gov-login', {
                init_data: tg.initData
              }, { withCredentials: true });
              setIsAuthed(true);
              setLoading(false);
              return;
            } catch (err) {
              console.error("GOV Auth failed", err);
              setError("Acesso restrito: Você não é um administrador da plataforma.");
              setLoading(false);
              return;
            }
          } else {
             // Modo dev para gov
             setIsAuthed(true);
             setLoading(false);
             return;
          }
        }

        // Se o botId não for numérico ou for um dos nossos prefixos de gateway, tentamos identificar
		if (!botId || !isNumeric(botId) || botId === 'gateway' || botId === 'app') {
		  if (tg?.initData) {
			try {
			  const startParam = tg?.initDataUnsafe?.start_param;
			  const identifyPayload: { init_data: string; bot_id?: number } = {
				init_data: tg.initData
			  };
			  if (startParam && isNumeric(startParam)) {
				identifyPayload.bot_id = Number(startParam);
			  }

			  const idResp = await axios.post('/api/v1/auth/identify', {
				...identifyPayload
			  }, { withCredentials: true });
			  botId = idResp.data.bot_id.toString();
              if (idResp.data.role) {
                localStorage.setItem(`bot_${botId}_role`, idResp.data.role);
              }
              
              // Determinar rota de destino baseada no start_param
			  let targetPage = 'dashboard';
              
              if (startParam) {
                if (startParam === 'gov') {
                  navigate('/gov', { replace: true });
                  return;
                }
                if (startParam === 'shop' || startParam === 'store') targetPage = 'store';
                else if (startParam === 'ranking') targetPage = 'ranking';
                else if (startParam === 'inventory' || startParam === 'inv') targetPage = 'inventory';
                else if (startParam === 'admin') targetPage = 'admin';
              }

              // Redirecionamento forçado para a URL correta com botId
              navigate(`/${botId}/${targetPage}`, { replace: true });
              setIsAuthed(true);
              setLoading(false);
              return;
            } catch (err: any) {
              console.error("Identification failed", err);
              setError("Este bot não está registrado na plataforma ou o acesso expirou.");
              setLoading(false);
              return;
            }
          } else {
            // Se não estiver no Telegram e não houver botId
            setError("ID do bot não fornecido.");
            setLoading(false);
            return;
          }
        }

        // Lógica de Redirecionamento via start_param (Direct Link) quando o botId JÁ existe
        const startParam = tg?.initDataUnsafe?.start_param;
        if (startParam && (segments.length === 1 || (segments.length === 2 && segments[1] === 'dashboard'))) {
          if (startParam === 'shop' || startParam === 'store') {
            navigate(`/${botId}/store`, { replace: true });
            return;
          }
          if (startParam === 'ranking') {
            navigate(`/${botId}/ranking`, { replace: true });
            return;
          }
          if (startParam === 'inventory' || startParam === 'inv') {
            navigate(`/${botId}/inventory`, { replace: true });
            return;
          }
          if (startParam === 'admin') {
            navigate(`/${botId}/admin`, { replace: true });
            return;
          }
        }

        if (tg?.initData && botId && isNumeric(botId)) {
          try {
            const response = await axios.post(`/api/v1/bots/${botId}/auth/login`, {
              init_data: tg.initData
            }, { withCredentials: true });
            
            if (response.data.role) {
              localStorage.setItem(`bot_${botId}_role`, response.data.role);
            }
            setIsAuthed(true);
          } catch (err: any) {
            console.error("Auth failed", err);
            setError(`Falha na autenticação: ${err.response?.data?.error || err.message}`);
          }
        } else if (!tg?.initData) {
          // Dev mode ou acesso externo
          setIsAuthed(true); 
        }
      } catch (e: any) {
        console.error("Init error", e);
        setError(`Erro de inicialização: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, [location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-black border-t-primary rounded-full animate-spin mb-4"></div>
        <div className="text-black font-black uppercase text-[10px] tracking-[0.3em]">
          Iniciando Sessão...
        </div>
      </div>
    );
  }

  if (error && !isAuthed) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-10">
        <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[2rem] text-center max-w-sm shadow-xl">
          <div className="text-red-500 font-black uppercase text-xs tracking-[0.2em] mb-4">Erro Crítico</div>
          <div className="text-red-900 text-sm font-bold uppercase tracking-tight leading-relaxed">{error}</div>
          <button onClick={() => navigate(0)} className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Recarregar Sessao</button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/:botId" element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="store" element={<Shop />} />
        <Route path="shop" element={<Navigate to="../store" replace />} />
        <Route path="inventory" element={<Dashboard />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="admin" element={<Admin />} />
      </Route>

      <Route path="/gov" element={<GovDashboard />} />
      <Route path="/" element={<div className="p-10 text-center font-black uppercase text-xs tracking-widest text-red-500">ID do Bot nao fornecido</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
