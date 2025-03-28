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

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Sanitize input to prevent injection
function sanitizeInput(input) {
    // Enhanced sanitization
    const sanitized = input
        .replace(/[<>"'&]/g, '')  // Prevent XSS
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
    return sanitized.substring(0, 100);  // Add length limit
}

export function login(email, password) {
    if (!email || !password) {
        throw new Error("Email and password are required");
    }
    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);
    console.log("Attempting login with email:", sanitizedEmail);
    return signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword)
        .then((userCredential) => {
            console.log("Login successful:", userCredential.user.email);
            return userCredential.user;
        })
        .catch((error) => {
            // Only log errors other than invalid-login-credentials
            if (error.code !== "auth/invalid-login-credentials") {
                console.error("Login failed:", error.code, error.message);
            }
            throw error;
        });
}

export function register(email, password) {
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);
    console.log("Attempting registration with email:", sanitizedEmail);
    return createUserWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword)
        .then((userCredential) => {
            console.log("Registration successful:", userCredential.user.email);
            return userCredential.user;
        })
        .catch((error) => {
            console.error("Registration failed:", error.code, error.message);
            throw error;
        });
}

export function logout() {
    return signOut(auth)
        .then(() => {
            console.log("Logout successful");
        })
        .catch((error) => {
            console.error("Logout failed:", error.code, error.message);
            throw error;
        });
}

export function onAuthChange(callback) {
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed:", user ? user.email : "No user");
        callback(user);
    });
}

export function getCurrentUser() {
    return auth.currentUser;
}