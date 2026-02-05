import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC4IeM4fq3BcX_LwOg1mEpYMPV9p8nRVA4",
  authDomain: "sentieri-cortina-web-app.firebaseapp.com",
  projectId: "sentieri-cortina-web-app",
  storageBucket: "sentieri-cortina-web-app.firebasestorage.app",
  messagingSenderId: "191250415086",
  appId: "1:191250415086:web:7554dc94148f690538a2ff"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };

