import { useState } from 'react';
import { createProduct, useProducts } from '../hooks/useFirestore';
import { formatCurrency } from '../utils/formatCurrency';

const initialForm = {
  id: '',
  barcode: '',
  nama_barang: '',
  kategori: 'Sistem Pengereman',
  harga_jual: 0,
  harga_beli_terakhir: 0,
  hpp_rata_rata: 0,
  stok_sekarang: 0,
  stok_minimum: 0
};

export default function Inventory() {
  const [products, { loading, error: productsError }] = useProducts();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'harga_jual' || name === 'harga_beli_terakhir' || name === 'hpp_rata_rata' || name === 'stok_sekarang' || name === 'stok_minimum'
        ? Number(value)
        : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    const nextProduct = {
      ...form,
      id: form.id.trim(),
      dibuat_pada: new Date().toISOString()
    };

    try {
      await createProduct(nextProduct);
      setForm(initialForm);
      setMessage('Sparepart berhasil disimpan ke database.');
    } catch (saveError) {
      setError(`Gagal menyimpan sparepart: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Input Barang dan Harga Barang</h2>
        </div>
      </div>

      <div className="inventory-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Input Barang Baru</h3>
          <div className="field-grid">
            <label>
              SKU Sparepart
              <input name="id" value={form.id} onChange={handleChange} placeholder="SP-004" required />
            </label>
            <label>
              Barcode
              <input name="barcode" value={form.barcode} onChange={handleChange} placeholder="899..." />
            </label>
            <label>
              Nama Sparepart
              <input name="nama_barang" value={form.nama_barang} onChange={handleChange} placeholder="Nama sparepart" />
            </label>
            <label>
              Kategori
              <input name="kategori" value={form.kategori} onChange={handleChange} />
            </label>
            <label>
              Harga Jual (Rp)
              <input type="number" name="harga_jual" value={form.harga_jual} onChange={handleChange} />
            </label>
            <label>
              Harga Beli Terakhir (Rp)
              <input type="number" name="harga_beli_terakhir" value={form.harga_beli_terakhir} onChange={handleChange} />
            </label>
            <label>
              HPP Rata-Rata (Rp)
              <input type="number" name="hpp_rata_rata" value={form.hpp_rata_rata} onChange={handleChange} />
            </label>
            <label>
              Stok Gudang
              <input type="number" name="stok_sekarang" value={form.stok_sekarang} onChange={handleChange} />
            </label>
            <label>
              Stok Minimum
              <input type="number" name="stok_minimum" value={form.stok_minimum} onChange={handleChange} />
            </label>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}
          {message && <p className="hpp-success" role="status">{message}</p>}
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan Barang'}
          </button>
        </form>

        <section className="panel list-panel">
          <h3>Daftar Barang dan Harga</h3>
          {productsError && <p className="login-error" role="alert">{productsError}</p>}
          {loading ? (
            <p className="empty-state">Memuat sparepart dari database…</p>
          ) : products.length === 0 ? (
            <p className="empty-state">Belum ada sparepart tersimpan di database.</p>
          ) : (
          <div className="list-stack compact">
            {products.map((product) => (
              <div key={product.id} className="list-row">
                <div>
                  <strong>{product.nama_barang}</strong>
                  <small>{product.id}</small>
                </div>
                <div className="align-right">
                  <span>{product.stok_sekarang} unit</span>
                  <small>{formatCurrency(product.harga_jual)}</small>
                </div>
              </div>
            ))}
          </div>
          )}
        </section>
      </div>
    </div>
  );
}
