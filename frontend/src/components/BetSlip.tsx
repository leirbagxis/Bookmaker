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
  
  // 1. Verificação ultra-segura do contexto
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
  const [receiptData, setReceiptData] = useState<{
    id: string;
    items: typeof items;
    stake: number;
    totalOdd: number;
    potentialReturn: number;
    date: Date;
  } | null>(null);

  const QUICK_STAKES = [5, 10, 20, 50, 100];

  // 2. Gerenciamento de overflow e limpeza
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

  // 3. Sincronização do ID do recibo
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
    // VISÃO DE RECIBO
    if (receiptData) {
      return (
        <div className="bet-slip__receipt">
          <header className="bet-slip__receipt-header">
            <div className="bet-slip__receipt-success-icon">✓</div>
            <h2 className="bet-slip__receipt-title">Aposta Realizada!</h2>
            <p className="bet-slip__receipt-id">Bilhete #{receiptData.id || '...'}</p>
            <p className="bet-slip__receipt-date">{receiptData.date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
            </header>

          <div className="bet-slip__receipt-content">
            <div className="bet-slip__receipt-section-title">Suas Escolhas</div>
            <ul className="bet-slip__receipt-list">
              {(receiptData.items || []).map((it: any, idx: number) => (
                <li key={idx} className="bet-slip__receipt-item">
                  <div className="bet-slip__receipt-item-match">
                    {it.selection?.homeTeam || 'Time'} vs {it.selection?.awayTeam || 'Time'}
                  </div>
                  <div className="bet-slip__receipt-item-date">
                    {new Date(it.selection?.startTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="bet-slip__receipt-item-details">
                    <span>{it.selection?.marketName || 'Mercado'}: <strong>{it.selection?.name || ''}</strong></span>
                    <span className="bet-slip__receipt-item-odd">{formatOdd(it.selection?.price)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="bet-slip__receipt-summary">
              <div className="bet-slip__receipt-row">
                <span>Valor Apostado</span>
                <strong>{formatBRL(receiptData.stake)}</strong>
              </div>
              <div className="bet-slip__receipt-row">
                <span>Cotação Total</span>
                <strong>{formatOdd(receiptData.totalOdd)}</strong>
              </div>
              <div className="bet-slip__receipt-row bet-slip__receipt-row--total">
                <span>Retorno Potencial</span>
                <strong>{formatBRL(receiptData.potentialReturn)}</strong>
              </div>
            </div>
          </div>

          <footer className="bet-slip__receipt-footer">
            <button type="button" className="bet-slip__receipt-close-btn" onClick={onClose}>
              Fechar Recibo
            </button>
          </footer>
        </div>
      );
    }

    // VISÃO DE BILHETE VAZIO
    if (!items || items.length === 0) {
      return (
        <div className="bet-slip__empty">
          <div className="bet-slip__empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          </div>
          <p className="bet-slip__empty-title">Seu bilhete está vazio</p>
          <p className="bet-slip__empty-desc">Selecione uma odd para começar.</p>
          <button type="button" className="bet-slip__back-btn" onClick={onClose}>
            Voltar para os jogos
          </button>
        </div>
      );
    }

    // VISÃO DE LISTA DE APOSTAS
    return (
      <>
        <header className="bet-slip__head">
          <div className="bet-slip__head-main">
            <h2 className="bet-slip__title">Meu Bilhete</h2>
            <button type="button" className="bet-slip__clear-all" onClick={clear}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              <span>Limpar</span>
            </button>
          </div>
          <button type="button" className="bet-slip__close" onClick={onClose}>×</button>
        </header>

        <div className="bet-slip__scroll-area">
          <ul className="bet-slip__list">
            {items.map((it, idx) => (
              <li key={idx} className="bet-slip__item">
                <div className="bet-slip__item-content">
                  <div className="bet-slip__item-match">
                    {it.selection?.homeTeam || 'Time A'} vs {it.selection?.awayTeam || 'Time B'}
                  </div>
                  <div className="bet-slip__item-details">
                    <span>{it.selection?.marketName}:</span>
                    <span className="bet-slip__item-selection">{it.selection?.name}</span>
                  </div>
                </div>
                <div className="bet-slip__item-actions">
                  <span className="bet-slip__item-odd">{formatOdd(it.selection?.price)}</span>
                  <button type="button" className="bet-slip__item-remove" onClick={() => remove(it.selection)}>×</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="bet-slip__footer">
          <div className="bet-slip__stake-section">
            <div className="bet-slip__stake-header">
              <label>Valor da Aposta</label>
              <span className="bet-slip__total-odd-label">Odd: <strong>{formatOdd(totalOdd)}</strong></span>
            </div>
            
            <div className="bet-slip__input-wrapper">
              <span className="bet-slip__currency-prefix">R$</span>
              <input
                type="number"
                value={stake || ''}
                onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>

            <div className="bet-slip__quick-stakes">
              {QUICK_STAKES.map(val => (
                <button key={val} type="button" onClick={() => setStake(stake + val)} className="bet-slip__quick-stake-btn">+{val}</button>
              ))}
            </div>
          </div>

          <div className="bet-slip__summary-row">
            <span>Retorno</span>
            <span className="bet-slip__potential-value">{formatBRL(potentialReturn)}</span>
          </div>

          <button 
            type="button" 
            className="bet-slip__confirm-btn" 
            onClick={handleConfirm}
            disabled={isProcessing || items.length === 0 || stake <= 0}
          >
            {isProcessing ? 'Enviando...' : 'Apostar'}
          </button>

          {feedback && <div className={`bet-slip__feedback ${feedback.includes('sucesso') ? 'bet-slip__feedback--success' : ''}`}>{feedback}</div>}
        </footer>
      </>
    );
  };

  return (
    <div className="bet-slip-overlay">
      <div className="bet-slip-backdrop" onClick={onClose} />
      <aside className="bet-slip-modal">
        {renderContent()}
      </aside>
    </div>
  );
}
