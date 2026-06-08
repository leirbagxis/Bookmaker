import { Building2, Landmark, AlertCircle, TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react';

interface TreasuryData {
  balance: number;
  accumulated_debt: number;
  subsidy_limit: number;
  installments_total: number;
  installments_paid: number;
  installment_amount: number;
}

interface TreasuryTabProps {
  treasury: TreasuryData;
  botConfig: any;
  botId: string;
  onPaySuccess: () => void;
}

export default function TreasuryTab({ treasury, botConfig, botId, onPaySuccess }: TreasuryTabProps) {
  const symbol = botConfig.currency_symbol || 'R$';
  const isHealthy = treasury.balance >= 0;
  const isSelfSustaining = treasury.balance >= treasury.subsidy_limit;
  const hasPendingInstallments = treasury.installments_total > 0 && treasury.installments_paid < treasury.installments_total;
  const canPay = treasury.balance >= treasury.installment_amount && hasPendingInstallments;

  const formatValue = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const handlePay = async () => {
    if (!canPay) return;
    try {
      const { adminPayInstallment } = await import('../../api');
      await adminPayInstallment(botId);
      onPaySuccess();
    } catch (err) {
      console.error("Failed to pay installment", err);
    }
  };

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-black rounded-xl text-primary shadow-lg">
          <Building2 size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">Tesouraria do Grupo</h3>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Gestão de Liquidez e Macroeconomia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Saldo do Caixa */}
        <div className="bg-panel rounded-[2rem] p-8 border border-border/50 shadow-sm relative overflow-hidden group">
          <Landmark size={80} className="absolute -top-4 -right-4 opacity-5 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] block mb-4">Saldo em Caixa</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-muted">{symbol}</span>
              <h4 className={`text-4xl font-black tracking-tighter ${isHealthy ? 'text-black' : 'text-red-600'}`}>
                {formatValue(treasury.balance)}
              </h4>
            </div>
            <div className="mt-6 flex items-center gap-2">
              {isSelfSustaining ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <ShieldCheck size={12} /> Auto-Sustentável
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <TrendingUp size={12} /> Fase de Subsídio
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card: Dívida Acumulada */}
        <div className="bg-panel rounded-[2rem] p-8 border border-border/50 shadow-sm relative overflow-hidden group">
          <AlertCircle size={80} className="absolute -top-4 -right-4 opacity-5 group-hover:scale-110 transition-transform duration-700 text-red-500" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] block mb-4">Dívida com o Sistema</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-muted">{symbol}</span>
              <h4 className="text-4xl font-black tracking-tighter text-red-500">
                {formatValue(treasury.accumulated_debt)}
              </h4>
            </div>
            <p className="mt-6 text-[10px] font-bold text-muted uppercase leading-relaxed">
              Valor total injetado pelo sistema que deve ser devolvido via prestações.
            </p>
          </div>
        </div>

        {/* Card: Teto de Subsídio */}
        <div className="bg-panel rounded-[2rem] p-8 border border-border/50 shadow-sm relative overflow-hidden group">
          <TrendingDown size={80} className="absolute -top-4 -right-4 opacity-5 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] block mb-4">Teto de Incentivo</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-muted">{symbol}</span>
              <h4 className="text-4xl font-black tracking-tighter">
                {formatValue(treasury.subsidy_limit)}
              </h4>
            </div>
            <p className="mt-6 text-[10px] font-bold text-muted uppercase leading-relaxed">
              O sistema para de dar auxílio quando o caixa ultrapassar este valor.
            </p>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-black text-white rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h4 className="text-xl font-black uppercase tracking-tight mb-4">Como funciona o caixa?</h4>
            <ul className="space-y-4 text-xs font-medium text-white/70">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>Enquanto o saldo for menor que <b>{symbol} {formatValue(treasury.subsidy_limit)}</b>, cada mensagem gera <b>{symbol} 0,15</b> para o caixa e aumenta sua dívida.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>O grupo paga <b>{symbol} 0,10</b> por mensagem ao usuário, lucrando <b>{symbol} 0,05</b> líquidos.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>Vendas na loja retornam <b>100%</b> do valor para este caixa, ajudando a quitar dívidas e acumular riqueza.</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col justify-center items-center lg:items-end text-center lg:text-right">
             <div className="mb-4 p-4 bg-white/5 rounded-3xl border border-white/10 inline-block">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1">Status da Operação</span>
                <span className="text-lg font-black">{isSelfSustaining ? 'INDEPENDENTE' : 'EM APOIO FINANCEIRO'}</span>
             </div>
             <button 
              onClick={handlePay}
              disabled={!canPay}
              className={`bg-primary text-black font-black uppercase px-8 py-4 rounded-full text-xs tracking-widest transition-all ${canPay ? 'hover:scale-105 active:scale-95 shadow-xl' : 'opacity-50 cursor-not-allowed'}`}
             >
               {hasPendingInstallments ? `Pagar Parcela (${treasury.installments_paid + 1}/${treasury.installments_total})` : 'Sem faturas pendentes'}
             </button>
          </div>
        </div>
      </div>
    </section>
  );
}
