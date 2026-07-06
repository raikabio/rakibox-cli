import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-bIHIzJ22ZEVFDQ6uaOpvwtny_nHKtmw",
  authDomain: "rakibox-72201.firebaseapp.com",
  projectId: "rakibox-72201",
  storageBucket: "rakibox-72201.firebasestorage.app",
  messagingSenderId: "139647750665",
  appId: "1:139647750665:web:981bc7fb927792584f9ed8",
  measurementId: "G-XD2F2K903J"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);