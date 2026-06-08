import { NavLink, Link, Outlet, useParams, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, Trophy, Terminal as TerminalIcon, LogOut, Package, Wallet, History, User, Settings, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';
import Terminal, { useTerminal } from './Terminal';
import ToastContainer from './Toast';
import { useBotConfig } from '../hooks/useBotConfig';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/store', label: 'Loja', icon: Store, end: false },
  { to: '/ranking', label: 'Rankings', icon: Trophy, end: false },
  { to: '/dashboard?tab=history', label: 'Extrato', icon: History, end: false },
];

const adminNavItems = [
  { to: '/admin?tab=factory', label: 'Loja', icon: Package, end: false },
  { to: '/admin?tab=users', label: 'Usuários', icon: User, end: false },
  { to: '/admin?tab=economy', label: 'Economia', icon: Wallet, end: false },
  { to: '/admin?tab=logs', label: 'Auditoria', icon: History, end: false },
  { to: '/admin?tab=config', label: 'Config', icon: Settings, end: false },
];

export default function Layout() {
  const { botId } = useParams<{ botId: string }>();
  const location = useLocation();
  const { logs, addLog } = useTerminal();
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  const isAdmin = location.pathname.includes('/admin');
  const currentNavItems = isAdmin ? adminNavItems : navItems;
  const botConfig = useBotConfig();

  // Helper to format bot name display
  const getDisplayName = () => {
    const { bot_name, bot_username } = botConfig;
    if (bot_name && bot_name !== bot_username && bot_name !== bot_username.replace('@', '')) {
      return bot_name;
    }
    if (bot_username) {
      return bot_username.replace('@', '').toUpperCase();
    }
    return 'Meu Bot';
  };

  return (
    <div className={cn(
      "min-h-screen bg-surface flex flex-col font-sans selection:bg-primary selection:text-black",
      !isAdmin && "pb-32"
    )}>
      <ToastContainer />

      {/* Top Navigation - Minimalist Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border px-md lg:px-xl h-20 flex items-center justify-between gap-md">
        <Link to={`/${botId}`} className="flex items-center gap-sm shrink-0">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-primary transition-transform hover:rotate-3">
            <span className="font-black text-xl">B.</span>
          </div>
          <div className="flex flex-col -gap-1">
            <h1 className="text-lg font-black tracking-tighter text-black leading-none truncate max-w-[150px] normal-case">
              {getDisplayName()}
            </h1>
            <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">SaaS Dashboard</span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-md shrink-0">
          {isAdmin && (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-admin-sidebar'))}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-black text-primary transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
              title="Menu de Navegação"
            >
              <Menu size={20} />
            </button>
          )}

          <button 
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={cn(
              "btn-primary h-10 sm:h-11 px-4 sm:px-6 text-[9px] sm:text-[10px] rounded-full shadow-sm hover:shadow-md",
              isTerminalOpen ? "bg-black text-primary" : "bg-primary text-black"
            )}
          >
            <TerminalIcon size={16} />
            <span className="hidden md:inline ml-2 tracking-widest">EVENTOS</span>
          </button>
          
          <button className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full border border-border text-muted hover:text-error transition-all hover:bg-error/5 hover:border-error/20">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Floating Bottom Navigation - "Pílula" format */}
      {!isAdmin && (
        <div className="fixed bottom-6 left-0 right-0 z-[60] flex justify-center pointer-events-none px-6">
          <div className="pointer-events-auto bg-[#0f0f0f] rounded-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] p-1.5 transition-all duration-500">
            <nav className="flex items-center justify-center gap-1.5 no-scrollbar scroll-smooth">
              {currentNavItems.map((item) => {
                const fullPath = `/${botId}${item.to}`;
                const isHistory = location.search.includes('tab=history');
                let isActive = false;
                if (item.to === '/dashboard') {
                  isActive = (location.pathname.endsWith('/dashboard') || location.pathname.endsWith('/inventory')) && !isHistory;
                } else if (item.to === '/dashboard?tab=history') {
                  isActive = isHistory;
                } else {
                  isActive = location.pathname === fullPath;
                }

                return (
                  <NavLink
                    key={item.to}
                    to={fullPath}
                    className={cn(
                      "flex flex-col items-center justify-center transition-all duration-500 ease-out group shrink-0 relative",
                      "h-12 sm:h-14 rounded-full px-5 sm:px-8",
                      isActive 
                        ? "bg-primary text-black shadow-lg shadow-primary/10" 
                        : "text-white/30 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "transition-all duration-500 ease-spring flex flex-col items-center justify-center",
                      isActive ? "-translate-y-1.5" : "translate-y-0"
                    )}>
                      <item.icon 
                        size={20} 
                        className={cn(
                          "transition-all duration-700 cubic-bezier(0.175, 0.885, 0.32, 1.275)", 
                          isActive ? "scale-125 animate-float" : "scale-100 group-hover:scale-110 group-hover:rotate-12 group-hover:-translate-y-1"
                        )} 
                      />
                      
                      <div className={cn(
                        "absolute top-5 sm:top-6 transition-all duration-500 ease-out flex flex-col items-center",
                        isActive ? "opacity-100 translate-y-0.5" : "opacity-0 translate-y-4 pointer-events-none"
                      )}>
                        <span className="font-black uppercase tracking-tighter whitespace-nowrap text-center text-[9px] sm:text-[10px]">
                          {item.label}
                        </span>
                      </div>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 overflow-x-hidden",
        isAdmin ? "overflow-y-visible" : "overflow-y-auto p-md lg:p-xl"
      )}>
        <div className={cn(
          "mx-auto",
          !isAdmin && "max-w-[1200px]"
        )}>
          <div className={cn(
            "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out",
            isAdmin && "duration-0 slide-in-from-bottom-0"
          )}>
            <Outlet />
          </div>
        </div>
      </main>

      {/* Development Terminal Overlay */}
      {isTerminalOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] animate-slide-in">
          <Terminal logs={logs} setAddLog={addLog} onClose={() => setIsTerminalOpen(false)} />
        </div>
      )}

      <style>{`
        .ease-spring {
          transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1.25); }
          50% { transform: translateY(-4px) scale(1.3); }
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
