/* ============================================================
   firebase.js — Konfigurasi Firebase (Firestore + Auth)
   ⚠️  GANTI nilai di bawah dengan config project Firebase kamu!
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, updateDoc, query, orderBy,
  setDoc, getDoc, onSnapshot, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =============================================
// ⚠️  GANTI DENGAN KONFIGURASI FIREBASE ANDA  ⚠️
// =============================================
const firebaseConfig = {
    apiKey: "AIzaSyBtjH0SzFAsvC7am6rVCBjfV2haxou3rf4",
    authDomain: "web-app-daily-tracker.firebaseapp.com",
    projectId: "web-app-daily-tracker",
    storageBucket: "web-app-daily-tracker.firebasestorage.app",
    messagingSenderId: "831073695929",
    appId: "1:831073695929:web:2fe5e9e45f552431a40368"
  };
// =============================================

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ---- Pantau status login ----
// Jika tidak login → redirect ke login.html
// Jika sudah login → expose ke global dan lanjutkan app
onAuthStateChanged(auth, user => {
  if (!user) {
    // Belum login — redirect ke halaman login
    window.location.replace('login.html');
    return;
  }

  // Simpan info user ke global
  window.currentUser = user;
  window.db          = db;
  window.auth        = auth;
  window.authSignOut = signOut;
  window.firestore   = {
    collection, addDoc, getDocs, deleteDoc,
    doc, updateDoc, query, orderBy,
    setDoc, getDoc, onSnapshot, where
  };

  window.firebaseReady = true;
  document.dispatchEvent(new Event('firebaseReady'));
});
