import { useAuth } from '../context/AuthContext';
import logoUrl from '../../logo.png';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img src={logoUrl} alt="Logo Moon Autoparts" />
        <div>
          <p className="eyebrow">Sparepart Mobil</p>
          <h1>Moon Autoparts</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="user-pill">
          <span className="dot" />
          <div>
            <strong>{user?.nama}</strong>
            <small>{user?.role}</small>
          </div>
        </div>
        <button className="secondary-btn" onClick={logout}>
          Keluar
        </button>
      </div>
    </header>
  );
}
