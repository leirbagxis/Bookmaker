import { NavLink } from 'react-router-dom';
import { useBetSlip } from '../context/BetSlipContext';

type Item = {
  to: string;
  label: string;
  badge?: number;
};

export function BottomNavigation({ onOpenBetSlip }: { onOpenBetSlip?: () => void }) {
  const { items } = useBetSlip();
  const itemsNav = [
    { 
      to: '/', 
      label: 'Início',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      ),
      onClick: undefined as any
    },
    { 
      to: '/live', 
      label: 'Ao vivo',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>
      ),
      onClick: undefined as any
    },
    { 
      to: '/betslip', 
      label: 'Bilhetes', 
      badge: items.length > 0 ? items.length : undefined,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
      ),
      onClick: undefined as any
    },
    { 
      to: '/profile', 
      label: 'Perfil',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ),
      onClick: undefined as any
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {itemsNav.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          onClick={it.onClick}
          end={it.to === '/'}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__icon">{it.icon}</span>
          <span className="bottom-nav__label">{it.label}</span>
          {it.badge !== undefined && it.badge > 0 && (
            <span className="bottom-nav__badge">{it.badge}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
