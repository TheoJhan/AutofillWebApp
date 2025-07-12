// Admin Dashboard JavaScript
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    deleteDoc,
    onSnapshot
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global state
let currentUser = null;
let isAdmin = false;
let users = [];
let subscriptions = [];
let documents = [];

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Initializing Admin Dashboard...");
    
    // Check authentication and admin role
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("✅ User authenticated:", user.email);
            
            // Check if user is admin
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                isAdmin = true;
                console.log("✅ Admin access granted");
                initializeAdminDashboard();
            } else {
                console.log("❌ Access denied - Admin role required");
                alert("Access denied. Admin role required.");
                window.location.href = 'dashboard.html';
            }
        } else {
            console.log("❌ No authenticated user - redirecting to login");
            window.location.href = 'index.html';
        }
    });
});

// Initialize admin dashboard functionality
function initializeAdminDashboard() {
    setupTabNavigation();
    setupEventListeners();
    loadUsers();
    loadSubscriptions();
    loadDocuments();
    updateStats();
}

// Setup tab navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Load data for the selected tab
            switch(targetTab) {
                case 'users':
                    loadUsers();
                    break;
                case 'subscriptions':
                    loadSubscriptions();
                    break;
                case 'documents':
                    loadDocuments();
                    break;
                case 'analytics':
                    updateStats();
                    break;
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Add user modal
    document.getElementById('add-user-btn').addEventListener('click', () => {
        document.getElementById('add-user-modal').style.display = 'block';
    });
    
    document.getElementById('close-add-user-modal').addEventListener('click', () => {
        document.getElementById('add-user-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-add-user').addEventListener('click', () => {
        document.getElementById('add-user-modal').style.display = 'none';
    });
    
    document.getElementById('confirm-add-user').addEventListener('click', addNewUser);
    
    // Create document modal
    document.getElementById('create-document-btn').addEventListener('click', () => {
        document.getElementById('create-document-modal').style.display = 'block';
    });
    
    document.getElementById('close-create-document-modal').addEventListener('click', () => {
        document.getElementById('create-document-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-create-document').addEventListener('click', () => {
        document.getElementById('create-document-modal').style.display = 'none';
    });
    
    
    // Export data
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    
    // Search functionality
    document.getElementById('user-search').addEventListener('input', filterUsers);
    document.getElementById('subscription-search').addEventListener('input', filterSubscriptions);
    document.getElementById('document-search').addEventListener('input', filterDocuments);
    
    // Filter dropdowns
    setupFilterDropdowns();
}


// Load users
async function loadUsers() {
    try {
        console.log('🔄 Loading users from Firestore...');
        const usersSnapshot = await getDocs(collection(db, 'users'));
        users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`✅ Loaded ${users.length} users:`, users);
        renderUsersTable();
    } catch (error) {
        console.error('❌ Error loading users:', error);
    }
}

// Load subscriptions
async function loadSubscriptions() {
    try {
        console.log('🔄 Loading subscriptions from Firestore...');
        const subscriptionsSnapshot = await getDocs(collection(db, 'plan_subscribers'));
        subscriptions = subscriptionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`✅ Loaded ${subscriptions.length} subscriptions:`, subscriptions);
        
        // Debug: Check each subscription structure
        subscriptions.forEach((sub, index) => {
            console.log(`📋 Subscription ${index + 1}:`, {
                id: sub.id,
                userEmail: sub.userEmail,
                plan: sub.plan,
                status: sub.status,
                amount: sub.amount
            });
        });
        
        renderSubscriptionsTable();
    } catch (error) {
        console.error('❌ Error loading subscriptions:', error);
    }
}

// Load documents
async function loadDocuments() {
    try {
        const documentsSnapshot = await getDocs(collection(db, 'documents'));
        documents = documentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderDocumentsTable();
    } catch (error) {
        console.error('❌ Error loading documents:', error);
    }
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="icons/user-avatar.svg" alt="Avatar" style="width: 32px; height: 32px;">
                    <div>
                        <div style="font-weight: 500;">${user.displayName || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${user.username || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="status-badge ${user.role}">${user.role}</span></td>
            <td><span class="status-badge active">Active</span></td>
            <td>${user.dateCreated ? new Date(user.dateCreated.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>${user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="action-btn edit" onclick="editUser('${user.id}')" title="Edit User">
                    <img src="icons/settings.svg" alt="Edit" style="width: 16px; height: 16px;">
                </button>
                <button class="action-btn delete" onclick="deleteUser('${user.id}')" title="Delete User">
                    <img src="icons/delete.svg" alt="Delete" style="width: 16px; height: 16px;">
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render subscriptions table
function renderSubscriptionsTable() {
    const tbody = document.getElementById('subscriptions-table-body');
    tbody.innerHTML = '';
    
    console.log('🎨 Rendering subscriptions table with', subscriptions.length, 'subscriptions');
    
    subscriptions.forEach((sub, index) => {
        const status = getSubscriptionStatus(sub);
        const isPending = sub.status === 'pending';
        const isApproved = sub.status === 'approved';
        
        console.log(`📋 Rendering subscription ${index + 1}:`, {
            id: sub.id,
            status: sub.status,
            isPending,
            isApproved
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sub.userEmail || 'N/A'}</td>
            <td>${sub.plan || 'N/A'}</td>
            <td><span class="status-badge ${sub.status}">${sub.status}</span></td>
            <td>${sub.startDate ? new Date(sub.startDate.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>${sub.endDate ? new Date(sub.endDate.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>$${sub.amount || '0'}</td>
            <td>
                <button class="action-btn approve ${isApproved ? 'disabled' : ''}" 
                        onclick="${isApproved ? 'return false' : `approveSubscription('${sub.id}')`}" 
                        title="${isApproved ? 'Already Approved' : 'Approve'}"
                        ${isApproved ? 'disabled' : ''}>
                    <img src="icons/check-circle.svg" alt="Approve" style="width: 16px; height: 16px;">
                </button>
                <button class="action-btn delete ${isApproved ? 'disabled' : ''}" 
                        onclick="${isApproved ? 'return false' : `deleteSubscription('${sub.id}')`}" 
                        title="${isApproved ? 'Cannot delete approved subscription' : 'Delete'}"
                        ${isApproved ? 'disabled' : ''}>
                    <img src="icons/delete.svg" alt="Delete" style="width: 16px; height: 16px;">
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('✅ Subscriptions table rendered');
}


// Add new user
async function addNewUser() {
    const email = document.getElementById('new-user-email').value;
    const displayName = document.getElementById('new-user-display-name').value;
    const role = document.getElementById('new-user-role').value;
    const password = document.getElementById('new-user-password').value;
    
    if (!email || !displayName || !password) {
        alert('Please fill in all required fields.');
        return;
    }
    
    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update display name
        await updateProfile(user, { displayName });
        
        // Save user info to Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            username: email.split('@')[0],
            displayName,
            email,
            role,
            dateCreated: serverTimestamp(),
            lastLogin: null
        });
        
        alert('User created successfully!');
        document.getElementById('add-user-modal').style.display = 'none';
        document.getElementById('add-user-form').reset();
        loadUsers();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error creating user:', error);
        alert(`Error creating user: ${error.message}`);
    }
}
// Update dashboard stats
function updateStats() {
    document.getElementById('total-users-count').textContent = users.length;
    document.getElementById('active-subscriptions-count').textContent = subscriptions.filter(s => getSubscriptionStatus(s) === 'active').length;
    document.getElementById('expiring-soon-count').textContent = subscriptions.filter(s => isExpiringSoon(s)).length;
    
    // Calculate total revenue (this month)
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyRevenue = subscriptions
        .filter(s => {
            const subDate = s.startDate ? s.startDate.toDate() : new Date();
            return subDate.getMonth() === thisMonth && subDate.getFullYear() === thisYear;
        })
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    
    document.getElementById('total-revenue').textContent = `$${monthlyRevenue.toFixed(2)}`;
}

// Helper functions
function getSubscriptionStatus(subscription) {
    if (!subscription.endDate) return 'active';
    const endDate = subscription.endDate.toDate();
    const now = new Date();
    
    if (endDate < now) return 'expired';
    if (endDate - now < 30 * 24 * 60 * 60 * 1000) return 'expiring';
    return 'active';
}

function isExpiringSoon(subscription) {
    if (!subscription.endDate) return false;
    const endDate = subscription.endDate.toDate();
    const now = new Date();
    return endDate - now < 30 * 24 * 60 * 60 * 1000;
}

function setupFilterDropdowns() {
    // User filter
    const userFilterBtn = document.getElementById('user-filter-btn');
    const userFilterDropdown = document.getElementById('user-filter-dropdown');
    
    userFilterBtn.addEventListener('click', () => {
        userFilterDropdown.style.display = userFilterDropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    userFilterDropdown.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            const filter = e.target.dataset.filter;
            document.getElementById('user-filter-text').textContent = e.target.textContent;
            filterUsersByRole(filter);
            userFilterDropdown.style.display = 'none';
        }
    });
    
    // Subscription filter
    const subscriptionFilterBtn = document.getElementById('subscription-filter-btn');
    const subscriptionFilterDropdown = document.getElementById('subscription-filter-dropdown');
    
    subscriptionFilterBtn.addEventListener('click', () => {
        subscriptionFilterDropdown.style.display = subscriptionFilterDropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    subscriptionFilterDropdown.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            const filter = e.target.dataset.filter;
            document.getElementById('subscription-filter-text').textContent = e.target.textContent;
            filterSubscriptionsByStatus(filter);
            subscriptionFilterDropdown.style.display = 'none';
        }
    });
}

// Filter functions
function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const filteredUsers = users.filter(user => 
        user.displayName?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.username?.toLowerCase().includes(searchTerm)
    );
    renderFilteredUsers(filteredUsers);
}

function filterUsersByRole(role) {
    const filteredUsers = role === 'all' ? users : users.filter(user => user.role === role);
    renderFilteredUsers(filteredUsers);
}

function renderFilteredUsers(filteredUsers) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    filteredUsers.forEach(user => {
        // Same rendering logic as renderUsersTable
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="icons/user-avatar.svg" alt="Avatar" style="width: 32px; height: 32px;">
                    <div>
                        <div style="font-weight: 500;">${user.displayName || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${user.username || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="status-badge ${user.role}">${user.role}</span></td>
            <td><span class="status-badge active">Active</span></td>
            <td>${user.dateCreated ? new Date(user.dateCreated.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>${user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="action-btn edit" onclick="editUser('${user.id}')" title="Edit User">
                    <img src="icons/settings.svg" alt="Edit" style="width: 16px; height: 16px;">
                </button>
                <button class="action-btn delete" onclick="deleteUser('${user.id}')" title="Delete User">
                    <img src="icons/delete.svg" alt="Delete" style="width: 16px; height: 16px;">
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterSubscriptions() {
    const searchTerm = document.getElementById('subscription-search').value.toLowerCase();
    const filteredSubscriptions = subscriptions.filter(sub => 
        sub.userEmail?.toLowerCase().includes(searchTerm) ||
        sub.plan?.toLowerCase().includes(searchTerm)
    );
    renderFilteredSubscriptions(filteredSubscriptions);
}

function filterSubscriptionsByStatus(status) {
    const filteredSubscriptions = status === 'all' ? subscriptions : 
        subscriptions.filter(sub => getSubscriptionStatus(sub) === status);
    renderFilteredSubscriptions(filteredSubscriptions);
}

function renderFilteredSubscriptions(filteredSubscriptions) {
    const tbody = document.getElementById('subscriptions-table-body');
    tbody.innerHTML = '';
    
    filteredSubscriptions.forEach(sub => {
        const status = getSubscriptionStatus(sub);
        const isPending = sub.status === 'pending';
        const isApproved = sub.status === 'approved';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sub.userEmail || 'N/A'}</td>
            <td>${sub.plan || 'N/A'}</td>
            <td><span class="status-badge ${status}">${status}</span></td>
            <td>${sub.startDate ? new Date(sub.startDate.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>${sub.endDate ? new Date(sub.endDate.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td>$${sub.amount || '0'}</td>
            <td>
                <button class="action-btn approve ${isApproved ? 'disabled' : ''}" 
                        onclick="${isApproved ? 'return false' : `approveSubscription('${sub.id}')`}" 
                        title="${isApproved ? 'Already Approved' : 'Approve'}"
                        ${isApproved ? 'disabled' : ''}>
                    <img src="icons/check-circle.svg" alt="Approve" style="width: 16px; height: 16px;">
                </button>
                <button class="action-btn delete ${isApproved ? 'disabled' : ''}" 
                        onclick="${isApproved ? 'return false' : `deleteSubscription('${sub.id}')`}" 
                        title="${isApproved ? 'Cannot delete approved subscription' : 'Delete'}"
                        ${isApproved ? 'disabled' : ''}>
                    <img src="icons/delete.svg" alt="Delete" style="width: 16px; height: 16px;">
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterDocuments() {
    const searchTerm = document.getElementById('document-search').value.toLowerCase();
    const filteredDocuments = documents.filter(doc => 
        doc.name?.toLowerCase().includes(searchTerm) ||
        doc.type?.toLowerCase().includes(searchTerm)
    );
    renderFilteredDocuments(filteredDocuments);
}

function renderFilteredDocuments(filteredDocuments) {
    const tbody = document.getElementById('documents-table-body');
    tbody.innerHTML = '';
    
    filteredDocuments.forEach(doc => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doc.name}</td>
            <td>${doc.type}</td>
            <td>${doc.createdBy || 'Admin'}</td>
            <td>${doc.createdAt ? new Date(doc.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
            <td><span class="status-badge active">Active</span></td>
            <td>
                <button class="action-btn edit" onclick="editDocument('${doc.id}')" title="Edit Document">
                    <img src="icons/settings.svg" alt="Edit" style="width: 16px; height: 16px;">
                </button>
                <button class="action-btn delete" onclick="deleteDocument('${doc.id}')" title="Delete Document">
                    <img src="icons/delete.svg" alt="Delete" style="width: 16px; height: 16px;">
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Export data
function exportData() {
    const data = {
        users,
        subscriptions,
        documents,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Action functions (to be implemented)
window.editUser = function(userId) {
    console.log('Edit user:', userId);
    // Implement edit user functionality
};

window.deleteUser = function(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        console.log('Delete user:', userId);
        // Implement delete user functionality
    }
};

window.renewSubscription = function(subscriptionId) {
    console.log('Renew subscription:', subscriptionId);
    // Implement subscription renewal
};

window.editSubscription = function(subscriptionId) {
    console.log('Edit subscription:', subscriptionId);
    // Implement edit subscription
};

window.editDocument = function(documentId) {
    console.log('Edit document:', documentId);
    // Implement edit document
};

window.deleteDocument = function(documentId) {
    if (confirm('Are you sure you want to delete this document?')) {
        console.log('Delete document:', documentId);
        // Implement delete document
    }
};

// Approve a subscription
async function approveSubscription(subId) {
    if (!confirm('Are you sure you want to approve this subscription?')) return;
    
    try {
        console.log('🔄 Approving subscription:', subId);
        
        // Update the subscription status to approved
        await updateDoc(doc(db, 'plan_subscribers', subId), { 
            status: 'approved',
            approvedAt: serverTimestamp(),
            approvedBy: currentUser.uid
        });
        
        console.log('✅ Subscription approved successfully');
        alert('Subscription approved successfully!');
        
        // Reload subscriptions to reflect changes
        await loadSubscriptions();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error approving subscription:', error);
        alert(`Failed to approve subscription: ${error.message}`);
    }
}

// Delete a subscription
async function deleteSubscription(subId) {
    if (!confirm('Are you sure you want to delete this subscription? This action cannot be undone.')) return;
    
    try {
        console.log('🔄 Deleting subscription:', subId);
        
        // Delete the subscription document
        await deleteDoc(doc(db, 'plan_subscribers', subId));
        
        console.log('✅ Subscription deleted successfully');
        alert('Subscription deleted successfully!');
        
        // Reload subscriptions to reflect changes
        await loadSubscriptions();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error deleting subscription:', error);
        alert(`Failed to delete subscription: ${error.message}`);
    }
}

// Make functions globally available for onclick handlers
window.approveSubscription = approveSubscription;
window.deleteSubscription = deleteSubscription;

// Universal function to read users and plan subscribers from Firestore
export async function fetchUsersAndSubscribers() {
    try {
        // Fetch users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('All registered users:', allUsers);

        // Fetch plan subscribers
        const subscribersSnapshot = await getDocs(collection(db, 'plan_subscribers'));
        const allSubscribers = subscribersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('All plan subscribers:', allSubscribers);

        return { users: allUsers, subscribers: allSubscribers };
    } catch (error) {
        console.error('Error fetching users or plan subscribers:', error);
        return { users: [], subscribers: [] };
    }
}

// Make available globally for admin testing
window.fetchUsersAndSubscribers = fetchUsersAndSubscribers; 