import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PrivateRoute from './routes/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cashier from './pages/Cashier';
import Inventory from './pages/Inventory';
import HppCalculator from './pages/HppCalculator';
import StockOpname from './pages/StockOpname';
import Employees from './pages/Employees';
import { firebaseReady, missingFirebaseConfig } from './config/firebase';

function Shell() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <div className="app-status">Memeriksa sesi akun Moon Autoparts…</div>;
  }

  if (!user) {
    return <Login authError={error} />;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <Sidebar />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to={user.role === 'kasir' ? '/cashier' : '/dashboard'} replace />} />
          <Route path="/login" element={<Navigate to={user.role === 'kasir' ? '/cashier' : '/dashboard'} replace />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={['owner', 'admin']}>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/cashier"
            element={
              <PrivateRoute allowedRoles={['owner', 'admin', 'kasir']}>
                <Cashier />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute allowedRoles={['owner', 'admin']}>
                <Inventory />
              </PrivateRoute>
            }
          />
          <Route
            path="/hpp-calculator"
            element={
              <PrivateRoute allowedRoles={['owner', 'admin']}>
                <HppCalculator />
              </PrivateRoute>
            }
          />
          <Route
            path="/stock-opname"
            element={
              <PrivateRoute allowedRoles={['owner', 'admin']}>
                <StockOpname />
              </PrivateRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <PrivateRoute allowedRoles={['owner']}>
                <Employees />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to={user.role === 'kasir' ? '/cashier' : '/dashboard'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  if (!firebaseReady) {
    return (
      <main className="firebase-setup">
        <section className="panel">
          <p className="eyebrow">Konfigurasi Firebase diperlukan</p>
          <h1>Hubungkan Moon Autoparts ke proyek Firebase</h1>
          <p>Aplikasi tidak memakai data demo atau penyimpanan lokal. Isi konfigurasi web Firebase untuk mulai menggunakan Authentication dan Cloud Firestore.</p>
          <p>Variabel yang belum diatur: {missingFirebaseConfig.join(', ')}</p>
          <p>Salin `.env.example` menjadi `.env.local`, isi nilainya dari Firebase Console, lalu jalankan ulang server.</p>
        </section>
      </main>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
