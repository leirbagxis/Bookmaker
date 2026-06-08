import { ShoppingBag, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}

interface ShopItemCardProps {
  item: ShopItem;
  botConfig: any;
  buyingId: string | null;
  handleBuy: (itemId: string, itemName: string) => void;
}

export default function ShopItemCard({
  item,
  botConfig,
  buyingId,
  handleBuy
}: ShopItemCardProps) {
  return (
    <div className={cn(
      "refined-card group flex flex-col border transition-all",
      item.stock === 0 ? "opacity-60 grayscale border-border" : "border-transparent hover:border-primary"
    )}>
      <header className="mb-md">
        <div className="flex justify-between items-start">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40 mb-xs block">Item de Inventário</div>
          {item.stock !== -1 && (
            <div className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest",
              item.stock > 0 ? "bg-black text-primary" : "bg-red-500 text-white"
            )}>
              Estoque: {item.stock}
            </div>
          )}
        </div>
        <h3 className="text-2xl font-black text-black group-hover:text-primary transition-colors leading-tight uppercase">{item.name}</h3>
      </header>
      
      <p className="text-xs text-muted mb-lg flex-1 font-bold leading-relaxed uppercase tracking-wide">
        {item.description || 'Nenhuma descrição fornecida.'}
      </p>
      
      <div className="flex items-center justify-between mt-auto pt-md border-t border-border">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/20 mb-xs block">Preço</span>
          <div className="text-2xl font-black text-black">
            {botConfig.currency_symbol} {(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        
        <button 
          onClick={() => handleBuy(item.id, item.name)}
          disabled={buyingId !== null || item.stock === 0}
          className={cn(
            "btn-primary h-12 px-6",
            buyingId === item.id ? "bg-black text-primary" : (item.stock === 0 ? "bg-muted text-white cursor-not-allowed" : "bg-primary text-black")
          )}
        >
          {buyingId === item.id ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ShoppingBag size={16} />
          )}
          <span className="ml-2">
            {buyingId === item.id ? 'PROCESSANDO' : (item.stock === 0 ? 'ESGOTADO' : 'COMPRAR')}
          </span>
        </button>
      </div>
    </div>
  );
}
