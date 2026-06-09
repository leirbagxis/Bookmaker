import { NavLink } from 'react-router-dom';
import { useBetSlip } from '../context/BetSlipContext';

export function BottomNavigation() {
  const { items } = useBetSlip();
  const itemsNav = [
    { 
      to: '/', 
      label: 'Início',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      )
    },
    { 
      to: '/live', 
      label: 'Ao vivo',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>
      )
    },
    { 
      to: '/betslip', 
      label: 'Bilhetes', 
      badge: items.length > 0 ? items.length : undefined,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
      )
    },
    { 
      to: '/profile', 
      label: 'Perfil',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      )
    },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-accent text-white p-2 rounded-full flex gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 w-[90%] max-w-[400px] justify-between">
      {itemsNav.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center w-16 h-14 rounded-full transition-all duration-300 ${
              isActive ? 'bg-primary text-black' : 'text-muted hover:text-white'
            }`
          }
        >
          <span className="mb-1">{it.icon}</span>
          <span className="text-[9px] font-black uppercase tracking-wider">{it.label}</span>
          {it.badge !== undefined && it.badge > 0 && (
            <span className="absolute top-0 right-1 w-5 h-5 bg-error text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-accent">
              {it.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
