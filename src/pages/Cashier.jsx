import { useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { completeSale, useProducts } from '../hooks/useFirestore';
import { formatCurrency } from '../utils/formatCurrency';

export default function Cashier() {
  const { user } = useAuth();
  const [products, { loading, error: productsError }] = useProducts();
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const addToCart = (product) => {
    const quantityInCart = cart.find((item) => item.id === product.id)?.qty || 0;
    if (quantityInCart >= product.stok_sekarang) {
      setError(`Stok ${product.nama_barang} tidak mencukupi.`);
      return;
    }
    setError('');
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      setCart((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
      return;
    }

    setCart((current) => [...current, { ...product, qty: 1 }]);
  };

  const updateQty = (productId, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const totals = useMemo(() => {
    const totalBelanja = cart.reduce((sum, item) => sum + item.harga_jual * item.qty, 0);
    const totalHpp = cart.reduce((sum, item) => sum + item.hpp_rata_rata * item.qty, 0);
    return { totalBelanja, totalHpp, labaKotor: totalBelanja - totalHpp };
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0 || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await completeSale(cart, paymentMethod, user);
      setCart([]);
      setMessage(`Transaksi ${result.id_transaksi} berhasil disimpan.`);
    } catch (checkoutError) {
      setError(`Checkout gagal: ${checkoutError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="eyebrow">Kasir</p>
          <h2>Point of Sale</h2>
        </div>
      </div>

      <div className="cashier-layout">
        <div className="product-grid">
          {productsError && <p className="login-error" role="alert">{productsError}</p>}
          {loading ? <p className="empty-state">Memuat barang dari database…</p> : products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
              showCost={user.role !== 'kasir'}
            />
          ))}
        </div>

        <aside className="cart-panel">
          <h3>Keranjang</h3>
          {error && <p className="login-error" role="alert">{error}</p>}
          {message && <p className="hpp-success" role="status">{message}</p>}
          {cart.length === 0 ? (
            <p className="empty-state">Belum ada produk dipilih.</p>
          ) : (
            <div className="cart-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div>
                    <strong>{item.nama_barang}</strong>
                    <small>{formatCurrency(item.harga_jual)} / item</small>
                  </div>
                  <div className="cart-qty">
                    <button type="button" onClick={() => updateQty(item.id, -1)}>-</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="totals">
            <div>
              <span>Total Belanja</span>
              <strong>{formatCurrency(totals.totalBelanja)}</strong>
            </div>
            {user.role !== 'kasir' && (
              <>
                <div>
                  <span>Total HPP</span>
                  <strong>{formatCurrency(totals.totalHpp)}</strong>
                </div>
                <div>
                  <span>Laba Kotor</span>
                  <strong>{formatCurrency(totals.labaKotor)}</strong>
                </div>
              </>
            )}
          </div>

          <label>
            Metode pembayaran
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="Tunai">Tunai</option>
              <option value="Transfer">Transfer</option>
              <option value="QRIS">QRIS</option>
            </select>
          </label>

          <button type="button" className="primary-btn full-width" onClick={handleCheckout} disabled={!cart.length || saving}>
            {saving ? 'Menyimpan transaksi…' : 'Proses Checkout'}
          </button>
        </aside>
      </div>
    </div>
  );
}
