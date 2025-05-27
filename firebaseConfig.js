// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB2-Ghe1alJWMw6E_ksLZZmwfS9JJdQ4Tk",
  authDomain: "gg-gring-gym.firebaseapp.com",
  projectId: "gg-gring-gym",
  storageBucket: "gg-gring-gym.firebasestorage.app",
  messagingSenderId: "262767321182",
  appId: "1:262767321182:web:80340e09f844388aa914cf",
  measurementId: "G-PQGR9JYZJY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth: Auth = getAuth(app)
// const analytics = getAnalytics(app);

export { db, auth };