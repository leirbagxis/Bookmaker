import { useEffect, useState, useMemo } from 'react';
import { useBetSlip, getSelectionKey } from '../context/BetSlipContext';

type Props = {
  show?: boolean;
  onClose?: () => void;
};

function formatBRL(n: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
  } catch {
    return 'R$ 0,00';
  }
}

function formatOdd(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n === 0) return '0.00';
  return n.toFixed(2);
}

export function BetSlip({ show, onClose }: Props) {
  const context = useBetSlip();
  
  if (!context) {
    console.error('CRITICAL: BetSlipContext is null');
    return null;
  }

  const { 
    items = [], stake = 0, totalOdd = 0, potentialReturn = 0, lastTicketId = null,
    remove, clear, setStake, confirm, clearLastTicket 
  } = context;

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const QUICK_STAKES = [5, 10, 20, 50, 100];

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (receiptData) {
        setReceiptData(null);
        if (clearLastTicket) clearLastTicket();
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show, !!receiptData, clearLastTicket]);

  useEffect(() => {
    if (lastTicketId && receiptData && (receiptData.id === '0' || !receiptData.id)) {
      setReceiptData((prev: any) => prev ? { ...prev, id: lastTicketId } : null);
    }
  }, [lastTicketId, receiptData]);

  if (!show) return null;

  const handleConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setFeedback(null);
    
    const currentItems = [...items];
    const currentStake = stake;
    const currentOdd = totalOdd;
    const currentReturn = potentialReturn;

    try {
      const msg = await confirm();
      if (msg && msg.toLowerCase().includes('sucesso')) {
        setReceiptData({
          id: lastTicketId || '0',
          items: currentItems,
          stake: currentStake,
          totalOdd: currentOdd,
          potentialReturn: currentReturn,
          date: new Date()
        });
      } else {
        setFeedback(msg || 'Erro ao processar aposta.');
      }
    } catch (err) {
      console.error('BetSlip Confirm Error:', err);
      setFeedback('Erro de conexão ou sistema.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (receiptData) {
      return (
        <div className="bg-panel p-6 flex flex-col gap-4 relative shadow-md">
          <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundImage: 'radial-gradient(circle at 6px 0, transparent 7px, #FFFFFF 8px)', backgroundSize: '12px 10px', marginTop: '-6px' }} />
          
          <header className="flex flex-col items-center gap-1 border-b-2 border-dashed border-gray-300 pb-4 text-center">
            <div className="w-8 h-8 bg-success text-white rounded-full flex items-center justify-center font-bold mb-1">✓</div>
            <h2 className="font-mono text-base font-black uppercase m-0">Aposta Realizada!</h2>
            <p className="font-mono text-sm font-bold text-gray-800 m-0">Bilhete #{receiptData.id || '...'}</p>
            <p className="font-mono text-[10px] text-gray-500 m-0">{receiptData.date?.toLocaleString('pt-BR')}</p>
          </header>

          <div className="py-2">
            <div className="font-mono text-[10px] uppercase font-bold text-gray-600 mb-2 border-b border-gray-100 pb-1">Suas Escolhas</div>
            <ul className="flex flex-col gap-2">
              {(receiptData.items || []).map((it: any, idx: number) => (
                <li key={idx} className="flex flex-col gap-0.5 border-b border-dotted border-gray-200 pb-2">
                  <div className="text-[11px] font-bold uppercase">{it.selection?.homeTeam || 'Time'} vs {it.selection?.awayTeam || 'Time'}</div>
                  <div className="font-mono text-[9px] text-gray-500 mb-1">{new Date(it.selection?.startTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="flex justify-between items-center text-[10px] text-gray-800">
                    <span>{it.selection?.marketName || 'Mercado'}: <strong>{it.selection?.name || ''}</strong></span>
                    <span className="font-black text-black">{formatOdd(it.selection?.price)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t-2 border-black pt-2 mt-2 flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono">
                <span>Valor Apostado</span>
                <strong>{formatBRL(receiptData.stake)}</strong>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span>Cotação Total</span>
                <strong>{formatOdd(receiptData.totalOdd)}</strong>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-black pt-1 mt-1 font-mono">
                <span>Retorno</span>
                <strong>{formatBRL(receiptData.potentialReturn)}</strong>
              </div>
            </div>
          </div>

          <footer className="mt-2">
            <button type="button" className="w-full bg-accent text-white font-bold uppercase py-2 rounded-md hover:bg-black transition-colors text-xs" onClick={onClose}>
              Fechar Recibo
            </button>
          </footer>
          
          <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundImage: 'radial-gradient(circle at 6px 10px, transparent 7px, #FFFFFF 8px)', backgroundSize: '12px 10px', marginBottom: '-6px' }} />
        </div>
      );
    }

    if (!items || items.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3 bg-panel rounded-t-[2rem]">
          <div className="text-muted mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          </div>
          <p className="font-black text-lg uppercase tracking-tight">Seu bilhete está vazio</p>
          <p className="text-xs text-muted font-bold">Selecione uma odd para começar.</p>
          <button type="button" className="mt-4 bg-surface text-accent font-bold py-2 px-6 rounded-full border border-border hover:bg-border transition-colors text-xs uppercase tracking-widest" onClick={onClose}>
            Voltar para os jogos
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-surface rounded-t-[2rem]">
        <header className="p-4 flex items-center justify-between border-b border-border bg-panel rounded-t-[2rem]">
          <div className="flex items-center gap-3">
            <h2 className="font-black uppercase tracking-tight text-lg">Meu Bilhete</h2>
            <button type="button" className="flex items-center gap-1 text-[9px] text-muted font-black uppercase tracking-widest px-2 py-1 rounded hover:bg-error/10 hover:text-error transition-colors" onClick={clear}>
              <span>Limpar</span>
            </button>
          </div>
          <button type="button" className="text-2xl leading-none text-muted hover:text-accent p-1" onClick={onClose}>×</button>
        </header>

        <div className="flex-1 overflow-y-auto p-2 bg-surface">
          <ul className="flex flex-col gap-2 p-2">
            {items.map((it, idx) => (
              <li key={idx} className="refined-card p-3 !rounded-xl !shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[11px] font-black uppercase truncate">{it.selection?.homeTeam || 'Time A'} vs {it.selection?.awayTeam || 'Time B'}</div>
                  <button type="button" className="text-muted hover:text-error transition-colors" onClick={() => remove(it.selection)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted font-bold uppercase">{it.selection?.marketName}:</span>
                    <span className="text-xs font-bold">{it.selection?.name}</span>
                  </div>
                  <span className="text-xs font-black text-primary bg-accent px-2 py-0.5 rounded-md">{formatOdd(it.selection?.price)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="p-4 bg-panel border-t border-border flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase text-muted tracking-widest">Valor da Aposta</label>
              <span className="text-[11px] font-bold">Odd: <strong className="text-primary bg-accent px-1.5 py-0.5 rounded-md">{formatOdd(totalOdd)}</strong></span>
            </div>
            
            <div className="relative flex items-center">
              <span className="absolute left-3 font-black text-muted">R$</span>
              <input
                type="number"
                className="w-full bg-surface border border-border rounded-xl py-3 pl-10 pr-4 font-black text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={stake || ''}
                onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>

            <div className="grid grid-cols-5 gap-1.5 mt-1">
              {QUICK_STAKES.map(val => (
                <button key={val} type="button" onClick={() => setStake(stake + val)} className="bg-surface border border-border py-1.5 rounded-lg text-[10px] font-bold hover:bg-border transition-colors">+{val}</button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center font-black">
            <span className="text-xs uppercase text-muted">Retorno</span>
            <span className="text-lg text-primary bg-accent px-3 py-1 rounded-xl">{formatBRL(potentialReturn)}</span>
          </div>

          <button 
            type="button" 
            className="btn-primary w-full py-4 text-sm mt-2" 
            onClick={handleConfirm}
            disabled={isProcessing || items.length === 0 || stake <= 0}
          >
            {isProcessing ? 'Enviando...' : 'Apostar'}
          </button>

          {feedback && <div className={`text-center text-[10px] font-bold p-2 rounded-lg ${feedback.includes('sucesso') ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>{feedback}</div>}
        </footer>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <aside className="relative w-full max-w-[480px] bg-surface sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        {renderContent()}
      </aside>
    </div>
  );
}
