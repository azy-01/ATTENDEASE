import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA6uFehTqd_V67ak7pZBwwETv6qVe7Zd_4',
  authDomain: 'attendease-e7462.firebaseapp.com',
  projectId: 'attendease-e7462',
  storageBucket: 'attendease-e7462.firebasestorage.app',
  messagingSenderId: '618375349761',
  appId: '1:618375349761:web:700476fb30d941c113a200',
  measurementId: 'G-ECRVHQLBCH'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runMigration() {
  const dbJsonPath = resolve(process.cwd(), 'db.json');
  const raw = await readFile(dbJsonPath, 'utf8');
  const source = JSON.parse(raw);

  const entries = Object.entries(source).filter(([, value]) => Array.isArray(value));

  let totalCollections = 0;
  let totalDocs = 0;

  for (const [collectionName, documents] of entries) {
    totalCollections += 1;
    console.log(`Migrating ${collectionName} (${documents.length} docs)...`);

    for (let index = 0; index < documents.length; index += 1) {
      const original = documents[index] ?? {};
      const mapped = typeof original === 'object' && original !== null ? original : {};
      const idValue = mapped.id ?? `${collectionName}-${index + 1}`;
      const docId = String(idValue);
      const payload = { ...mapped, id: docId };

      await setDoc(doc(db, collectionName, docId), payload, { merge: true });
      totalDocs += 1;
    }
  }

  console.log(`Done. Migrated ${totalDocs} documents across ${totalCollections} collections.`);
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
