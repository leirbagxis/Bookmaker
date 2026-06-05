import { NavLink } from 'react-router-dom';
import { useBetSlip } from '../context/BetSlipContext';

type Item = {
  to: string;
  label: string;
  badge?: number;
};

export function BottomNavigation() {
  const { items } = useBetSlip();
  const itemsNav: Item[] = [
    { to: '/', label: 'Início' },
    { to: '/live', label: 'Ao vivo' },
    { to: '/betslip', label: 'Bilhete', badge: items.length },
    { to: '/profile', label: 'Perfil' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {itemsNav.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__label">{it.label}</span>
          {it.badge !== undefined && it.badge > 0 && (
            <span className="bottom-nav__badge">{it.badge}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
