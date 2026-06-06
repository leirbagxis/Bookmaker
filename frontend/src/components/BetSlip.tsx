import { useState } from 'react';
import { useBetSlip } from '../context/BetSlipContext';

type Props = {
  show?: boolean;
  onClose?: () => void;
};

function formatBRL(n: number): string {
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatOdd(n: number): string {
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

export function BetSlip({ show, onClose }: Props) {
  const { items, stake, totalOdd, potentialReturn, remove, clear, setStake, confirm } = useBetSlip();
  const [feedback, setFeedback] = useState<string | null>(null);

  // No mobile, se não houver itens e não estiver forçado a mostrar, esconde
  const isVisible = show || (items.length > 0);

  if (!isVisible && typeof window !== 'undefined' && window.innerWidth < 1024) {
    return null;
  }

  const handleConfirm = () => {
    const msg = confirm();
    setFeedback(msg);
  };

  return (
    <aside className={`bet-slip ${isVisible ? 'bet-slip--visible' : ''}`} aria-label="Bilhete de aposta simulada">
      <header className="bet-slip__head">
        <h2 className="bet-slip__title">Bilhete</h2>
        {onClose && (
          <button type="button" className="bet-slip__close" onClick={onClose} aria-label="Fechar bilhete">
            ×
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="bet-slip__empty">
          <p className="bet-slip__empty-title">Seu bilhete está vazio</p>
          <p className="bet-slip__empty-desc">Selecione uma odd para começar</p>
        </div>
      ) : (
        <>
          <ul className="bet-slip__list">
            {items.map((it) => (
              <li key={`${it.selection.eventId}::${it.selection.id}::${it.selection.marketId}`} className="bet-slip__item">
                <div className="bet-slip__item-info">
                  <span className="bet-slip__item-market">{it.selection.marketName}</span>
                  <span className="bet-slip__item-name">
                    {it.selection.homeTeam || ''}
                    {it.selection.homeTeam ? ' x ' : ''}
                    {it.selection.awayTeam || ''}
                    {' — '}
                    {it.selection.name}
                  </span>
                </div>
                <div className="bet-slip__item-side">
                  <span className="bet-slip__item-odd">{formatOdd(it.selection.price)}</span>
                  <button
                    type="button"
                    className="bet-slip__item-remove"
                    onClick={() => remove(it.selection)}
                    aria-label="Remover seleção"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="bet-slip__stake">
            <label htmlFor="bet-slip-stake">Valor (R$)</label>
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

          <div className="bet-slip__summary">
            <div>
              <span>Odd total</span>
              <strong>{formatOdd(totalOdd)}</strong>
            </div>
            <div>
              <span>Retorno potencial</span>
              <strong>{formatBRL(potentialReturn)}</strong>
            </div>
          </div>

          <div className="bet-slip__actions">
            <button type="button" className="bet-slip__clear" onClick={clear}>
              Limpar
            </button>
            <button type="button" className="bet-slip__confirm" onClick={handleConfirm}>
              Confirmar aposta simulada
            </button>
          </div>

          {feedback && <p className="bet-slip__feedback">{feedback}</p>}
        </>
      )}
    </aside>
  );
}
