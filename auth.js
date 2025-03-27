// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQA5n-enZk4J5y8LLjlkht8C8j2nDJtAc",
    authDomain: "tmc-project-6214b.firebaseapp.com",
    projectId: "tmc-project-6214b",
    storageBucket: "tmc-project-6214b.firebasestorage.app",
    messagingSenderId: "295976398450",
    appId: "1:295976398450:web:f0f4294e3e47641b7e5ceb",
    measurementId: "G-F8VMW6GR3D",
    databaseURL: "https://tmc-project-6214b-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Login function
export function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Login successful:", userCredential.user.email);
            return userCredential.user;
        })
        .catch((error) => {
            console.error("Login failed:", error.code, error.message);
            throw error;
        });
}

// Register function
export function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Registration successful:", userCredential.user.email);
            return userCredential.user;
        })
        .catch((error) => {
            console.error("Registration failed:", error.code, error.message);
            throw error;
        });
}

// Logout function
export function logout() {
    return signOut(auth);
}

// Auth state listener
export function onAuthChange(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

// Get current user
export function getCurrentUser() {
    return auth.currentUser;
}