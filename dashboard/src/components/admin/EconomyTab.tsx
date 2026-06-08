import { Wallet, User as UserIcon, Coins, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface EconomyTabProps {
  balanceUpdate: any;
  setBalanceUpdate: (update: any) => void;
  displayAmount: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpdateBalance: (type: 'add' | 'reduce') => void;
  botConfig: any;
}

export default function EconomyTab({
  balanceUpdate,
  setBalanceUpdate,
  displayAmount,
  handleAmountChange,
  handleUpdateBalance,
  // @ts-ignore
  botConfig
}: EconomyTabProps) {
  return (
    <section className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-black rounded-xl text-primary shadow-lg group"><Wallet size={24} className="group-hover:rotate-12 transition-transform" /></div>
        <h3 className="text-2xl font-black uppercase tracking-tighter">Créditos</h3>
      </div>
      
      <div className="bg-panel rounded-[2rem] shadow-sm p-6 lg:p-8 relative overflow-hidden transition-all hover:shadow-md border border-border/50 shadow-2xl transition-all duration-500 relative overflow-hidden group/card">
        <Coins size={80} className="absolute -top-4 -right-4 opacity-5 group-hover/card:scale-110 group-hover/card:rotate-12 transition-all duration-1000" />
        
        <div className="space-y-3 relative z-10">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block text-[10px]">Identificador UID</label>
          <div className="relative group/field">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-black transition-colors" size={18} />
            <input type="text" className="w-full bg-surface border-2 border-border rounded-xl p-4 pl-12 text-lg font-black outline-none focus:border-black transition-all shadow-inner focus:bg-white" placeholder="0000000000" value={balanceUpdate.userId} onChange={e => setBalanceUpdate({...balanceUpdate, userId: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block text-[10px]">Montante</label>
            <input type="text" className="w-full bg-surface border-2 border-border rounded-xl p-4 text-2xl font-black outline-none focus:border-black transition-all shadow-inner text-right tabular-nums focus:bg-white" value={displayAmount} onChange={handleAmountChange} />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block text-[10px]">Justificativa</label>
            <textarea className="w-full bg-surface border-2 border-border rounded-xl p-4 text-[11px] font-bold outline-none focus:border-black transition-all shadow-inner h-[68px] resize-none focus:bg-white" placeholder="Motivo administrativo..." value={balanceUpdate.reason} onChange={e => setBalanceUpdate({...balanceUpdate, reason: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border relative z-10">
          <button onClick={() => handleUpdateBalance('add')} className="h-16 bg-primary text-black font-black uppercase px-6 py-2 text-[11px] tracking-widest rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl hover:bg-[#c9eb00]">
            <ArrowUpRight size={20} className="mr-2" /> Injetar
          </button>
          <button onClick={() => handleUpdateBalance('reduce')} className="h-16 bg-white border-2 border-red-500 text-red-500 font-black uppercase px-6 py-2 text-[11px] tracking-widest rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:bg-red-500 hover:text-white">
            <ArrowDownLeft size={20} className="mr-2" /> Extrair
          </button>
        </div>
      </div>
    </section>
  );
}
