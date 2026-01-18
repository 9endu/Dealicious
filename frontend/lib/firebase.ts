import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCCAWHphaHL3p4_T92Un2yDAaOaWcWaa7k",
    authDomain: "dealicious-5b8a1.firebaseapp.com",
    projectId: "dealicious-5b8a1",
    storageBucket: "dealicious-5b8a1.firebasestorage.app",
    messagingSenderId: "255158946155",
    appId: "1:255158946155:web:8b6e6881a186398902a42e",
    measurementId: "G-8W25KWZZGM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
