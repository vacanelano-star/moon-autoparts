import { useMemo } from 'react';
import { useProducts } from '../hooks/useFirestore';
import { formatCurrency } from '../utils/formatCurrency';

export default function Dashboard() {
  const [products, { loading, error }] = useProducts();

  const summary = useMemo(() => {
    const totalInventory = products.reduce((sum, item) => sum + item.stok_sekarang, 0);
    const lowStock = products.filter((item) => item.stok_sekarang <= item.stok_minimum).length;
    const inventoryValue = products.reduce((sum, item) => sum + item.stok_sekarang * item.hpp_rata_rata, 0);

    return {
      totalInventory,
      lowStock,
      inventoryValue
    };
  }, [products]);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Dashboard Pabrik Sparepart</h2>
        </div>
      </div>

      {error && <p className="login-error" role="alert">{error}</p>}
      {loading && <p className="empty-state">Memuat data dashboard dari database…</p>}

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Stok Sparepart</span>
          <strong>{summary.totalInventory}</strong>
          <small>Unit di seluruh gudang</small>
        </div>
        <div className="stat-card">
          <span>Sparepart Stok Minimum</span>
          <strong>{summary.lowStock}</strong>
          <small>Barang perlu perhatian</small>
        </div>
        <div className="stat-card">
          <span>Nilai Persediaan</span>
          <strong>{formatCurrency(summary.inventoryValue)}</strong>
          <small>Est. harga pokok</small>
        </div>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h3>Sparepart dengan stok rendah</h3>
          <div className="list-stack">
            {products.filter((item) => item.stok_sekarang <= item.stok_minimum).map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{item.nama_barang}</strong>
                  <small>{item.id}</small>
                </div>
                <span className="warning-text">{item.stok_sekarang} unit</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Daftar sparepart</h3>
          <div className="list-stack">
            {products.slice(0, 4).map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{item.nama_barang}</strong>
                  <small>{item.kategori}</small>
                </div>
                <span>{formatCurrency(item.harga_jual)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
