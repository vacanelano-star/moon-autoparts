import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../../logo.png';

export default function Login({ authError = '' }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-welcome">
        <div className="login-brand">
          <img src={logoUrl} alt="Logo Moon Autoparts" />
          <strong>Moon <span>Autoparts</span></strong>
        </div>

        <div className="welcome-copy">
          <p className="login-kicker">Ruang kerja bisnis Anda</p>
          <h1>Kelola sparepart mobil dengan lebih terarah.</h1>
          <p className="welcome-description">
            Pantau persediaan, harga pokok, dan transaksi sparepart dalam satu aplikasi operasional pabrik.
          </p>
          <ul className="welcome-benefits">
            <li>Data usaha tersimpan di cloud</li>
            <li>Stok diperbarui saat transaksi</li>
            <li>Akses tim sesuai peran</li>
          </ul>
        </div>

        <p className="login-footer">Moon Autoparts · Operasional sparepart dalam satu tempat</p>
      </section>

      <section className="login-form-side">
        <div className="login-form-wrap">
          <p className="login-kicker">Selamat datang kembali</p>
          <h2>Masuk ke akun Anda</h2>
          <p className="login-intro">Gunakan akun karyawan Moon Autoparts untuk melanjutkan.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="login-email">
              Email
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="nama@usaha.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label htmlFor="login-password">
              Kata sandi
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {(error || authError) && <p className="login-error" role="alert">{error || authError}</p>}

            <button type="submit" className="primary-btn login-submit" disabled={submitting}>
              <span aria-hidden="true">→</span> {submitting ? 'Memeriksa akun…' : 'Masuk'}
            </button>
          </form>

          <p className="login-security">Akses aman dengan Firebase Authentication</p>
          <p className="login-credit">Moon Autoparts · Sistem operasional</p>
        </div>
      </section>
    </main>
  );
}
