import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, Bot, Globe, Shield, Database,
  TrendingUp, AlertCircle, RefreshCcw
} from 'lucide-react';
import axios from 'axios';
import { terminal } from '../components/Terminal';
import { showToast } from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import MacroParamsTab from '../components/gov/MacroParamsTab';
import GroupHealthTab from '../components/gov/GroupHealthTab';
import MacroAlertsTab from '../components/gov/MacroAlertsTab';
import ReconciliationsTab from '../components/gov/ReconciliationsTab';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const api = axios.create({
  baseURL: '/api/v1/gov',
  withCredentials: true,
});

type GovTab = 'overview' | 'bots' | 'groups' | 'macro' | 'admins' | 'dlcs';
type MacroSubTab = 'params' | 'health' | 'alerts' | 'reconciliations';

export default function GovDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<GovTab>('overview');
  const [macroSubTab, setMacroSubTab] = useState<MacroSubTab>('params');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    overview: null,
    bots: [],
    groups: [],
    admins: [],
    dlcs: []
  });

  const [newAdminId, setNewAdminId] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void; type: 'danger' | 'primary';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'primary' });

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab') as GovTab;
    if (tab) setActiveTab(tab);
  }, [location]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overview, bots, groups, admins, dlcs] = await Promise.all([
        api.get('/overview'),
        api.get('/bots'),
        api.get('/groups'),
        api.get('/admins'),
        api.get('/dlcs')
      ]);

      setData({
        overview: overview.data || null,
        bots: bots.data || [],
        groups: groups.data || [],
        admins: admins.data || [],
        dlcs: dlcs.data || []
      });
      terminal.log('GOV: Dados sincronizados com sucesso.');
    } catch (err: any) {
      if (err.response?.status === 403) {
        showToast.error("Acesso negado: privilégios insuficientes.");
        navigate('/');
      } else {
        showToast.error("Erro ao carregar dados do Governo.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddAdmin = async () => {
    if (!newAdminId) return;
    try {
      await api.post('/admins', { user_id: parseInt(newAdminId), role: 'admin' });
      showToast.success("Administrador adicionado!");
      setNewAdminId('');
      loadData();
    } catch (err) {
      showToast.error("Erro ao adicionar administrador.");
    }
  };

  const handleRemoveAdmin = (userId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revogar Acesso',
      message: `Tem certeza que deseja remover o UID ${userId} da equipe GOV?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/admins/${userId}`);
          showToast.success("Acesso revogado.");
          loadData();
        } catch (err) {
          showToast.error("Erro ao remover.");
        }
        setConfirmModal(p => ({...p, isOpen: false}));
      }
    });
  };

  const renderMacroContent = () => {
    switch (macroSubTab) {
      case 'params':
        return <MacroParamsTab />;
      case 'health':
        return <GroupHealthTab />;
      case 'alerts':
        return <MacroAlertsTab />;
      case 'reconciliations':
        return <ReconciliationsTab />;
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans selection:bg-primary selection:text-black">
      {/* GOV Sidebar (Desktop) */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-black text-white p-6 hidden lg:flex flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center font-black text-xl shadow-lg">G</div>
          <div>
            <h1 className="font-black text-base leading-none tracking-tighter uppercase">Sistema GOV</h1>
            <span className="text-[8px] font-bold text-primary uppercase tracking-[0.2em]">Platform Master</span>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { id: 'overview', label: 'Overview', icon: Globe },
            { id: 'bots', label: 'Bots Ativos', icon: Bot },
            { id: 'groups', label: 'Grupos & Tesouraria', icon: Users },
            { id: 'macro', label: 'Macroeconomia', icon: TrendingUp },
            { id: 'dlcs', label: 'Pacotes DLC', icon: Database },
            { id: 'admins', label: 'Equipe GOV', icon: Shield },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as GovTab);
                navigate(`/gov?tab=${item.id}`);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-[10px] font-black tracking-widest transition-all",
                activeTab === item.id ? "bg-primary text-black shadow-lg" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/10">
           <button onClick={loadData} className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
             <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
             Sincronizar
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-10 max-w-7xl">
        <div className="mb-8 bg-red-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-pulse">
           <div className="flex items-center gap-3">
              <Shield size={20} className="fill-white" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ambiente de Governança Ativo: Edição Global Habilitada</span>
           </div>
           <div className="text-[9px] font-bold opacity-75 uppercase">Privilégios de Nível 5</div>
        </div>

        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="lg:hidden w-10 h-10 bg-black text-primary rounded-xl flex items-center justify-center font-black">G</div>
             <div>
                <div className="status-label">Master Platform Control</div>
                <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter text-black">
                  {activeTab === 'overview' && 'Visão Geral'}
                  {activeTab === 'bots' && 'Gestão de Bots'}
                  {activeTab === 'groups' && 'Monitoramento de Grupos'}
                  {activeTab === 'macro' && 'Macroeconomia Global'}
                  {activeTab === 'admins' && 'Equipe de Governança'}
                  {activeTab === 'dlcs' && 'Marketplace DLC'}
                </h2>
             </div>
          </div>
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-black rounded-2xl flex items-center justify-center text-primary shadow-xl">
            <Shield size={24} />
          </div>
        </header>

        {/* Global Tab Switcher (Mobile & Tablet) */}
        <div className="lg:hidden flex overflow-x-auto gap-2 pb-6 mb-2 no-scrollbar -mx-4 px-4">
          {[
            { id: 'overview', label: 'Início', icon: Globe },
            { id: 'bots', label: 'Bots', icon: Bot },
            { id: 'groups', label: 'Grupos', icon: Users },
            { id: 'macro', label: 'Macro', icon: TrendingUp },
            { id: 'dlcs', label: 'DLCs', icon: Database },
            { id: 'admins', label: 'Equipe', icon: Shield },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as GovTab);
                navigate(`/gov?tab=${item.id}`);
              }}
              className={cn(
                "shrink-0 flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2",
                activeTab === item.id ? "bg-black text-primary border-black" : "bg-white text-muted border-border"
              )}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>

        {loading && !data.overview ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-black border-t-primary rounded-full animate-spin mb-4"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Carregando dados globais...</span>
          </div>
        ) : (
          <div className="animate-fade-in space-y-8 pb-20">

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { id: 'bots', label: 'Bots Totais', value: data.overview?.total_bots, icon: Bot, color: 'text-blue-500' },
                    { id: 'groups', label: 'Grupos Ativos', value: data.overview?.total_groups, icon: Users, color: 'text-purple-500' },
                    { id: 'dlcs', label: 'Usuários SaaS', value: data.overview?.total_users, icon: Database, color: 'text-green-500' },
                    { id: 'macro', label: 'Volume Tesouraria', value: `R$ ${data.overview?.total_treasury?.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
                  ].map((stat, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveTab(stat.id as GovTab);
                        navigate(`/gov?tab=${stat.id}`);
                      }}
                      className="text-left bg-panel p-6 rounded-[2rem] border border-border/50 shadow-xl group hover:border-black transition-all active:scale-95"
                    >
                      <stat.icon className={cn("mb-4 transition-transform group-hover:scale-110", stat.color)} size={24} />
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">{stat.label}</div>
                      <div className="text-2xl font-black text-black">{stat.value}</div>
                    </button>
                  ))}
                </div>

                <div className="bg-black text-white p-8 lg:p-12 rounded-[3rem] border border-white/10 shadow-3xl relative overflow-hidden group/cta transition-all hover:shadow-2xl">
                   <TrendingUp size={160} className="absolute -bottom-10 -right-10 opacity-10 group-hover/cta:scale-110 group-hover/cta:rotate-12 transition-transform duration-1000 text-primary" />
                   <div className="relative z-10 space-y-6">
                      <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">
                         <Shield size={12} />
                         <span className="text-[9px] font-black uppercase tracking-widest">Acesso de Nível 5</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none">Controle de Macroeconomia</h3>
                        <p className="text-white/40 text-xs lg:text-sm font-medium leading-relaxed max-w-xl">
                          Configure as regras fundamentais de todos os bots da rede. Ajuste taxas de transação, limites de soberania e políticas de transbordo global.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setActiveTab('macro');
                          navigate('/gov?tab=macro');
                        }}
                        className="bg-primary text-black font-black uppercase px-12 py-5 rounded-full text-xs tracking-[0.2em] hover:bg-[#c9eb00] transition-all active:scale-95 shadow-2xl shadow-primary/20"
                      >
                        Editar Parâmetros Agora
                      </button>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'bots' && (
              <div className="bg-panel rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-black text-white text-[9px] font-black uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">Bot Username</th>
                      <th className="px-8 py-5">ID</th>
                      <th className="px-8 py-5">Dono (UID)</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Criado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(data.bots || []).map((bot: any) => (
                      <tr key={bot.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-8 py-5 text-sm font-black text-black">@{bot.username}</td>
                        <td className="px-8 py-5 text-[10px] font-mono text-muted">{bot.id}</td>
                        <td className="px-8 py-5 text-[10px] font-bold">{bot.owner_id}</td>
                        <td className="px-8 py-5">
                          <span className={cn("text-[8px] font-black px-3 py-1 rounded-full uppercase", bot.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                            {bot.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-[10px] text-muted">{new Date(bot.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'macro' && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2 border-b border-border pb-4">
                  {[
                    { id: 'params', label: 'Parâmetros' },
                    { id: 'health', label: 'Saúde dos Grupos' },
                    { id: 'alerts', label: 'Alertas' },
                    { id: 'reconciliations', label: 'Reconciliações' },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setMacroSubTab(sub.id as MacroSubTab)}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all",
                        macroSubTab === sub.id ? "bg-black text-primary" : "bg-surface text-muted hover:text-black"
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {renderMacroContent()}

                {macroSubTab === 'params' && (
                  <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-[2rem] flex gap-4">
                    <AlertCircle className="text-blue-500 shrink-0" size={24} />
                    <p className="text-[10px] font-bold text-blue-900 uppercase tracking-tight leading-relaxed">
                      Mudanças nos parâmetros são versionadas e auditáveis. Use o histórico para revisar alterações e o motivo é obrigatório em cada edição.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admins' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-panel p-8 rounded-[2.5rem] border border-border/50 shadow-2xl space-y-6">
                    <h3 className="text-lg font-black uppercase tracking-tight">Adicionar Admin GOV</h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 ml-2">Telegram User ID</label>
                      <input
                        type="number"
                        placeholder="Ex: 12345678"
                        className="w-full bg-surface border-2 border-border rounded-2xl p-4 text-sm font-black outline-none focus:border-black transition-all"
                        value={newAdminId}
                        onChange={(e) => setNewAdminId(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleAddAdmin}
                      className="w-full bg-black text-primary py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary hover:text-black transition-all"
                    >
                      Conceder Acesso Master
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-panel rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-black text-white text-[9px] font-black uppercase tracking-[0.2em]">
                      <tr>
                        <th className="px-8 py-5">User ID</th>
                        <th className="px-8 py-5">Role</th>
                        <th className="px-8 py-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {(data.admins || []).map((admin: any) => (
                        <tr key={admin.user_id} className="hover:bg-red-50/50 transition-colors">
                          <td className="px-8 py-5 font-mono text-[11px] font-black text-black">{admin.user_id}</td>
                          <td className="px-8 py-5 uppercase text-[9px] font-black text-muted">{admin.role}</td>
                          <td className="px-8 py-5 text-right">
                            <button
                              onClick={() => handleRemoveAdmin(admin.user_id)}
                              className="p-2 text-muted hover:text-red-600 transition-all rounded-lg"
                            >
                              <Database size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="bg-panel rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-black text-white text-[9px] font-black uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">Título do Grupo</th>
                      <th className="px-8 py-5">Bot Atribuído</th>
                      <th className="px-8 py-5">Saldo Tesouraria</th>
                      <th className="px-8 py-5">Dívida Ativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(data.groups || []).map((group: any) => (
                      <tr key={group.group_id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-8 py-5 text-sm font-black text-black">{group.title}</td>
                        <td className="px-8 py-5 text-[10px] font-bold text-muted">ID: {group.bot_id}</td>
                        <td className="px-8 py-5 font-black text-sm tabular-nums text-green-600">
                          R$ {group.treasury?.toLocaleString()}
                        </td>
                        <td className="px-8 py-5 font-black text-sm tabular-nums text-red-600">
                          R$ {group.debt?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'dlcs' && (
              <div className="bg-panel rounded-[2.5rem] border border-border/50 shadow-2xl p-10 text-center space-y-4">
                 <Database size={48} className="mx-auto text-muted" />
                 <h3 className="text-xl font-black uppercase tracking-tight">Sistema de DLCs</h3>
                 <p className="text-muted text-sm max-w-md mx-auto">Em breve: Crie pacotes de itens globais e recursos premium que podem ser ativados individualmente por cada bot da plataforma.</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    {(data.dlcs || []).map((dlc: any) => (
                      <div key={dlc.id} className="bg-surface border-2 border-border p-6 rounded-2xl text-left">
                        <span className="text-[7px] font-black bg-black text-white px-2 py-0.5 rounded-full uppercase mb-2 block w-fit">{dlc.category}</span>
                        <div className="font-black text-sm uppercase">{dlc.name}</div>
                        <div className="text-[10px] text-muted mt-1">{dlc.description}</div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

          </div>
        )}
      </main>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(p => ({...p, isOpen: false}))}
      />

      <style>{`
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .status-label { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(0,0,0,0.4); margin-bottom: 4px; }
      `}</style>
    </div>
  );
}
