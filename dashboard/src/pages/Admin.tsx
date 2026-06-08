import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { 
  adminCreateItem, adminDeleteItem, adminUpdateStock, adminUpdatePrice, adminUpdateResalePrice, adminAddBalance, 
  adminReduceBalance, adminFetchItems, fetchAdminBalanceLogs,
  adminFetchUsers, adminFetchAdmins, adminFetchConfig, adminAddAdmin, adminRemoveAdmin, adminFetchTreasury
} from '../api';
import { terminal } from '../components/Terminal';
import { showToast } from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';
import { NAV_ITEMS } from '../components/admin/constants';

// Sub-components
import Sidebar from '../components/admin/Sidebar';
import FactoryTab from '../components/admin/FactoryTab';
import UsersTab from '../components/admin/UsersTab';
import EconomyTab from '../components/admin/EconomyTab';
import LogsTab from '../components/admin/LogsTab';
import ConfigTab from '../components/admin/ConfigTab';
import BotTab from '../components/admin/BotTab';
import TreasuryTab from '../components/admin/TreasuryTab';
import MacroTab from '../components/admin/MacroTab';

export default function Admin() {
  const { botId } = useParams<{ botId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Shared Data State
  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [treasury, setTreasury] = useState<any>({ balance: 0, accumulated_debt: 0, subsidy_limit: 1000 });
  const [botConfig, setBotConfig] = useState<any>({
    currency_name: 'Reais',
    currency_symbol: 'R$',
    start_text: '',
    start_buttons: '[]',
    commands: '[]'
  });
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [lastSavedCommands, setLastSavedCommands] = useState<string>('[]');
  const [activeBotSubTab, setActiveBotSubTab] = useState<'commands' | 'buttons'>('commands');
  const [editingBtnId, setEditingBtnId] = useState<string | null>(null);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [selectedBtnForMove, setSelectedBtnForMove] = useState<string | null>(null);
  
  const userRole = localStorage.getItem(`bot_${botId}_role`) || 'user';
  const query = new URLSearchParams(location.search);
  const activeTab = (query.get('tab') as 'factory' | 'economy' | 'logs' | 'users' | 'admins' | 'config' | 'bot' | 'banco' | 'macro') || 'banco';

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'primary' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'primary'
  });

  const [newItem, setNewItem] = useState({ 
    name: '', description: '', price: 0, resale_price: 0, stock: -1, item_type: 'custom', delivery_type: 'automatic', metadata: '{}' 
  });
  const [balanceUpdate, setBalanceUpdate] = useState({ 
    userId: '', amount: 0, reason: '' 
  });
  const [displayAmount, setDisplayAmount] = useState('0,00');

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-admin-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-admin-sidebar', handleToggle);
  }, []);

  const loadData = async () => {
    if (!botId) return;
    setIsLoading(true);
    setForbidden(false);
    try {
      const [itemsData, logsData, usersData, adminsData, configData, treasuryData] = await Promise.all([
        adminFetchItems(botId),
        fetchAdminBalanceLogs(botId),
        adminFetchUsers(botId),
        adminFetchAdmins(botId),
        adminFetchConfig(botId),
        adminFetchTreasury(botId)
      ]);
      setItems(itemsData || []);
      setLogs(logsData || []);
      setUsers(usersData || []);
      setAdmins(adminsData || []);
      setTreasury(treasuryData || { balance: 0, accumulated_debt: 0, subsidy_limit: 1000 });
      
      const configWithDefaults = configData || { 
        currency_name: 'Reais', 
        currency_symbol: 'R$',
        start_text: '',
        start_buttons: '[]',
        commands: '[]'
      };

      setBotConfig(configWithDefaults);
      setLastSavedCommands(configWithDefaults.commands || '[]');
      terminal.log(`Admin: Sincronização OK [${botId}]`);
    } catch (err: any) {
      if (err.response?.status === 403) setForbidden(true);
      else showToast.error("ERRO DE SINCRONIZAÇÃO");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [botId]);

  if (forbidden) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-panel rounded-[2rem] shadow-sm p-12 text-center max-w-md animate-fade-in duration-700">
          <Activity size={40} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black uppercase mb-2 tracking-tighter">Acesso Negado</h2>
          <button onClick={() => navigate(`/${botId}`)} className="bg-primary text-black font-black uppercase px-lg py-sm text-xs tracking-widest rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-sm bg-red-600 text-white w-full py-4 mt-8 transition-all hover:scale-[1.02]">Voltar para o Início</button>
        </div>
      </div>
    );
  }

  // Handlers
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botId) return;
    try {
      let metadata = JSON.parse(newItem.metadata || '{}');
      await adminCreateItem(botId, { ...newItem, metadata });
      showToast.success("Item Criado!");
      loadData();
      setNewItem({ name: '', description: '', price: 0, resale_price: 0, stock: -1, item_type: 'custom', delivery_type: 'automatic', metadata: '{}' });
    } catch (err) { showToast.error("Erro ao Criar"); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!botId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Remover Item',
      message: 'Esta ação é irreversível.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await adminDeleteItem(botId, itemId);
          showToast.success("Removido");
          loadData();
        } catch (err) { showToast.error("Erro ao Remover"); }
      }
    });
  };

  const handleUpdateStock = async (itemId: string, stock: string) => {
    if (!botId) return;
    const stockValue = parseInt(stock);
    try {
      await adminUpdateStock(botId, itemId, isNaN(stockValue) ? 0 : stockValue);
      showToast.success("Estoque Atualizado");
      loadData();
    } catch (err) { showToast.error("Erro no Estoque"); }
  };

  const handleUpdatePrice = async (itemId: string, price: string) => {
    if (!botId) return;
    const priceValue = parseFloat(price.replace(',', '.'));
    try {
      await adminUpdatePrice(botId, itemId, isNaN(priceValue) ? 0 : priceValue);
      showToast.success("Preço Atualizado");
      loadData();
    } catch (err) { showToast.error("Erro no Preço"); }
  };

  const handleUpdateResalePrice = async (itemId: string, resalePrice: string) => {
    if (!botId) return;
    const priceValue = parseFloat(resalePrice.replace(',', '.'));
    try {
      await adminUpdateResalePrice(botId, itemId, isNaN(priceValue) ? 0 : priceValue);
      showToast.success("Revenda Atualizada");
      loadData();
    } catch (err) { showToast.error("Erro na Revenda"); }
  };

  const handleUpdateBalance = async (type: 'add' | 'reduce') => {
    if (!botId || !balanceUpdate.userId) return showToast.error("ID Obrigatório");
    try {
      if (type === 'add') await adminAddBalance(botId, balanceUpdate.userId, balanceUpdate.amount, balanceUpdate.reason);
      else await adminReduceBalance(botId, balanceUpdate.userId, balanceUpdate.amount, balanceUpdate.reason);
      showToast.success("Saldo Alterado");
      loadData();
      setBalanceUpdate({ userId: '', amount: 0, reason: '' });
      setDisplayAmount('0,00');
    } catch (err: any) { 
      const msg = err.response?.data?.error || "Erro no Saldo";
      showToast.error(msg); 
    }
  };

  const handlePromoteAdmin = async (userId: string) => {
    if (!botId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Promover Admin',
      message: `Conceder acesso total ao UID: ${userId}?`,
      type: 'primary',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await adminAddAdmin(botId, userId);
          showToast.success("Promovido");
          loadData();
        } catch (err) { showToast.error("Erro"); }
      }
    });
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!botId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Revogar Admin',
      message: `Remover privilégios do UID: ${userId}?`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await adminRemoveAdmin(botId, userId);
          showToast.success("Revogado");
          loadData();
        } catch (err) { showToast.error("Erro"); }
      }
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (!value) value = '000';
    value = value.padStart(3, '0');
    const integer = value.slice(0, -2);
    const decimals = value.slice(-2);
    const cleanInteger = parseInt(integer, 10).toString();
    const formattedInteger = cleanInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const masked = `${formattedInteger},${decimals}`;
    setDisplayAmount(masked);
    setBalanceUpdate(prev => ({ ...prev, amount: parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0 }));
  };

  const getLogReason = (log: any) => {
    try {
      if (log.metadata) {
        const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        if (meta.item_name) {
          if (log.operation_type === 'consume') return `Uso: ${meta.item_name}`;
          return `Item: ${meta.item_name}`;
        }
        if (meta.reason) return meta.reason;
        if (meta.order_id) return `Pedido: ${meta.order_id.substr(0,8)}`;
      }
    } catch (e) {}
    return log.operation_type.toUpperCase().replace(/_/g, ' ');
  };

  const filteredUsers = users.filter(u => 
    u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.telegram_user_id?.toString().includes(searchQuery)
  );

  return (
    <div className="bg-surface font-sans selection:bg-primary selection:text-black relative overflow-x-hidden">
      <Sidebar
        botId={botId!}
        activeTab={activeTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        userRole={userRole}
        isLoading={isLoading}
        loadData={loadData}
      />
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-[2px] transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className="w-full max-w-[100vw] overflow-x-hidden p-4 lg:p-10">
        <div className="max-w-[1300px] mx-auto space-y-8 lg:space-y-12">
          <div className="hidden lg:flex items-center justify-between mb-6 animate-in fade-in duration-700">
            <header>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block mb-0 text-[10px]">System Control</span>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Painel'}
              </h2>
            </header>
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-primary shadow-xl transition-all duration-500 hover:rotate-12 hover:scale-110 group">
              <Activity size={24} className="group-hover:animate-pulse" />
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'factory' && (
              <FactoryTab 
                items={items} 
                botConfig={botConfig} 
                handleCreateItem={handleCreateItem} 
                newItem={newItem} 
                setNewItem={setNewItem}
                handleUpdatePrice={handleUpdatePrice}
                handleUpdateResalePrice={handleUpdateResalePrice}
                handleUpdateStock={handleUpdateStock}
                handleDeleteItem={handleDeleteItem}
              />
            )}
            {activeTab === 'users' && (
              <UsersTab 
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
                filteredUsers={filteredUsers} 
                expandedUserId={expandedUserId} 
                setExpandedUserId={setExpandedUserId} 
                botConfig={botConfig} 
                botId={botId} 
                userRole={userRole} 
                admins={admins} 
                handlePromoteAdmin={handlePromoteAdmin} 
                navigate={navigate} 
                setBalanceUpdate={setBalanceUpdate} 
              />
            )}
            {activeTab === 'economy' && (
              <EconomyTab 
                balanceUpdate={balanceUpdate} 
                setBalanceUpdate={setBalanceUpdate} 
                displayAmount={displayAmount} 
                handleAmountChange={handleAmountChange} 
                handleUpdateBalance={handleUpdateBalance} 
                botConfig={botConfig} 
              />
            )}
            {activeTab === 'banco' && (
              <TreasuryTab treasury={treasury} botConfig={botConfig} botId={botId!} onPaySuccess={loadData} />
            )}
            {activeTab === 'macro' && (
              <MacroTab botId={botId!} />
            )}
            {activeTab === 'logs' && (
              <LogsTab logs={logs} getLogReason={getLogReason} botConfig={botConfig} />
            )}
            {activeTab === 'config' && (
              <ConfigTab 
                botConfig={botConfig} 
                setBotConfig={setBotConfig} 
                botId={botId} 
                loadData={loadData} 
                admins={admins} 
                handleRemoveAdmin={handleRemoveAdmin} 
              />
            )}
            {activeTab === 'bot' && (
              <BotTab 
                activeBotSubTab={activeBotSubTab} 
                setActiveBotSubTab={setActiveBotSubTab} 
                botConfig={botConfig} 
                setBotConfig={setBotConfig} 
                editingBtnId={editingBtnId} 
                setEditingBtnId={setEditingBtnId} 
                isMoveMode={isMoveMode} 
                setIsMoveMode={setIsMoveMode} 
                selectedBtnForMove={selectedBtnForMove} 
                setSelectedBtnForMove={setSelectedBtnForMove} 
                botId={botId} 
                lastSavedCommands={lastSavedCommands} 
                setLastSavedCommands={setLastSavedCommands} 
                setIsLoading={setIsLoading} 
              />
            )}
          </div>
        </div>
      </main>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isLoading={isLoading}
      />

      <style>{`
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
