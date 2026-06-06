import { useEffect, useState } from 'react';
import { useBetSlip, getSelectionKey } from '../context/BetSlipContext';

type Props = {
  show?: boolean;
  onClose?: () => void;
};

function formatBRL(n: number): string {
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatOdd(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0.00';
  return n.toFixed(2);
}

export function BetSlip({ show, onClose }: Props) {
  const { items, stake, totalOdd, potentialReturn, remove, clear, setStake, confirm } = useBetSlip();
  const [feedback, setFeedback] = useState<string | null>(null);

  const QUICK_STAKES = [5, 10, 20, 50, 100];

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  const handleConfirm = () => {
    const msg = confirm();
    setFeedback(msg);
    if (msg.includes('sucesso')) {
      setTimeout(() => {
        setFeedback(null);
        onClose?.();
      }, 2000);
    }
  };

  return (
    <div className="bet-slip-overlay" role="dialog" aria-modal="true">
      <div className="bet-slip-backdrop" onClick={onClose} />
      
      <aside className="bet-slip-modal">
        <header className="bet-slip__head">
          <div className="bet-slip__head-main">
            <h2 className="bet-slip__title">Meu Bilhete</h2>
            {items.length > 0 && (
              <button type="button" className="bet-slip__clear-all" onClick={clear} title="Limpar tudo">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                <span>Limpar</span>
              </button>
            )}
          </div>
          <button type="button" className="bet-slip__close" onClick={onClose} aria-label="Fechar bilhete">
            ×
          </button>
        </header>

        {items.length === 0 ? (
          <div className="bet-slip__empty">
            <div className="bet-slip__empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
            </div>
            <p className="bet-slip__empty-title">Seu bilhete está vazio</p>
            <p className="bet-slip__empty-desc">Selecione uma odd para começar a montar sua aposta.</p>
            <button type="button" className="bet-slip__back-btn" onClick={onClose}>
              Voltar para os jogos
            </button>
          </div>
        ) : (
          <>
            <div className="bet-slip__scroll-area">
              <ul className="bet-slip__list">
                {items.map((it) => (
                  <li key={getSelectionKey(it.selection)} className="bet-slip__item">
                    <div className="bet-slip__item-content">
                      <div className="bet-slip__item-match">
                        {it.selection.homeTeam || 'Time A'} vs {it.selection.awayTeam || 'Time B'}
                      </div>
                      <div className="bet-slip__item-details">
                        <span className="bet-slip__item-market">{it.selection.marketName}:</span>
                        <span className="bet-slip__item-selection">{it.selection.name}</span>
                      </div>
                    </div>
                    <div className="bet-slip__item-actions">
                      <span className="bet-slip__item-odd">{formatOdd(it.selection.price)}</span>
                      <button
                        type="button"
                        className="bet-slip__item-remove"
                        onClick={() => remove(it.selection)}
                        aria-label="Remover seleção"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="bet-slip__footer">
              <div className="bet-slip__stake-section">
                <div className="bet-slip__stake-header">
                  <label htmlFor="bet-slip-stake">Valor da Aposta</label>
                  <span className="bet-slip__total-odd-label">
                    Odd Total: <strong>{formatOdd(totalOdd)}</strong>
                  </span>
                </div>
                
                <div className="bet-slip__input-wrapper">
                  <span className="bet-slip__currency-prefix">R$</span>
                  <input
                    id="bet-slip-stake"
                    type="number"
                    min="0"
                    step="1"
                    value={stake || ''}
                    onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>

                <div className="bet-slip__quick-stakes">
                  {QUICK_STAKES.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setStake(stake + val)}
                      className="bet-slip__quick-stake-btn"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bet-slip__summary-row">
                <span>Retorno Potencial</span>
                <span className="bet-slip__potential-value">{formatBRL(potentialReturn)}</span>
              </div>

              <button type="button" className="bet-slip__confirm-btn" onClick={handleConfirm}>
                Confirmar Aposta
              </button>

              {feedback && (
                <div className={`bet-slip__feedback ${feedback.includes('sucesso') ? 'bet-slip__feedback--success' : ''}`}>
                  {feedback}
                </div>
              )}
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
