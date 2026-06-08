import { Box, Play, ArrowRight, Coins } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface InventoryProps {
  inventory: any[];
  selectedItem: string | null;
  setSelectedItem: (id: string | null) => void;
  handleUseItem: (itemId: string, itemName: string, itemType?: string) => void;
  handleSellToShop: (itemId: string, itemName: string) => void;
}

export default function Inventory({ 
  inventory, 
  selectedItem, 
  setSelectedItem, 
  handleUseItem, 
  handleSellToShop 
}: InventoryProps) {
  return (
    <div className="refined-card">
      <header className="flex items-center justify-between mb-xl border-b border-border pb-md">
        <div className="flex items-center gap-md">
          <Box className="text-black" size={20} />
          <h4 className="text-lg font-black text-black uppercase tracking-tight">Inventário</h4>
        </div>
        <span className="bg-surface text-black px-4 py-1 rounded-full text-[10px] font-black uppercase">
          {inventory.length} itens
        </span>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {inventory.length === 0 ? (
          <div className="col-span-full py-xl text-center opacity-30 font-bold text-xs italic uppercase tracking-widest">-- SEM ITENS --</div>
        ) : (
          inventory.map((item, index) => (
            <div 
              key={item.item_id} 
              className={cn(
                "flex flex-col p-0 bg-surface rounded-3xl border-2 transition-all group overflow-hidden stagger-item",
                selectedItem === item.item_id ? "border-black shadow-lg scale-[1.02]" : "border-transparent hover:border-black/10"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-center p-lg cursor-pointer" onClick={() => setSelectedItem(selectedItem === item.item_id ? null : item.item_id)}>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase text-black group-hover:text-primary transition-colors">{item.name}</span>
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider mt-1">Ref: {item.item_id.substring(0, 8)}</span>
                </div>
                <div className="bg-black text-primary px-3 py-1 rounded-full text-xs font-black">x{item.quantity}</div>
              </div>
              {selectedItem === item.item_id && (
                <div className="p-4 bg-white border-t border-border flex flex-col gap-2">
                  <button onClick={() => handleUseItem(item.item_id, item.name, item.item_type)} className="flex items-center justify-between p-3 rounded-2xl bg-black text-white hover:bg-primary hover:text-black transition-all group/btn">
                    <div className="flex items-center gap-3"><Play size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Usar Agora</span></div>
                    <ArrowRight size={14} />
                  </button>
                  <button onClick={() => handleSellToShop(item.item_id, item.name)} className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-surface hover:bg-red-500 hover:text-white transition-all">
                    <Coins size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Vender Item</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
