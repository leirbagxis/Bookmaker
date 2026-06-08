import { Users, Search, User as UserIcon, Wallet, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface UsersTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredUsers: any[];
  expandedUserId: string | null;
  setExpandedUserId: (id: string | null) => void;
  botConfig: any;
  botId: string | undefined;
  userRole: string;
  admins: any[];
  handlePromoteAdmin: (userId: string) => void;
  navigate: (path: string) => void;
  setBalanceUpdate: (update: any) => void;
}

export default function UsersTab({
  searchQuery,
  setSearchQuery,
  filteredUsers,
  expandedUserId,
  setExpandedUserId,
  botConfig,
  botId,
  userRole,
  admins,
  handlePromoteAdmin,
  navigate,
  setBalanceUpdate
}: UsersTabProps) {
  return (
    <section className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black rounded-lg text-primary"><Users size={22} className="animate-pulse" /></div>
          <h3 className="text-xl font-black uppercase tracking-tighter">Índice Geral</h3>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-black transition-colors" size={16} />
          <input type="text" placeholder="Procurar usuário..." className="w-full bg-white border-2 border-border rounded-2xl pl-11 pr-4 py-3 text-[10px] font-black outline-none focus:border-black shadow-lg transition-all duration-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div 
            key={user.telegram_user_id} 
            onClick={() => setExpandedUserId(expandedUserId === user.telegram_user_id.toString() ? null : user.telegram_user_id.toString())} 
            className={cn(
              "bg-panel rounded-[2.5rem] shadow-md p-6 lg:p-8 cursor-pointer border-2 transition-all duration-500 relative group/user",
              expandedUserId === user.telegram_user_id.toString() 
                ? "border-black shadow-2xl scale-[1.02] z-10" 
                : "border-transparent hover:border-black/10 shadow-sm hover:shadow-xl hover:-translate-y-1"
            )}
          >
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-muted group-hover/user:bg-black group-hover/user:text-primary transition-all duration-500">
                  <UserIcon size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase truncate text-black leading-none">{user.first_name} {user.last_name}</div>
                  <div className="text-[8px] font-bold text-muted flex items-center gap-1 uppercase mt-1">ID:{user.telegram_user_id}</div>
                </div>
              </div>
              <div className="bg-surface px-2 py-1 rounded-lg border text-[9px] font-black tabular-nums shadow-inner shrink-0">
                {user.total_messages || 0}
              </div>
            </div>

            {expandedUserId === user.telegram_user_id.toString() && (
              <div className="mt-4 pt-4 border-t space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center bg-surface p-3 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block mb-0 text-[8px]">Saldo Atual</span>
                  <span className="text-sm font-black text-black tabular-nums">{botConfig.currency_symbol}{user.balance?.toLocaleString('pt-BR')}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setBalanceUpdate((prev: any) => ({...prev, userId: user.telegram_user_id.toString()})); 
                      navigate(`/${botId}/admin?tab=economy`); 
                    }} 
                    className="w-full py-2.5 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
                  >
                    <Wallet size={12} className="text-primary" /> Editar
                  </button>
                  {userRole === 'owner' && !admins.some(a => a.user_id === user.telegram_user_id) && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handlePromoteAdmin(user.telegram_user_id.toString()); 
                      }} 
                      className="w-full py-2.5 bg-primary text-black rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95"
                    >
                      <Shield size={12} /> Promover
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
