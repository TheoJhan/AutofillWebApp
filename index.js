// index.js - Welcome page authentication and animations
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBZwNTgvurQB2XZTdG0hXEhH9nhHEsSyiY",
    authDomain: "cb-phaa.firebaseapp.com",
    projectId: "cb-phaa",
    storageBucket: "cb-phaa.firebasestorage.app",
    messagingSenderId: "106646034806",
    appId: "1:106646034806:web:22f2f6777652501013c257",
    measurementId: "G-48QJ08RCB2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Create floating particles
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Typing effect for the title
function typeWriter(text, element, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            setTimeout(() => {
                element.innerHTML = '';
                i = 0;
                type();
            }, 2000);
        }
    }
    type();
}

// Progress bar animation
function animateProgress() {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                checkAuthStatus();
            }, 500);
        }
        progressBar.style.width = progress + '%';
    }, 200);
}

// Check authentication status and redirect accordingly
async function checkAuthStatus() {
    try {
        // Check if user is authenticated with Firebase
        const user = auth.currentUser;
        
        if (user) {
            // User is authenticated, check if they have a valid session
            const sessionExpiry = localStorage.getItem('sessionExpiry');
            
            if (sessionExpiry) {
                const now = new Date().getTime();
                const expiry = new Date(sessionExpiry).getTime();
                
                if (now < expiry) {
                    // Session is valid, redirect to dashboard
                    window.location.href = 'dashboard.html';
                    return;
                }
            }
            
            // Session expired or no session, redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('sessionExpiry');
            window.location.href = 'login.html';
        } else {
            // No authenticated user, redirect to login
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        // On error, redirect to login
        window.location.href = 'login.html';
    }
}

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is authenticated:', user.email);
    } else {
        console.log('No user authenticated');
    }
});

// Initialize the welcome page
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    typeWriter('CB-PH Advance Autofill', document.getElementById('typing-text'), 150);
    animateProgress();
}); 