import { Settings, Check, Shield, Hash, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { adminUpdateConfig } from '../../api';
import { showToast } from '../Toast';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface ConfigTabProps {
  botConfig: any;
  setBotConfig: (config: any) => void;
  botId: string | undefined;
  loadData: () => void;
  admins: any[];
  handleRemoveAdmin: (userId: string) => void;
}

export default function ConfigTab({
  botConfig,
  setBotConfig,
  botId,
  loadData,
  admins,
  handleRemoveAdmin
}: ConfigTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black rounded-lg text-primary group"><Settings size={22} className="group-hover:rotate-90 transition-transform duration-700" /></div>
          <h3 className="text-xl font-black uppercase">Sistema</h3>
        </div>
        <div className="bg-panel rounded-[2rem] shadow-sm p-8 border border-border/50 space-y-6 shadow-xl relative overflow-hidden transition-all hover:shadow-md">
          <Settings size={60} className="absolute -bottom-4 -right-4 opacity-5" />
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block text-[9px]">Moeda</label>
              <input type="text" className="w-full bg-surface border-2 border-border rounded-xl p-4 text-xs font-black outline-none focus:border-black focus:bg-white transition-all shadow-inner" value={botConfig.currency_name} onChange={e => setBotConfig({...botConfig, currency_name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block text-[9px]">Símbolo</label>
              <input type="text" className="w-full bg-surface border-2 border-border rounded-xl p-4 text-xs font-black outline-none focus:border-black focus:bg-white transition-all shadow-inner" value={botConfig.currency_symbol} onChange={e => setBotConfig({...botConfig, currency_symbol: e.target.value})} />
            </div>
          </div>
          <button 
            onClick={async () => { 
              try { 
                await adminUpdateConfig(botId!, botConfig); 
                showToast.success("Configuração Salva!"); 
                loadData(); 
              } catch (err) { 
                showToast.error("Falha ao Salvar"); 
              } 
            }} 
            className="w-full h-16 bg-primary text-black font-black uppercase px-6 py-2 text-xs tracking-widest rounded-full transition-all hover:bg-[#c9eb00] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xl relative z-10"
          >
            <Check size={18} className="mr-2" /> Gravar Alterações
          </button>
        </div>
      </section>
      
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black rounded-lg text-primary group"><Shield size={22} className="group-hover:scale-110 transition-transform" /></div>
          <h3 className="text-xl font-black uppercase">Gestores</h3>
        </div>
        <div className="bg-panel rounded-[2rem] shadow-sm p-8 space-y-4 border border-border/50 shadow-xl transition-all hover:shadow-md">
          {admins.map((admin) => (
            <div key={admin.user_id} className={cn("p-4 rounded-2xl border-2 transition-all duration-500 flex items-center justify-between group/adm", admin.role === 'owner' ? "border-black bg-surface shadow-md" : "border-border hover:border-black/30")}>
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all duration-700 shadow-lg", admin.role === 'owner' ? "bg-black text-primary rotate-3" : "bg-surface border border-border text-black group-hover/adm:bg-black group-hover/adm:text-primary")}>
                  {admin.user?.first_name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-black uppercase truncate flex items-center gap-2">
                    {admin.user?.first_name} 
                    {admin.role === 'owner' && <span className="text-[7px] bg-primary text-black px-2.5 py-1 rounded-full font-black shadow-sm">MASTER</span>}
                  </div>
                  <div className="text-[8px] font-bold text-muted mt-1 uppercase flex items-center gap-1">
                    <Hash size={8} /> {admin.user_id}
                  </div>
                </div>
              </div>
              {admin.role !== 'owner' && (
                <button onClick={() => handleRemoveAdmin(admin.user_id.toString())} className="text-muted hover:text-red-600 p-3 rounded-xl transition-all duration-300 hover:bg-red-50 hover:rotate-12">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
