import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  changeEmployeeRole,
  createEmployeeAccount,
  removeEmployeeAccount,
  useEmployees
} from '../hooks/useFirestore';

const initialForm = { nama: '', email: '', password: '', role: 'kasir' };
const allowedRoles = ['owner', 'admin', 'kasir'];

export default function Employees() {
  const { user } = useAuth();
  const [employees, { loading, error: employeesError }] = useEmployees();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (user.role !== 'owner') {
    return <p className="access-denied">Hanya Owner yang dapat mengelola akun dan role.</p>;
  }

  const updateRole = async (id, nextRole) => {
    if (!allowedRoles.includes(nextRole)) return;
    const target = employees.find((employee) => employee.id === id);
    const ownerCount = employees.filter((employee) => employee.role === 'owner').length;

    if (target?.role === 'owner' && nextRole !== 'owner' && ownerCount <= 1) {
      setError('Minimal harus ada satu akun Owner.');
      return;
    }

    try {
      setError('');
      await changeEmployeeRole(id, nextRole);
    } catch (roleError) {
      setError(`Gagal mengubah role: ${roleError.message}`);
    }
  };

  const addEmployee = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createEmployeeAccount({
        nama: form.nama.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role
      });
      setForm(initialForm);
    } catch (createError) {
      setError(`Gagal membuat akun karyawan: ${createError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeEmployee = async (employee) => {
    if (employee.id === user.id) {
      setError('Akun Owner yang sedang digunakan tidak dapat dihapus.');
      return;
    }

    if (employee.role === 'owner' && employees.filter((item) => item.role === 'owner').length <= 1) {
      setError('Minimal harus ada satu akun Owner.');
      return;
    }

    if (!window.confirm(`Hapus akun ${employee.nama}?`)) return;

    try {
      setError('');
      await removeEmployeeAccount(employee.id);
    } catch (removeError) {
      setError(`Gagal menghapus akun: ${removeError.message}`);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="eyebrow">Khusus Owner</p>
          <h2>Kelola Akun & Role</h2>
        </div>
      </div>

      <form className="panel employee-form" onSubmit={addEmployee}>
        <h3>Tambah akun karyawan</h3>
        <div className="employee-form-fields">
          <label>
            Nama
            <input
              value={form.nama}
              onChange={(event) => setForm((current) => ({ ...current, nama: event.target.value }))}
              placeholder="Nama karyawan"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="nama@usaha.com"
              required
            />
          </label>
          <label>
            Kata sandi awal
            <input
              type="password"
              minLength="8"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="kasir">Kasir</option>
            </select>
          </label>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Membuat akun…' : 'Tambah akun'}
          </button>
        </div>
      </form>

      <section className="panel">
        <h3>Akun terdaftar</h3>
        {error && <p className="employee-error" role="alert">{error}</p>}
        {employeesError && <p className="employee-error" role="alert">{employeesError}</p>}
        {loading ? (
          <p className="empty-state">Memuat akun karyawan dari database…</p>
        ) : (
        <div className="list-stack compact">
          {employees.map((employee) => (
            <div key={employee.id} className="employee-row">
              <div>
                <strong>{employee.nama}</strong>
                <small>{employee.email}</small>
              </div>
              <div className="employee-actions">
                <span className="badge">{employee.status}</span>
                <select
                  aria-label={`Role ${employee.nama}`}
                  value={employee.role}
                  onChange={(event) => updateRole(employee.id, event.target.value)}
                >
                  {!allowedRoles.includes(employee.role) && (
                    <option value={employee.role}>{employee.role} (role lama)</option>
                  )}
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="kasir">Kasir</option>
                </select>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => removeEmployee(employee)}
                  disabled={employee.id === user.id}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
        <p className="employee-storage-note">
          Akun dibuat di Firebase Authentication dan profil role tersimpan di Cloud Firestore.
        </p>
      </section>
    </div>
  );
}
