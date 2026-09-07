import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDKWIddN1EPCW9PyJd9HMKGCcd-Pu2A7tg",
  authDomain: "apporganizacion-e932f.firebaseapp.com",
  projectId: "apporganizacion-e932f",
  storageBucket: "apporganizacion-e932f.firebasestorage.app",
  messagingSenderId: "239808559682",
  appId: "1:239808559682:web:cbb65591774c1994ae8a7b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
