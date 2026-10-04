import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const routes = [
  { label: 'Dashboard', path: '/dashboard', roles: ['owner', 'admin'] },
  { label: 'Kasir', path: '/cashier', roles: ['owner', 'admin', 'kasir'] },
  { label: 'Inventory', path: '/inventory', roles: ['owner', 'admin'] },
  { label: 'Perhitungan HPP', path: '/hpp-calculator', roles: ['owner', 'admin'] },
  { label: 'Stock Opname', path: '/stock-opname', roles: ['owner', 'admin'] },
  { label: 'Karyawan', path: '/employees', roles: ['owner'] }
];

export default function Sidebar() {
  const { user } = useAuth();

  const visibleRoutes = routes.filter((route) => route.roles.includes(user?.role));

  return (
    <aside className="sidebar">
      <nav>
        {visibleRoutes.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
