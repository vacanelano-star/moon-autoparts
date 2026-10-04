import { formatCurrency } from '../utils/formatCurrency';

export default function ProductCard({ product, onAddToCart, showCost = true }) {
  return (
    <div className="product-card">
      <div className="product-header">
        <span className="badge">{product.kategori}</span>
        <span className={`stock-status ${product.stok_sekarang <= product.stok_minimum ? 'low' : 'ok'}`}>
          {product.stok_sekarang <= product.stok_minimum ? 'Stok Rendah' : 'Tersedia'}
        </span>
      </div>
      <h3>{product.nama_barang}</h3>
      <p>{product.barcode}</p>
      <div className="product-meta">
        <span>Stok: {product.stok_sekarang}</span>
        {showCost && <span>HPP: {formatCurrency(product.hpp_rata_rata)}</span>}
      </div>
      <div className="product-price-row">
        <strong>{formatCurrency(product.harga_jual)}</strong>
        <button type="button" onClick={() => onAddToCart(product)}>
          + Tambah
        </button>
      </div>
    </div>
  );
}
