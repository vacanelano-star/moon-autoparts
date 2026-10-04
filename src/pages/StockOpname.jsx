import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveStockOpname, useProducts, useStockOpnameRecords } from '../hooks/useFirestore';

export default function StockOpname() {
  const { user } = useAuth();
  const [products, { loading: productsLoading, error: productsError }] = useProducts();
  const { records, loading: recordsLoading, error: recordsError } = useStockOpnameRecords();
  const [counts, setCounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const opnameItems = useMemo(() => products.map((product) => ({
    ...product,
    stok_fisik: counts[product.id]?.stok_fisik ?? String(product.stok_sekarang),
    keterangan: counts[product.id]?.keterangan ?? ''
  })), [products, counts]);

  const updateCount = (productId, field, value) => {
    setCounts((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const id = await saveStockOpname(
        opnameItems.map((item) => ({
          id_barang: item.id,
          stok_fisik: Number(item.stok_fisik),
          keterangan: item.keterangan
        })),
        user
      );
      setCounts({});
      setMessage(`Stock opname ${id} tersimpan. Stok sparepart sudah disesuaikan.`);
    } catch (saveError) {
      setError(`Gagal menyimpan stock opname: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="eyebrow">Audit</p>
          <h2>Stock Opname</h2>
        </div>
      </div>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <h3>Cocokkan stok fisik gudang</h3>
        {productsError && <p className="login-error" role="alert">{productsError}</p>}
        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="hpp-success" role="status">{message}</p>}

        {productsLoading ? (
          <p className="empty-state">Memuat sparepart dari database…</p>
        ) : products.length === 0 ? (
          <p className="empty-state">Tambahkan sparepart terlebih dahulu sebelum melakukan stock opname.</p>
        ) : (
          <>
            <div className="stock-count-list">
              {opnameItems.map((product) => (
                <div className="stock-count-row" key={product.id}>
                  <div>
                    <strong>{product.nama_barang}</strong>
                    <small>{product.id} · Stok sistem {product.stok_sekarang}</small>
                  </div>
                  <label>
                    Stok fisik
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={product.stok_fisik}
                      onChange={(event) => updateCount(product.id, 'stok_fisik', event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Keterangan selisih
                    <input
                      value={product.keterangan}
                      onChange={(event) => updateCount(product.id, 'keterangan', event.target.value)}
                      placeholder="Opsional"
                    />
                  </label>
                </div>
              ))}
            </div>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Menyimpan opname…' : 'Simpan & Sesuaikan Stok'}
            </button>
          </>
        )}
      </form>

      <section className="panel">
        <h3>Arsip stock opname</h3>
        {recordsError && <p className="login-error" role="alert">{recordsError}</p>}
        {recordsLoading ? (
          <p className="empty-state">Memuat arsip dari database…</p>
        ) : records.length === 0 ? (
          <p className="empty-state">Belum ada stock opname tersimpan.</p>
        ) : records.map((opname) => (
          <div key={opname.id} className="opname-box">
            <div className="opname-head">
              <div>
                <strong>{opname.id_opname}</strong>
                <small>{opname.nama_petugas} · {new Date(opname.tanggal).toLocaleString('id-ID')}</small>
              </div>
              <span className="badge success">{opname.status}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Sparepart</th>
                  <th>Stok Sistem</th>
                  <th>Stok Fisik</th>
                  <th>Selisih</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {opname.detail_barang.map((item) => (
                  <tr key={item.id_barang}>
                    <td>{item.id_barang}</td>
                    <td>{item.nama_barang}</td>
                    <td>{item.stok_sistem}</td>
                    <td>{item.stok_fisik}</td>
                    <td className={item.selisih < 0 ? 'negative' : 'positive'}>{item.selisih}</td>
                    <td>{item.keterangan || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </div>
  );
}
