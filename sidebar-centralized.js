// Centralized Sidebar Management
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp,
    doc,
    getDoc
} from 'firebase/firestore';


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

// Global state
let currentUser = null;

// Initialize centralized sidebar
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Initializing Centralized Sidebar...");
    
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ User authenticated:", user.email);
            currentUser = user;
            updateUserInfo().then(() => {
                setupSidebarFunctionality();
                highlightActivePage();
            });
        } else {
            console.log("❌ No authenticated user - redirecting to login");
            window.location.href = '/index.html';
        }
    });
});

// Update user information in sidebar
async function updateUserInfo() {
    if (!currentUser) return;
    
    const userDisplayName = document.getElementById('user-display-name');
    const userEmail = document.getElementById('user-email');
    
    if (userDisplayName) {
        userDisplayName.textContent = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    }
    
    if (userEmail) {
        userEmail.textContent = currentUser.email || 'user@example.com';
    }
    
    // Wait for sidebar to be loaded in DOM
    setTimeout(async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
            let adminNavItem = document.querySelector('.nav-item[data-page="admin"]');
            const sidebarNavUl = document.querySelector('.sidebar-nav ul');
            if (isAdmin) {
                // If admin tab is missing, inject it
                if (!adminNavItem && sidebarNavUl) {
                    adminNavItem = document.createElement('li');
                    adminNavItem.className = 'nav-item';
                    adminNavItem.setAttribute('data-page', 'admin');
                    adminNavItem.innerHTML = '<a href="admin.html"><img src="icons/settings.svg" alt=""> Admin</a>';
                    sidebarNavUl.appendChild(adminNavItem);
                }
                if (adminNavItem) adminNavItem.style.display = 'block';
            } else {
                if (adminNavItem) adminNavItem.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    }, 100);
    
    console.log("👤 Updated user info in sidebar:", {
        displayName: currentUser.displayName,
        email: currentUser.email,
        uid: currentUser.uid
    });
}

// Setup sidebar functionality
function setupSidebarFunctionality() {
    const userProfileButton = document.getElementById('user-profile-button');
    const profilePopup = document.getElementById('profile-popup');
    const logoutBtn = document.getElementById('logout-btn');

    // Profile popup toggle
    if (userProfileButton && profilePopup) {
        userProfileButton.addEventListener('click', (event) => {
            event.stopPropagation();
            profilePopup.classList.toggle('show');
        });
    }

    // Close popup when clicking outside
    document.addEventListener('click', (event) => {
        if (profilePopup && profilePopup.classList.contains('show') && !userProfileButton.contains(event.target)) {
            profilePopup.classList.remove('show');
        }
    });

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                console.log("🚪 Logging out user...");
                
                // Get current user before logout
                const currentUser = auth.currentUser;
                
                // Sign out from Firebase
                await signOut(auth);
                
                // Notify extension about logout
                if (currentUser) {
                    await notifyExtensionLogout(currentUser);
                }
                
                console.log("✅ Logout successful");
                
                // Redirect to login page
                window.location.href = '/index.html';
                
            } catch (error) {
                console.error("❌ Logout failed:", error);
                // Still redirect to login page even if logout fails
                window.location.href = '/index.html';
            }
        });
    }
}

// Highlight active page in navigation
function highlightActivePage() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    // Remove all active classes
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class based on current page
    if (currentPath.includes('dashboard.html') || currentPath === '/' || currentPath === '/index.html') {
        const dashboardItem = document.querySelector('[data-page="dashboard"]');
        if (dashboardItem) dashboardItem.classList.add('active');
    } else if (currentPath.includes('campaign-data.html')) {
        const campaignItem = document.querySelector('[data-page="campaign-data"]');
        if (campaignItem) campaignItem.classList.add('active');
    } else if (currentPath.includes('plan.html')) {
        const planItem = document.querySelector('[data-page="plan"]');
        if (planItem) planItem.classList.add('active');
    } else if (currentPath.includes('settings.html')) {
        const settingsItem = document.querySelector('[data-page="settings"]');
        if (settingsItem) settingsItem.classList.add('active');
    }
    
    console.log("📍 Highlighted active page:", currentPath);
}

// Notify extension about logout
async function notifyExtensionLogout(user) {
    try {
        console.log("📤 Notifying extension about logout...");
        
        const command = {
            action: "userLogout",
            data: {
                userId: user.uid,
                userEmail: user.email,
                timestamp: Date.now(),
                message: "User logged out from web app"
            },
            source: "webapp",
            target: "extension",
            status: "pending",
            createdAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, "extensionCommands"), command);
        console.log("✅ Logout notification sent to extension:", docRef.id);
        
        return { success: true, commandId: docRef.id };
        
    } catch (error) {
        console.error("❌ Failed to notify extension about logout:", error);
        return { success: false, error: error.message };
    }
}

// Export functions for global access
window.updateUserInfo = updateUserInfo;
window.highlightActivePage = highlightActivePage; 