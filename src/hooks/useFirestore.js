import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';

export function useFirestoreCollection(collectionName, sortField = '') {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    return onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const nextDocuments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
        if (sortField) {
          nextDocuments.sort((left, right) => String(right[sortField] || '').localeCompare(String(left[sortField] || '')));
        }
        setDocuments(nextDocuments);
        setLoading(false);
      },
      (snapshotError) => {
        setError(`Gagal memuat ${collectionName}: ${snapshotError.message}`);
        setLoading(false);
      }
    );
  }, [collectionName, sortField]);

  return { documents, loading, error };
}

export function useProducts() {
  const { documents, loading, error } = useFirestoreCollection('products');
  return [documents, { loading, error }];
}

export function useEmployees() {
  const { documents, loading, error } = useFirestoreCollection('employees');
  return [documents, { loading, error }];
}

export function useHppCalculations() {
  const { documents, loading, error } = useFirestoreCollection('hpp_calculations', 'createdAt');
  return [documents, { loading, error }];
}

export function useTransactions() {
  const { documents, loading, error } = useFirestoreCollection('transactions', 'waktu');
  return { transactions: documents, loading, error };
}

export function useStockOpnameRecords() {
  const { documents, loading, error } = useFirestoreCollection('stock_opname', 'createdAt');
  return { records: documents, loading, error };
}

export async function createProduct(product) {
  const id = product.id.trim();
  const productRef = doc(db, 'products', id);

  await runTransaction(db, async (transaction) => {
    const existingProduct = await transaction.get(productRef);
    if (existingProduct.exists()) {
      throw new Error(`SKU ${id} sudah terdaftar.`);
    }
    transaction.set(productRef, {
      ...product,
      id,
      dibuat_pada: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
  });
}

export async function saveHppCalculation(record, id = '') {
  const calculationRef = id
    ? doc(db, 'hpp_calculations', id)
    : doc(collection(db, 'hpp_calculations'));
  const data = {
    ...record,
    createdAt: id ? record.createdAt : new Date().toISOString(),
    updatedAt: serverTimestamp()
  };

  if (id) {
    await updateDoc(calculationRef, data);
  } else {
    await setDoc(calculationRef, data);
  }
  return calculationRef.id;
}

export async function deleteHppCalculation(id) {
  await deleteDoc(doc(db, 'hpp_calculations', id));
}

export async function saveStockOpname(details, user) {
  const recordRef = doc(collection(db, 'stock_opname'));

  await runTransaction(db, async (transaction) => {
    const productRefs = details.map((detail) => doc(db, 'products', detail.id_barang));
    const productSnapshots = await Promise.all(productRefs.map((productRef) => transaction.get(productRef)));
    const opnameDetails = productSnapshots.map((snapshot, index) => {
      if (!snapshot.exists()) {
        throw new Error(`Sparepart ${details[index].id_barang} tidak ditemukan.`);
      }

      const product = snapshot.data();
      const physicalStock = Number(details[index].stok_fisik);
      if (!Number.isFinite(physicalStock) || physicalStock < 0) {
        throw new Error(`Stok fisik untuk ${product.nama_barang} tidak valid.`);
      }

      const systemStock = Number(product.stok_sekarang) || 0;
      return {
        id_barang: snapshot.id,
        nama_barang: product.nama_barang,
        stok_sistem: systemStock,
        stok_fisik: physicalStock,
        selisih: physicalStock - systemStock,
        keterangan: details[index].keterangan.trim()
      };
    });

    productSnapshots.forEach((snapshot, index) => {
      transaction.update(productRefs[index], {
        stok_sekarang: opnameDetails[index].stok_fisik,
        updatedAt: serverTimestamp()
      });
    });

    transaction.set(recordRef, {
      id_opname: `OPN-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12)}`,
      tanggal: new Date().toISOString(),
      id_petugas: user.id,
      nama_petugas: user.nama,
      detail_barang: opnameDetails,
      status: 'selesai',
      createdAt: new Date().toISOString()
    });
  });

  return recordRef.id;
}

export async function completeSale(cart, paymentMethod, user) {
  const callable = httpsCallable(functions, 'completeSale');
  const result = await callable({
    items: cart.map((item) => ({ id_barang: item.id, jumlah: item.qty })),
    metode_pembayaran: paymentMethod,
    id_kasir: user.id,
    nama_kasir: user.nama
  });
  return result.data;
}

export async function createEmployeeAccount(employee) {
  const callable = httpsCallable(functions, 'createEmployee');
  const result = await callable(employee);
  return result.data;
}

export async function changeEmployeeRole(employeeId, role) {
  const callable = httpsCallable(functions, 'changeEmployeeRole');
  const result = await callable({ employeeId, role });
  return result.data;
}

export async function removeEmployeeAccount(employeeId) {
  const callable = httpsCallable(functions, 'removeEmployee');
  const result = await callable({ employeeId });
  return result.data;
}

export function getProductById(id, list = []) {
  return list.find((item) => item.id === id) || null;
}
