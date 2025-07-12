// signup.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

const signupForm = document.getElementById('signupForm');
const signupBtn = document.getElementById('signupBtn');
const signupBtnText = document.getElementById('signupBtnText');
const signupSpinner = document.getElementById('signupSpinner');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Password visibility toggles
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');

const confirmPasswordInput = document.getElementById('confirmPassword');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
const eyeIconConfirm = document.getElementById('eyeIconConfirm');

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', function () {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.setAttribute('opacity', isPassword ? '0.5' : '1');
  });
}
if (toggleConfirmPasswordBtn) {
  toggleConfirmPasswordBtn.addEventListener('click', function () {
    const isPassword = confirmPasswordInput.type === 'password';
    confirmPasswordInput.type = isPassword ? 'text' : 'password';
    eyeIconConfirm.setAttribute('opacity', isPassword ? '0.5' : '1');
  });
}

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessage.textContent = '';
  successMessage.textContent = '';
  signupBtn.disabled = true;
  signupSpinner.style.display = 'inline-block';
  signupBtnText.textContent = 'Signing Up...';

  const username = document.getElementById('username').value.trim();
  const displayName = document.getElementById('displayName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!username || !displayName || !email || !password || !confirmPassword) {
    errorMessage.textContent = 'Please fill in all fields.';
    signupBtn.disabled = false;
    signupSpinner.style.display = 'none';
    signupBtnText.textContent = 'Sign Up';
    return;
  }

  if (password !== confirmPassword) {
    errorMessage.textContent = 'Passwords do not match.';
    signupBtn.disabled = false;
    signupSpinner.style.display = 'none';
    signupBtnText.textContent = 'Sign Up';
    return;
  }

  // Hash password using SubtleCrypto
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Update displayName in Auth profile
    await updateProfile(user, { displayName });
    // Hash the password for Firestore
    const passwordHash = await hashPassword(password);
    // Save user info to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      username,
      displayName,
      email,
      role: 'user',
      passwordHash,
      dateCreated: serverTimestamp()
    });
    successMessage.textContent = 'Account created! Redirecting...';
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1200);
  } catch (error) {
    errorMessage.textContent = error.message.replace('Firebase: ', '');
  } finally {
    signupBtn.disabled = false;
    signupSpinner.style.display = 'none';
    signupBtnText.textContent = 'Sign Up';
  }
}); 