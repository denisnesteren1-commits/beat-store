import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD6XPVDs7G6PV2_7Qgo2P0YL3lXuSPAFIE",
  authDomain: "fressobeats.firebaseapp.com",
  projectId: "fressobeats",
  storageBucket: "fressobeats.firebasestorage.app",
  messagingSenderId: "443209798402",
  appId: "1:443209798402:web:237a75e163b7fe71cbe81b",
  measurementId: "G-VYW1GZFCKB"
};

// Инициализируем Firebase
const app = initializeApp(firebaseConfig);

// Экспортируем базу данных (db) и хранилище файлов (storage)
export const db = getFirestore(app);
export const storage = getStorage(app);