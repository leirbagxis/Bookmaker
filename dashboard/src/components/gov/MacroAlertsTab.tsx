import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCcw } from 'lucide-react';
import { fetchGovAlerts, acknowledgeGovAlert, type GovMacroAlert } from '../../api';
import { showToast } from '../Toast';
import ConfirmationModal from '../ConfirmationModal';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

export default function MacroAlertsTab() {
  const [alerts, setAlerts] = useState<GovMacroAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'open' | 'acknowledged'>('open');
  const [confirming, setConfirming] = useState<GovMacroAlert | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchGovAlerts(status);
      setAlerts(data);
    } catch (e: any) {
      showToast.error('Falha ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const handleAck = async (alert: GovMacroAlert) => {
    try {
      await acknowledgeGovAlert(alert.id);
      showToast.success('Alerta reconhecido');
      await load();
    } catch (e: any) {
      showToast.error('Falha ao reconhecer alerta');
    }
    setConfirming(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['open', 'acknowledged'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${
                status === s ? 'bg-black text-primary' : 'bg-surface text-muted hover:text-black'
              }`}
            >
              {s === 'open' ? 'Abertos' : 'Reconhecidos'}
            </button>
          ))}
        </div>
        <button onClick={load} className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-black flex items-center gap-2">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center text-[10px] font-black uppercase text-muted py-12">Carregando...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-panel rounded-[2rem] border border-border/50 p-12 text-center">
          <div className="text-[10px] font-black uppercase text-muted tracking-widest">
            {status === 'open' ? 'Nenhum alerta aberto' : 'Nenhum alerta reconhecido'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {(alerts || []).map((a) => (
            <div key={a.id} className="bg-panel rounded-2xl border border-border/50 p-5 flex items-start gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${SEVERITY_STYLES[a.severity] || 'bg-gray-100 text-gray-700'}`}>
                    {a.severity}
                  </span>
                  <code className="text-[10px] font-black uppercase text-muted">{a.signal}</code>
                  <span className="text-[9px] font-bold text-muted">Bot {a.bot_id}</span>
                </div>
                <div className="text-sm font-bold text-black">{a.message}</div>
                <div className="text-[9px] font-bold text-muted">
                  {new Date(a.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
              {status === 'open' && (
                <button
                  onClick={() => setConfirming(a)}
                  className="shrink-0 p-2.5 rounded-xl bg-black text-primary hover:bg-primary hover:text-black transition-all"
                  title="Reconhecer"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirming !== null}
        title="Reconhecer alerta"
        message={`Marcar o alerta "${confirming?.signal}" como reconhecido?`}
        type="primary"
        onConfirm={() => confirming && handleAck(confirming)}
        onClose={() => setConfirming(null)}
      />
    </div>
  );
}
