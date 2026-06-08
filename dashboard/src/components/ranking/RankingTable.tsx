import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface RankedUser {
  user_id: number;
  username: string;
  first_name: string;
  value: number;
  position: number;
}

interface RankingTableProps {
  users: RankedUser[];
  type: 'balance' | 'messages';
  botConfig: any;
  formatValue: (value: number) => string;
  obfuscateID: (id: number) => string;
}

export default function RankingTable({
  users,
  type,
  botConfig,
  formatValue,
  obfuscateID
}: RankingTableProps) {
  return (
    <div className="refined-card p-0 overflow-hidden border border-border/50">
      <div className="hidden md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="py-md px-lg text-[10px] font-black uppercase tracking-widest text-muted">Pos</th>
              <th className="py-md px-lg text-[10px] font-black uppercase tracking-widest text-muted">Identidade</th>
              <th className="py-md px-lg text-right text-[10px] font-black uppercase tracking-widest text-muted">
                {type === 'balance' ? `Volume (${botConfig.currency_symbol})` : 'Mensagens'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-xl text-center opacity-30 font-bold uppercase tracking-widest">Nenhum dado registrado</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.user_id} className="hover:bg-surface transition-colors group">
                  <td className="py-lg px-lg">
                    <span className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs",
                      user.position === 1 ? 'bg-primary text-black' : 
                      user.position === 2 ? 'bg-black text-white' : 
                      user.position === 3 ? 'bg-black/10 text-black' : 'text-muted'
                    )}>
                      {String(user.position).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-lg px-lg">
                    <div className="flex flex-col">
                      <span className="font-black text-black group-hover:text-primary transition-colors text-lg leading-tight">
                        {user.first_name}
                      </span>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">ID: {obfuscateID(user.user_id)}</span>
                    </div>
                  </td>
                  <td className="py-lg px-lg text-right">
                    <div className="text-xl font-black text-black">
                      {type === 'balance' && <span className="text-xs mr-1 opacity-40">{botConfig.currency_symbol}</span>}
                      {formatValue(user.value || 0)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden divide-y divide-border">
        {users.length === 0 ? (
          <div className="py-xl text-center opacity-30 font-bold uppercase tracking-widest">Nenhum dado registrado</div>
        ) : (
          users.map((user) => (
            <div key={user.user_id} className="p-lg flex items-center justify-between group active:bg-surface transition-colors">
              <div className="flex items-center gap-md">
                <span className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs shrink-0",
                  user.position === 1 ? 'bg-primary text-black' : 
                  user.position === 2 ? 'bg-black text-white' : 
                  user.position === 3 ? 'bg-black/10 text-black' : 'text-muted/40'
                )}>
                  {user.position}
                </span>
                <div className="flex flex-col truncate max-w-[150px]">
                  <span className="font-black text-black group-hover:text-primary transition-colors text-base leading-tight truncate">
                    {user.first_name}
                  </span>
                  <span className="text-[9px] font-bold text-muted uppercase tracking-widest">#{obfuscateID(user.user_id)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black text-black">
                  {formatValue(user.value || 0)}
                </div>
                <div className="text-[9px] font-bold text-muted uppercase tracking-widest">
                  {type === 'balance' ? botConfig.currency_name : 'MSGS'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
