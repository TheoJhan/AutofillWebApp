// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    getDoc,
    collection, 
    addDoc, 
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBZwNTgvurQB2XZTdG0hXEhH9nhHEsSyiY",
    authDomain: "cb-phaa.firebaseapp.com",
    projectId: "cb-phaa",
    storageBucket: "cb-phaa.firebasestorage.app",
    messagingSenderId: "106646034806",
    appId: "1:106646034806:web:22f2f6777652501013c257",
    measurementId: "G-48QJ08RCB2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🚀 Firebase initialized for login");

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("✅ User already logged in:", user.email);
        // Check if session is valid
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        if (sessionExpiry) {
            const now = new Date().getTime();
            const expiry = new Date(sessionExpiry).getTime();
            if (now < expiry) {
                // Session is valid, redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
                return;
            }
        }
        // Session expired, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('sessionExpiry');
    } else {
        console.log("ℹ️ No user currently logged in");
    }
});

// Login form handling
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Initializing CB-PHAA Login...");
    
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const loginText = document.getElementById('login-text');
    const loginLoading = document.getElementById('login-loading');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    
    if (!loginForm) {
        console.error("❌ Login form not found!");
        return;
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function setLoading(loading) {
        if (loading) {
            loginBtn.disabled = true;
            loginText.style.display = 'none';
            loginLoading.style.display = 'inline-block';
        } else {
            loginBtn.disabled = false;
            loginText.style.display = 'inline';
            loginLoading.style.display = 'none';
        }
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        console.log("🔐 Login attempt for email:", email);
        
        setLoading(true);
        showError('');
        
        try {
            console.log("🔐 Attempting Firebase authentication...");
            
            // Sign in with email and password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log("✅ Firebase authentication successful:", user.email);
            
            // Get user role from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            let userRole = 'user';
            
            if (userDoc.exists()) {
                userRole = userDoc.data().role || 'user';
            }
            
            // Set session data
            const sessionExpiry = new Date();
            sessionExpiry.setHours(sessionExpiry.getHours() + 24); // 24 hour session
            
            localStorage.setItem('authToken', user.uid);
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('sessionExpiry', sessionExpiry.toISOString());
            
            showSuccess("Login successful! Notifying extension...");
            
            // Send login notification to extension
            console.log("📤 Sending login notification to extension...");
            const notificationResult = await notifyExtensionLogin(user);
            
            if (notificationResult.success) {
                console.log("✅ Extension notification sent successfully:", notificationResult.commandId);
                showSuccess("Login successful! Redirecting...");
            } else {
                console.warn("⚠️ Extension notification failed, but continuing with login:", notificationResult.error);
                showSuccess("Login successful! Redirecting...");
            }
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error("❌ Login failed:", error);
            
            let errorMsg = "Login failed. Please try again.";
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMsg = "No account found with this email.";
                    break;
                case 'auth/wrong-password':
                    errorMsg = "Incorrect password.";
                    break;
                case 'auth/invalid-email':
                    errorMsg = "Invalid email address.";
                    break;
                case 'auth/too-many-requests':
                    errorMsg = "Too many failed attempts. Please try again later.";
                    break;
                case 'auth/network-request-failed':
                    errorMsg = "Network error. Please check your connection.";
                    break;
                default:
                    errorMsg = `Login failed: ${error.message}`;
            }
            
            showError(errorMsg);
            
        } finally {
            setLoading(false);
        }
    });
});

// Password visibility toggle
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', function () {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    // Optionally, you can swap the SVG icon here for an "eye-off"
    eyeIcon.setAttribute('opacity', isPassword ? '0.5' : '1');
  });
}

// Notify extension about successful login
async function notifyExtensionLogin(user) {
    try {
        console.log("📤 Preparing extension login command...");
        
        if (!user || !user.uid) {
            throw new Error("Missing user or user.uid");
        }

        const currentAuth = auth.currentUser;
        console.log("🔐 Firestore Auth UID:", currentAuth?.uid || "null");

        const command = {
            action: "userLogin",
            data: {
                userId: user.uid,
                userEmail: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                timestamp: Date.now(),
                message: "User logged in to web app"
            },
            source: "webapp",
            target: "extension",
            status: "pending",
            createdAt: serverTimestamp()
        };

        const commandRef = await addDoc(collection(db, "extensionCommands"), command);
        console.log("✅ Command added to Firestore:", commandRef.id);

        return { success: true, commandId: commandRef.id };
    } catch (error) {
        console.error("❌ Failed to notify extension login:", error.message);
        console.error("🔥 Full error object:", error);
        return { success: false, error: error.message };
    }
} 