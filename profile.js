import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  updateProfile, 
  updatePassword, 
  onAuthStateChanged 
} from 'firebase/auth';

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

function showStatus(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.style.color = isError ? '#d32f2f' : '#28a745';
        setTimeout(() => { el.textContent = ''; }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('profileEmail').value = user.email;
            document.getElementById('displayName').value = user.displayName || '';
        } else {
            window.location.href = 'index.html';
        }
    });

    document.getElementById('saveDisplayNameBtn').addEventListener('click', async () => {
        const user = auth.currentUser;
        const newName = document.getElementById('displayName').value.trim();
        if (!user || !newName) return;
        try {
            await updateProfile(user, { displayName: newName });
            showStatus('displayNameStatus', 'Display name updated!');
        } catch (error) {
            showStatus('displayNameStatus', error.message, true);
        }
    });

    document.getElementById('savePasswordBtn').addEventListener('click', async () => {
        const user = auth.currentUser;
        const newPassword = document.getElementById('newPassword').value;
        if (!user || !newPassword) return;
        try {
            await updatePassword(user, newPassword);
            showStatus('passwordStatus', 'Password updated!');
            document.getElementById('newPassword').value = '';
        } catch (error) {
            showStatus('passwordStatus', error.message, true);
        }
    });
}); 