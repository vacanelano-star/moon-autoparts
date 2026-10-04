import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseReady } from '../config/firebase';

const AuthContext = createContext(null);
const VALID_ROLES = ['owner', 'admin', 'kasir'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseReady);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setError('');
      setLoading(true);
      try {
        const employeeSnapshot = await getDoc(doc(db, 'employees', firebaseUser.uid));
        if (!employeeSnapshot.exists()) {
          await signOut(auth);
          setUser(null);
          setError('Akun belum terdaftar sebagai karyawan Moon Autoparts. Hubungi Owner.');
          return;
        }

        const profile = employeeSnapshot.data();
        if (profile.status !== 'aktif' || !VALID_ROLES.includes(profile.role)) {
          await signOut(auth);
          setUser(null);
          setError('Akun tidak aktif atau role belum dikonfigurasi. Hubungi Owner.');
          return;
        }

        setUser({
          id: firebaseUser.uid,
          nama: profile.nama,
          email: firebaseUser.email,
          role: profile.role
        });
      } catch (authError) {
        if (authError.code === 'permission-denied') {
          await signOut(auth);
        }
        setUser(null);
        setError(`Gagal memuat profil karyawan: ${authError.message}`);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email, password) => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (authError) {
      throw new Error(getAuthErrorMessage(authError));
    }
  };

  const logout = async () => {
    setError('');
    try {
      await signOut(auth);
    } catch (authError) {
      setError(`Gagal keluar dari akun: ${authError.message}`);
      throw authError;
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    error,
    clearError: () => setError(''),
    login,
    logout
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getAuthErrorMessage(error) {
  if (error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
    return 'Email atau kata sandi salah.';
  }
  if (error.code === 'auth/too-many-requests') {
    return 'Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi.';
  }
  if (error.code === 'auth/network-request-failed') {
    return 'Tidak dapat terhubung ke Firebase. Periksa koneksi internet.';
  }
  return `Login gagal: ${error.message}`;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
