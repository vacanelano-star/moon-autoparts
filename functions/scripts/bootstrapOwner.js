import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const [uid, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim();
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

if (!uid || !name || !projectId) {
  console.error('Usage: npm run bootstrap:owner -- <AUTH_UID> "<Owner name>"');
  console.error('Set GCLOUD_PROJECT and authenticate Firebase Admin using Application Default Credentials.');
  process.exit(1);
}

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();
const user = await auth.getUser(uid);
if (!user.email) {
  throw new Error('Firebase Auth user must have an email before owner setup.');
}

const setupRef = db.collection('system').doc('initialOwnerSetup');
const employeeRef = db.collection('employees').doc(uid);
await db.runTransaction(async (transaction) => {
  const setupSnapshot = await transaction.get(setupRef);
  const owners = await transaction.get(db.collection('employees').where('role', '==', 'owner'));
  if (setupSnapshot.exists || !owners.empty) {
    throw new Error('Initial owner was already configured; bootstrap is allowed only once.');
  }

  transaction.create(setupRef, {
    ownerUid: uid,
    completedAt: FieldValue.serverTimestamp()
  });
  transaction.create(employeeRef, {
    nama: name,
    email: user.email,
    role: 'owner',
    status: 'aktif',
    dibuat_pada: new Date().toISOString(),
    dibuat_oleh: 'bootstrap'
  });
});

await auth.setCustomUserClaims(uid, { role: 'owner' });
console.log(`Owner ${user.email} initialized for project ${projectId}.`);
