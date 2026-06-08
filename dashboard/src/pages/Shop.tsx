import { useEffect, useState } from 'react';
import { fetchShopItems, getBotId, buyItem } from '../api';
import { useBotConfig } from '../hooks/useBotConfig';
import { Database } from 'lucide-react';
import { terminal } from '../components/Terminal';
import { showToast } from '../components/Toast';

// Sub-components
import ShopItemCard from '../components/shop/ShopItemCard';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}

export default function Shop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const botConfig = useBotConfig();

  useEffect(() => {
    const botId = getBotId();
    if (!botId) return;

    const loadItems = async () => {
      try {
        terminal.log('Carregando itens da loja...');
        const data = await fetchShopItems(botId);
        setItems(data || []);
        terminal.success(`Loja carregada: ${data?.length || 0} itens disponíveis.`);
      } catch (err) {
        terminal.error('Erro ao carregar itens da loja.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const handleBuy = async (itemId: string, itemName: string) => {
    const botId = getBotId();
    if (!botId || buyingId) return;
    
    setBuyingId(itemId);
    terminal.log(`Iniciando compra: ${itemName}...`);
    
    try {
      await buyItem(botId, itemId);
      showToast.success(`Compra realizada: ${itemName}.`);
      terminal.success(`Compra de ${itemName} concluída com sucesso.`);
      
      // Refresh shop items to update stock
      const data = await fetchShopItems(botId);
      setItems(data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Falha na compra";
      showToast.error(`Erro: ${errorMsg}`);
      terminal.error(`Falha na compra: ${errorMsg}`);
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-xl">
      <Database className="animate-pulse text-black mb-md" size={32} />
      <div className="status-label">Carregando loja...</div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-lg">
      <header className="flex justify-between items-end border-b border-border pb-md mb-xl">
        <div>
          <div className="status-label">Mercado</div>
          <h2 className="text-4xl font-black text-black tracking-tighter uppercase">Loja de Itens</h2>
        </div>
        <div className="text-[10px] font-bold text-muted uppercase tracking-widest pb-1">Setor Comercial</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {(items || []).length === 0 ? (
          <div className="col-span-full refined-card p-xl text-center opacity-30 font-bold text-xs italic uppercase tracking-widest">
            -- NENHUM ITEM DISPONÍVEL NO MOMENTO --
          </div>
        ) : (
          items.map(item => (
            <ShopItemCard 
              key={item.id}
              item={item}
              botConfig={botConfig}
              buyingId={buyingId}
              handleBuy={handleBuy}
            />
          ))
        )}
      </div>
    </div>
  );
}
