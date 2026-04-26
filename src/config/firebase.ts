import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCa52v2_CJBFOt-a3ikNKlSUFTdb-5lWgo",
  authDomain: "cleanwave-app.firebaseapp.com",
  projectId: "cleanwave-app",
  storageBucket: "cleanwave-app.firebasestorage.app",
  messagingSenderId: "914210876715",
  appId: "1:914210876715:web:80703d5eeb841b7499696e",
  measurementId: "G-TDGQ9X618G"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;