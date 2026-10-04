import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const auth = getAuth();
const db = getFirestore();
const REGION = 'asia-southeast2';
const ROLES = new Set(['owner', 'admin', 'kasir']);

async function requireRole(request, allowedRoles) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Silakan login terlebih dahulu.');
  }

  const employeeSnapshot = await db.collection('employees').doc(request.auth.uid).get();
  const employee = employeeSnapshot.data();
  if (!employeeSnapshot.exists || employee?.status !== 'aktif') {
    throw new HttpsError('permission-denied', 'Akun karyawan tidak aktif.');
  }
  if (!allowedRoles.includes(employee.role)) {
    throw new HttpsError('permission-denied', 'Role akun tidak memiliki izin untuk tindakan ini.');
  }
  return employee;
}

function validateRole(role) {
  if (!ROLES.has(role)) {
    throw new HttpsError('invalid-argument', 'Role harus owner, admin, atau kasir.');
  }
}

export const createEmployee = onCall({ region: REGION }, async (request) => {
  await requireRole(request, ['owner']);
  const { nama, email, password, role } = request.data || {};
  validateRole(role);

  if (typeof nama !== 'string' || nama.trim().length < 2) {
    throw new HttpsError('invalid-argument', 'Nama karyawan minimal 2 karakter.');
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Alamat email tidak valid.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new HttpsError('invalid-argument', 'Kata sandi awal minimal 8 karakter.');
  }

  let createdUser;
  try {
    createdUser = await auth.createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: nama.trim(),
      disabled: false
    });
    await db.collection('employees').doc(createdUser.uid).create({
      nama: nama.trim(),
      email: createdUser.email,
      role,
      status: 'aktif',
      dibuat_pada: new Date().toISOString(),
      dibuat_oleh: request.auth.uid
    });
  } catch (error) {
    if (createdUser) {
      await auth.deleteUser(createdUser.uid);
    }
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Email sudah digunakan pada akun Firebase.');
    }
    throw new HttpsError('internal', `Gagal membuat akun karyawan: ${error.message}`);
  }

  return { uid: createdUser.uid };
});

export const changeEmployeeRole = onCall({ region: REGION }, async (request) => {
  await requireRole(request, ['owner']);
  const { employeeId, role } = request.data || {};
  validateRole(role);
  if (typeof employeeId !== 'string' || !employeeId) {
    throw new HttpsError('invalid-argument', 'ID karyawan tidak valid.');
  }

  const employeeRef = db.collection('employees').doc(employeeId);
  await db.runTransaction(async (transaction) => {
    const employeeSnapshot = await transaction.get(employeeRef);
    if (!employeeSnapshot.exists) {
      throw new HttpsError('not-found', 'Akun karyawan tidak ditemukan.');
    }

    if (employeeSnapshot.data().role === 'owner' && role !== 'owner') {
      const owners = await transaction.get(db.collection('employees').where('role', '==', 'owner'));
      if (owners.size <= 1) {
        throw new HttpsError('failed-precondition', 'Minimal harus ada satu akun Owner.');
      }
    }

    transaction.update(employeeRef, { role, updatedAt: FieldValue.serverTimestamp() });
  });
  return { uid: employeeId, role };
});

export const removeEmployee = onCall({ region: REGION }, async (request) => {
  await requireRole(request, ['owner']);
  const { employeeId } = request.data || {};
  if (typeof employeeId !== 'string' || !employeeId) {
    throw new HttpsError('invalid-argument', 'ID karyawan tidak valid.');
  }
  if (employeeId === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'Akun Owner yang sedang digunakan tidak dapat dihapus.');
  }

  const employeeRef = db.collection('employees').doc(employeeId);
  await db.runTransaction(async (transaction) => {
    const employeeSnapshot = await transaction.get(employeeRef);
    if (!employeeSnapshot.exists) {
      throw new HttpsError('not-found', 'Akun karyawan tidak ditemukan.');
    }
    if (employeeSnapshot.data().role === 'owner') {
      const owners = await transaction.get(db.collection('employees').where('role', '==', 'owner'));
      if (owners.size <= 1) {
        throw new HttpsError('failed-precondition', 'Minimal harus ada satu akun Owner.');
      }
    }

    transaction.delete(employeeRef);
  });
  try {
    await auth.deleteUser(employeeId);
  } catch (error) {
    throw new HttpsError('internal', `Profil sudah dinonaktifkan tetapi akun Authentication gagal dihapus: ${error.message}`);
  }
  return { uid: employeeId };
});

export const completeSale = onCall({ region: REGION }, async (request) => {
  const employee = await requireRole(request, ['owner', 'admin', 'kasir']);
  const { items, metode_pembayaran } = request.data || {};
  const paymentMethods = new Set(['Tunai', 'Transfer', 'QRIS']);

  if (!Array.isArray(items) || items.length === 0 || !paymentMethods.has(metode_pembayaran)) {
    throw new HttpsError('invalid-argument', 'Item transaksi atau metode pembayaran tidak valid.');
  }

  const quantities = new Map();
  for (const item of items) {
    if (typeof item.id_barang !== 'string' || !Number.isInteger(item.jumlah) || item.jumlah <= 0) {
      throw new HttpsError('invalid-argument', 'Rincian barang transaksi tidak valid.');
    }
    quantities.set(item.id_barang, (quantities.get(item.id_barang) || 0) + item.jumlah);
  }

  const saleRef = db.collection('transactions').doc();
  const productRefs = [...quantities.keys()].map((id) => db.collection('products').doc(id));
  let saleRecord;

  await db.runTransaction(async (transaction) => {
    const productSnapshots = [];
    for (const productRef of productRefs) {
      productSnapshots.push(await transaction.get(productRef));
    }

    const saleItems = productSnapshots.map((snapshot) => {
      if (!snapshot.exists) {
        throw new HttpsError('not-found', `Sparepart ${snapshot.id} tidak ditemukan.`);
      }
      const product = snapshot.data();
      const quantity = quantities.get(snapshot.id);
      if (Number(product.stok_sekarang) < quantity) {
        throw new HttpsError('failed-precondition', `Stok ${product.nama_barang} tidak mencukupi.`);
      }
      return {
        id_barang: snapshot.id,
        nama_barang: product.nama_barang,
        jumlah: quantity,
        harga_jual_satuan: Number(product.harga_jual),
        hpp_satuan: Number(product.hpp_rata_rata)
      };
    });

    const totalBelanja = saleItems.reduce((sum, item) => sum + item.harga_jual_satuan * item.jumlah, 0);
    const totalHpp = saleItems.reduce((sum, item) => sum + item.hpp_satuan * item.jumlah, 0);
    const waktu = new Date().toISOString();
    saleRecord = {
      id_transaksi: `TRX-${waktu.slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
      waktu,
      id_kasir: request.auth.uid,
      nama_kasir: employee.nama,
      item_belanja: saleItems,
      total_belanja: totalBelanja,
      total_hpp: totalHpp,
      laba_kotor: totalBelanja - totalHpp,
      metode_pembayaran,
      createdAt: FieldValue.serverTimestamp()
    };

    productSnapshots.forEach((snapshot, index) => {
      transaction.update(productRefs[index], {
        stok_sekarang: Number(snapshot.data().stok_sekarang) - saleItems[index].jumlah,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    transaction.create(saleRef, saleRecord);
  });

  return { id: saleRef.id, id_transaksi: saleRecord.id_transaksi };
});
