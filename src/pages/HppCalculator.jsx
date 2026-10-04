import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteHppCalculation, saveHppCalculation, useHppCalculations } from '../hooks/useFirestore';
import { calculateProductionHpp } from '../utils/hppCalculator';
import { formatCurrency } from '../utils/formatCurrency';

const createMaterial = (name = '', quantity = '', unitCost = '') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name,
  quantity,
  unitCost
});

const initialForm = {
  productName: 'Bushing Arm Bemo',
  materials: [
    createMaterial('Karet mentah', '10', '1000'),
    createMaterial('Pipa besi', '20', '1500'),
    createMaterial('Bahan kimia perekat', '10', '1000')
  ],
  laborCost: '20000',
  overheadCost: '0',
  outputQuantity: '15'
};

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function HppCalculator() {
  const { user } = useAuth();
  const [calculations, { loading: calculationsLoading, error: calculationsError }] = useHppCalculations();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const totals = useMemo(
    () => calculateProductionHpp(form.materials, form.laborCost, form.overheadCost, form.outputQuantity),
    [form]
  );

  const updateMaterial = (id, field, value) => {
    setForm((current) => ({
      ...current,
      materials: current.materials.map((material) =>
        material.id === id ? { ...material, [field]: value } : material
      )
    }));
    setMessage('');
    setError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const hasInvalidMaterial = form.materials.some((material) => (
      !material.name.trim()
      || Number(material.quantity) <= 0
      || Number(material.unitCost) < 0
      || material.unitCost === ''
    ));

    if (!form.productName.trim()) {
      setError('Nama produk hasil produksi wajib diisi.');
      return;
    }
    if (form.materials.length === 0 || hasInvalidMaterial) {
      setError('Isi nama, jumlah, dan biaya per satuan untuk setiap bahan baku.');
      return;
    }
    if (Number(form.laborCost) < 0 || Number(form.overheadCost) < 0 || totals.outputQuantity <= 0) {
      setError('Biaya tidak boleh negatif dan jumlah produk yang dihasilkan harus lebih dari nol.');
      return;
    }

    setSaving(true);
    const record = {
      productName: form.productName.trim(),
      materials: form.materials.map((material) => ({
        name: material.name.trim(),
        quantity: Number(material.quantity),
        unitCost: Number(material.unitCost),
        subtotal: Number(material.quantity) * Number(material.unitCost)
      })),
      laborCost: totals.laborCost,
      overheadCost: totals.overheadCost,
      outputQuantity: totals.outputQuantity,
      materialCost: totals.materialCost,
      totalCost: totals.totalCost,
      hppPerUnit: totals.hppPerUnit,
      createdAt: editingId
        ? calculations.find((item) => item.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      createdBy: user.nama
    };

    try {
      await saveHppCalculation(record, editingId || '');
      setMessage(editingId ? 'Perhitungan HPP berhasil diperbarui di database.' : 'Perhitungan HPP berhasil disimpan ke database.');
      setEditingId(null);
    } catch (saveError) {
      setError(`Gagal menyimpan perhitungan HPP: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const editCalculation = (record) => {
    setForm({
      productName: record.productName,
      materials: record.materials.map((material) => createMaterial(
        material.name,
        String(material.quantity),
        String(material.unitCost)
      )),
      laborCost: String(record.laborCost),
      overheadCost: String(record.overheadCost),
      outputQuantity: String(record.outputQuantity)
    });
    setEditingId(record.id);
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteCalculation = async (record) => {
    if (!window.confirm(`Hapus perhitungan HPP ${record.productName}?`)) return;
    try {
      setError('');
      await deleteHppCalculation(record.id);
      setMessage('Perhitungan HPP berhasil dihapus dari arsip.');
      if (editingId === record.id) {
        setEditingId(null);
        setForm(initialForm);
      }
    } catch (deleteError) {
      setError(`Gagal menghapus perhitungan HPP: ${deleteError.message}`);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setError('');
    setMessage('');
  };

  return (
    <div className="page-wrap hpp-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Biaya Produksi</p>
          <h2>Perhitungan HPP</h2>
        </div>
        <button type="button" className="secondary-light-btn print-button" onClick={() => window.print()}>
          Cetak / Export PDF
        </button>
      </div>

      <div className="hpp-layout">
        <form className="panel form-panel hpp-form" onSubmit={handleSave}>
          <div className="hpp-section-heading">
            <div>
              <h3>{editingId ? 'Ubah perhitungan produksi' : 'Input biaya produksi'}</h3>
              <p>Masukkan komponen biaya untuk menghitung HPP setiap unit hasil produksi.</p>
            </div>
          </div>

          <label>
            Nama produk hasil produksi
            <input
              value={form.productName}
              onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))}
              placeholder="Contoh: Bushing Arm Bemo"
              required
            />
          </label>

          <div className="hpp-section-heading">
            <div>
              <h4>Bahan baku</h4>
              <p>Isi jumlah bahan dan biaya per satuan.</p>
            </div>
            <button
              type="button"
              className="secondary-light-btn"
              onClick={() => setForm((current) => ({
                ...current,
                materials: [...current.materials, createMaterial()]
              }))}
            >
              + Tambah bahan
            </button>
          </div>

          <div className="hpp-material-list">
            {form.materials.map((material) => (
              <div className="hpp-material-row" key={material.id}>
                <label>
                  Nama bahan
                  <input
                    value={material.name}
                    onChange={(event) => updateMaterial(material.id, 'name', event.target.value)}
                    placeholder="Nama bahan baku"
                    required
                  />
                </label>
                <label>
                  Jumlah bahan
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={material.quantity}
                    onChange={(event) => updateMaterial(material.id, 'quantity', event.target.value)}
                    placeholder="0"
                    required
                  />
                </label>
                <label>
                  Biaya per satuan (Rp)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={material.unitCost}
                    onChange={(event) => updateMaterial(material.id, 'unitCost', event.target.value)}
                    placeholder="0"
                    required
                  />
                </label>
                <div className="hpp-subtotal">
                  <span>Subtotal bahan</span>
                  <strong>{formatCurrency((Number(material.quantity) || 0) * (Number(material.unitCost) || 0))}</strong>
                </div>
                <button
                  type="button"
                  className="icon-danger-btn"
                  aria-label={`Hapus bahan ${material.name || 'baru'}`}
                  disabled={form.materials.length === 1}
                  onClick={() => setForm((current) => ({
                    ...current,
                    materials: current.materials.filter((item) => item.id !== material.id)
                  }))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="field-grid hpp-other-costs">
            <label>
              Total tenaga kerja langsung (Rp)
              <input
                type="number"
                min="0"
                step="1"
                value={form.laborCost}
                onChange={(event) => setForm((current) => ({ ...current, laborCost: event.target.value }))}
                required
              />
            </label>
            <label>
              Total biaya overhead produksi (Rp)
              <input
                type="number"
                min="0"
                step="1"
                value={form.overheadCost}
                onChange={(event) => setForm((current) => ({ ...current, overheadCost: event.target.value }))}
                required
              />
            </label>
            <label className="output-quantity-field">
              Jumlah produk yang dihasilkan (unit)
              <input
                type="number"
                min="1"
                step="1"
                value={form.outputQuantity}
                onChange={(event) => setForm((current) => ({ ...current, outputQuantity: event.target.value }))}
                required
              />
            </label>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}
          {calculationsError && <p className="login-error" role="alert">{calculationsError}</p>}
          {message && <p className="hpp-success" role="status">{message}</p>}

          <div className="hpp-form-actions">
            {editingId && (
              <button type="button" className="secondary-light-btn" onClick={cancelEdit}>
                Batal ubah
              </button>
            )}
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Simpan perhitungan'}
            </button>
          </div>
        </form>

        <section className="panel hpp-result">
          <div className="hpp-result-title">
            <p className="eyebrow">Hasil Perhitungan</p>
            <h3>Ringkasan HPP</h3>
          </div>

          <div className="hpp-product-summary">
            <span className="hpp-sigma" aria-hidden="true">Σ</span>
            <div>
              <strong>{form.productName || 'Nama produk'}</strong>
              <small>{totals.outputQuantity || 0} unit hasil produksi</small>
            </div>
          </div>

          <div className="hpp-cost-breakdown">
            <div><span>Total biaya bahan baku</span><strong>{formatCurrency(totals.materialCost)}</strong></div>
            <div><span>Tenaga kerja langsung</span><strong>{formatCurrency(totals.laborCost)}</strong></div>
            <div><span>Overhead produksi</span><strong>{formatCurrency(totals.overheadCost)}</strong></div>
          </div>

          <div className="hpp-result-row hpp-total-cost">
            <strong>Total biaya produksi</strong>
            <strong>{formatCurrency(totals.totalCost)}</strong>
          </div>

          <div className="hpp-average">
            <span>HPP per unit</span>
            <strong>{totals.outputQuantity > 0 ? formatCurrency(totals.hppPerUnit) : formatCurrency(0)}</strong>
          </div>

          <p className="hpp-formula">
            Rumus: (bahan baku + tenaga kerja langsung + overhead) ÷ jumlah produk yang dihasilkan.
          </p>
        </section>
      </div>

      <section className="panel hpp-archive">
        <div className="hpp-archive-heading">
          <div>
            <p className="eyebrow">Arsip HPP</p>
            <h3>Daftar perhitungan tersimpan</h3>
          </div>
          <span className="hpp-count">{calculations.length} perhitungan · Firestore</span>
        </div>

        {calculationsLoading ? (
          <p className="empty-state">Memuat arsip HPP dari database…</p>
        ) : calculations.length === 0 ? (
          <p className="empty-state">Belum ada arsip perhitungan di database.</p>
        ) : (
          <div className="hpp-table-wrap">
            <table className="hpp-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama produk</th>
                  <th>Bahan baku</th>
                  <th>Tenaga kerja</th>
                  <th>Overhead</th>
                  <th>Jumlah hasil</th>
                  <th>Total biaya produksi</th>
                  <th>HPP per unit</th>
                  <th>Disimpan oleh</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.createdAt)}</td>
                    <td><strong>{record.productName}</strong></td>
                    <td>
                      <div className="hpp-archive-materials">
                        {record.materials.map((material, index) => (
                          <div key={`${record.id}-${index}`}>
                            <strong>{material.name}</strong>
                            <small>{material.quantity} × {formatCurrency(material.unitCost)} = {formatCurrency(material.subtotal)}</small>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>{formatCurrency(record.laborCost)}</td>
                    <td>{formatCurrency(record.overheadCost)}</td>
                    <td>{record.outputQuantity} unit</td>
                    <td>{formatCurrency(record.totalCost)}</td>
                    <td><strong>{formatCurrency(record.hppPerUnit)}</strong></td>
                    <td>{record.createdBy}</td>
                    <td>
                      <div className="hpp-row-actions">
                        <button type="button" className="icon-edit-btn" onClick={() => editCalculation(record)} aria-label={`Ubah ${record.productName}`}>
                          ✎
                        </button>
                        <button type="button" className="icon-danger-btn" onClick={() => deleteCalculation(record)} aria-label={`Hapus ${record.productName}`}>
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
