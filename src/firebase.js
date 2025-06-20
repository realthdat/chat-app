// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCETEOPT70iDtythhIPDHXA3CbbzRvFSiM",
  authDomain: "chat-app-66ba8.firebaseapp.com",
  databaseURL: "https://chat-app-66ba8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-app-66ba8",
  storageBucket: "chat-app-66ba8.firebasestorage.app",
  messagingSenderId: "920513867272",
  appId: "1:920513867272:web:936811fce8400d98a5abbd",
  measurementId: "G-ZJX7LRXGKE"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
