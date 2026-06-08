import { Link } from 'react-router-dom';
import { ShoppingBag, Trophy, ArrowRight, Shield } from 'lucide-react';

interface UserOverviewProps {
  botId: string | null;
  profile: any;
  botConfig: any;
}

export default function UserOverview({ botId, profile, botConfig }: UserOverviewProps) {
  return (
    <div className="space-y-lg animate-fade-in">
      <div className="grid grid-cols-2 gap-md">
        <Link to={`/${botId}/shop`} className="refined-card group bg-primary border-black/5 hover:bg-black hover:text-white transition-all">
          <div className="flex flex-col gap-sm">
            <div className="w-10 h-10 rounded-xl bg-black/10 group-hover:bg-white/10 flex items-center justify-center"><ShoppingBag size={20} /></div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Visitar</div>
              <div className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">Loja <ArrowRight size={18} /></div>
            </div>
          </div>
        </Link>
        <Link to={`/${botId}/ranking`} className="refined-card group border-border hover:border-black transition-all">
          <div className="flex flex-col gap-sm">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-black/40 group-hover:text-black"><Trophy size={20} /></div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Ver</div>
              <div className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">Rankings <ArrowRight size={18} /></div>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div className="refined-card bg-black text-white overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-xs block">Saldo Disponível</div>
          <div className="flex items-baseline gap-sm mt-2 overflow-hidden">
            <span className="text-primary font-black text-2xl shrink-0">{botConfig.currency_symbol}</span>
            <h2 className="text-5xl md:text-6xl font-black text-primary tracking-tighter truncate leading-tight">
              {profile.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="mt-lg pt-md border-t border-white/10 flex justify-between font-bold text-[9px] text-white/30 uppercase tracking-[0.2em]">
            <span>{botConfig.currency_name}</span>
            <span>Conta Verificada</span>
          </div>
        </div>

        <div className="refined-card col-span-1">
          <header className="flex justify-between items-start mb-lg">
            <div className="overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40 mb-xs block">Identidade Digital</div>
              <h3 className="text-2xl font-black text-black leading-none truncate">{profile.first_name} {profile.last_name}</h3>
            </div>
            <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-black/20 shrink-0"><Shield size={24} /></div>
          </header>
          <div className="font-bold text-[10px] space-y-1 text-black/40 uppercase tracking-widest">
            <div>ID: {profile.telegram_user_id}</div>
            <div>Status: <span className="text-green-500">Conectado</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
