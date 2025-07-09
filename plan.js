// Apply theme immediately to prevent flashing
(function() {
    // Use localStorage instead of chrome.storage for web app
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
})();

// plan.js - For future interactivity on the Plan page.
document.addEventListener('DOMContentLoaded', () => {
    console.log('Plan page loaded');
});

// Theme sync using localStorage for web app
function updateTheme(theme) {
    localStorage.setItem('theme', theme);
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

// Firebase imports and configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

// Authentication state management
let currentUser = null;
let isAuthenticated = false;

// Initialize authentication
function initializeAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            isAuthenticated = true;
            console.log("✅ User authenticated:", user.email);
            showAuthenticatedUI();
            loadPlanData();
        } else {
            currentUser = null;
            isAuthenticated = false;
            console.log("❌ User not authenticated");
            showAuthOverlay();
        }
    });
}

// Show authentication overlay
function showAuthOverlay() {
    let overlay = document.getElementById('auth-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'auth-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(255,255,255,0.95)';
        overlay.style.zIndex = 9999;
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.innerHTML = `
            <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <h2 style="color:#4A4DE6; margin-bottom: 20px;">🔐 Authentication Required</h2>
                <p style="color: #666; margin-bottom: 30px;">Please log in via the browser extension to access the plan page.</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="check-auth-btn" style="padding: 10px 20px; background: #4A4DE6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Check Auth Status
                    </button>
                    <button id="retry-auth-btn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔑 Retry Authentication
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('check-auth-btn').addEventListener('click', checkAuthStatus);
        document.getElementById('retry-auth-btn').addEventListener('click', retryAuthentication);
    } else {
        overlay.style.display = 'flex';
    }
    
    // Hide plan content
    const planContainer = document.querySelector('.plan-container');
    if (planContainer) planContainer.style.display = 'none';
}

// Show authenticated UI
function showAuthenticatedUI() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Show plan content
    const planContainer = document.querySelector('.plan-container');
    if (planContainer) planContainer.style.display = 'flex';
    
    // Update user info in sidebar
    updateUserInfo();
}

// Update user information in the sidebar
function updateUserInfo() {
    if (currentUser) {
        const userInfoElements = document.querySelectorAll('.user-info h4, .user-info p');
        if (userInfoElements.length >= 2) {
            userInfoElements[0].textContent = currentUser.displayName || currentUser.email.split('@')[0];
            userInfoElements[1].textContent = currentUser.email;
        }
    }
}

// Check authentication status
async function checkAuthStatus() {
    try {
        console.log("🔍 Checking authentication status...");
        const user = auth.currentUser;
        if (user) {
            console.log("✅ User is authenticated:", user.email);
            showAuthenticatedUI();
        } else {
            console.log("❌ No authenticated user found");
            alert("No authenticated user found. Please log in via the browser extension.");
        }
    } catch (error) {
        console.error("❌ Error checking auth status:", error);
        alert("Error checking authentication status.");
    }
}

// Retry authentication
function retryAuthentication() {
    console.log("🔄 Retrying authentication...");
    // Force a re-check of auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            isAuthenticated = true;
            showAuthenticatedUI();
        } else {
            alert("Authentication failed. Please ensure you're logged in via the browser extension.");
        }
    });
}

// Extension command functions
async function sendExtensionCommand(action, data = {}) {
    if (!isAuthenticated) {
        alert("Please authenticate first.");
        return null;
    }
    
    try {
        const commandData = {
            action: action,
            target: "extension",
            status: "pending",
            data: data,
            source: "webapp",
            userId: currentUser.uid,
            userEmail: currentUser.email,
            createdAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, "extensionCommands"), commandData);
        console.log(`✅ ${action} command sent:`, docRef.id);
        
        // Wait for command completion
        return await waitForCommandCompletion(docRef.id);
    } catch (error) {
        console.error(`❌ Error sending ${action} command:`, error);
        alert(`Failed to send ${action} command.`);
        return null;
    }
}

// Wait for command completion
async function waitForCommandCompletion(commandId, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Command timeout'));
        }, timeout);
        
        const unsubscribe = onSnapshot(doc(db, "extensionCommands", commandId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.status === 'completed') {
                    clearTimeout(timeoutId);
                    unsubscribe();
                    console.log(`✅ Command completed: ${data.message}`);
                    resolve(data);
                } else if (data.status === 'error') {
                    clearTimeout(timeoutId);
                    unsubscribe();
                    console.log(`❌ Command failed: ${data.message}`);
                    reject(new Error(data.message));
                }
            }
        }, (error) => {
            clearTimeout(timeoutId);
            unsubscribe();
            reject(error);
        });
    });
}

// Specific command functions
async function sendLogoutCommand() {
    try {
        const result = await sendExtensionCommand("logout");
        if (result) {
            alert("✅ Logout command sent successfully!");
            // Sign out from web app as well
            await signOut(auth);
        }
    } catch (error) {
        console.error("❌ Logout command failed:", error);
        alert("Failed to send logout command.");
    }
}

// Load plan data
async function loadPlanData() {
    if (!isAuthenticated) return;
    
    try {
        console.log("📊 Loading plan data...");
        // Initialize plan functionality
        initializePlanFeatures();
        
        // Fetch and display current user plan
        await fetchCurrentUserPlan();
        
    } catch (error) {
        console.error("❌ Error loading plan data:", error);
    }
}

// Initialize plan features
function initializePlanFeatures() {
    console.log("📋 plan.js script loaded successfully!");
    
    // Add extension command buttons
    addExtensionCommandButtons();
    
    // Initialize existing plan functionality
    initializeExistingFeatures();
}

// Add extension command buttons
function addExtensionCommandButtons() {
    const pageActions = document.querySelector('.page-actions');
    if (pageActions && !document.getElementById('extension-commands')) {
        const extensionCommandsDiv = document.createElement('div');
        extensionCommandsDiv.id = 'extension-commands';
        extensionCommandsDiv.style.display = 'flex';
        extensionCommandsDiv.style.gap = '10px';
        extensionCommandsDiv.style.marginTop = '10px';
        
        extensionCommandsDiv.innerHTML = `
            <button class="btn btn-secondary" id="check-extension-auth">🔍 Check Extension Auth</button>
            <button class="btn btn-warning" id="clear-extension-data">🗑️ Clear Extension Data</button>
            <button class="btn btn-info" id="test-extension-command">🧪 Test Command</button>
        `;
        
        pageActions.appendChild(extensionCommandsDiv);
        
        // Add event listeners
        document.getElementById('check-extension-auth').addEventListener('click', async () => {
            const result = await sendExtensionCommand("getAuthStatus");
            if (result) {
                alert("Extension auth status: " + JSON.stringify(result.result));
            }
        });
        document.getElementById('clear-extension-data').addEventListener('click', async () => {
            const result = await sendExtensionCommand("clearData");
            if (result) {
                alert("Extension data cleared successfully!");
            }
        });
        document.getElementById('test-extension-command').addEventListener('click', () => {
            sendExtensionCommand("test", { message: "Test command from plan page" });
        });
    }
}

// Initialize existing features (placeholder for existing plan.js functionality)
function initializeExistingFeatures() {
    // Add event listeners for logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', sendLogoutCommand);
    }
    
    // Initialize any existing plan functionality here
    console.log("📋 Plan features initialized");
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Initializing plan page...");
    
    // Initialize authentication
    initializeAuth();
    
    // Attach event listeners to plan buttons
    attachPlanButtonListeners();
});

// Attach event listeners to plan buttons
function attachPlanButtonListeners() {
    const planButtons = [
        { selector: '.plan-card:nth-child(1) .btn', key: 'starter' },
        { selector: '.plan-card:nth-child(2) .btn', key: 'professional' },
        { selector: '.plan-card:nth-child(3) .btn', key: 'business' },
        { selector: '.plan-card:nth-child(4) .btn', key: 'enterprise' }
    ];
    
    planButtons.forEach(({ selector, key }) => {
        const btn = document.querySelector(selector);
        if (btn) {
            // Remove existing listeners to prevent duplicates
            btn.replaceWith(btn.cloneNode(true));
            const newBtn = document.querySelector(selector);
            newBtn.addEventListener('click', () => choosePlan(key));
        }
    });
    
    console.log("✅ Plan button listeners attached");
}

// Plan selection and save to plan_subscribers
const PLAN_OPTIONS = {
    starter: {
        name: 'Starter',
        price: 20,
        citations: 1000,
        aiCategorySnipper: false
    },
    professional: {
        name: 'Professional',
        price: 30,
        citations: 1700,
        aiCategorySnipper: false
    },
    business: {
        name: 'Business',
        price: 50,
        citations: 3000,
        aiCategorySnipper: false
    },
    enterprise: {
        name: 'Enterprise',
        price: 100,
        citations: 'unlimited',
        aiCategorySnipper: true
    }
};

// Fetch and display the current user's plan and citation usage
async function fetchCurrentUserPlan() {
    if (!isAuthenticated || !currentUser) return;
    
    try {
        console.log("📊 Fetching current user plan...");
        const q = query(
            collection(db, 'plan_subscribers'), 
            where('userId', '==', currentUser.uid), 
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const planDoc = snapshot.docs[0].data();
            console.log("✅ Found user plan:", planDoc);
            
            // Update the current plan section
            updateCurrentPlanUI(planDoc);
            
            // Update plan cards to show current plan
            updatePlanCardsUI(planDoc);
            
        } else {
            console.log("❌ No plan found for user");
            // Show default/guest plan
            updateCurrentPlanUI({
                plan: 'Guest',
                citations: 100,
                citationsUsed: 0,
                status: 'active',
                price: 0,
                endDate: null
            });
            updatePlanCardsUI(null);
        }
    } catch (error) {
        console.error('❌ Error fetching current user plan:', error);
        // Show error state
        updateCurrentPlanUI({
            plan: 'Error',
            citations: 0,
            citationsUsed: 0,
            status: 'error',
            price: 0,
            endDate: null
        });
    }
}

// Update the current plan section UI
function updateCurrentPlanUI(planData) {
    const planHeader = document.querySelector('.plan-header h2');
    const billingInfo = document.querySelector('.billing-info');
    const citationsUsed = document.querySelector('.citations-used .citations-header span:last-child');
    const progressBar = document.querySelector('.progress');
    const statsValues = document.querySelectorAll('.plan-stats .stat-value');
    
    // Update plan header
    if (planHeader) {
        const planName = planData.plan || 'Guest';
        planHeader.innerHTML = `<img src="icons/plan.svg" alt=""> Current Plan: ${planName}`;
    }
    
    // Update billing info with proper error handling
    if (billingInfo) {
        let nextBilling = 'N/A';
        let price = 'Free';
        
        try {
            if (planData.endDate && planData.endDate.toDate) {
                nextBilling = new Date(planData.endDate.toDate()).toLocaleDateString();
            } else if (planData.endDate && planData.endDate instanceof Date) {
                nextBilling = planData.endDate.toLocaleDateString();
            } else if (planData.endDate && typeof planData.endDate === 'string') {
                nextBilling = new Date(planData.endDate).toLocaleDateString();
            }
        } catch (error) {
            console.error('Error parsing endDate:', error);
            nextBilling = 'N/A';
        }
        
        if (planData.price !== undefined && planData.price !== null) {
            price = `$${planData.price}/month`;
        }
        
        billingInfo.textContent = `Next billing: ${nextBilling} • ${price}`;
    }
    
    // Update citations used and progress bar
    if (citationsUsed) {
        const total = planData.citations === 'unlimited' ? '∞' : (planData.citations || 100);
        const used = planData.citationsUsed || 0;
        citationsUsed.textContent = `${used} / ${total}`;
        
        // Update progress bar with proper percentage calculation
        if (progressBar) {
            if (planData.citations === 'unlimited') {
                progressBar.style.width = '100%';
            } else {
                const totalCitations = planData.citations || 100;
                const usedCitations = planData.citationsUsed || 0;
                
                if (totalCitations > 0) {
                    const percentage = Math.min((usedCitations / totalCitations) * 100, 100);
                    progressBar.style.width = `${percentage}%`;
                } else {
                    progressBar.style.width = '0%';
                }
            }
        }
    }
    
    // Update stats with proper percentage calculation
    if (statsValues.length >= 3) {
        const used = planData.citationsUsed || 0;
        const total = planData.citations === 'unlimited' ? '∞' : (planData.citations || 100);
        
        let remaining = '∞';
        let usage = '0%';
        
        if (planData.citations !== 'unlimited' && planData.citations > 0) {
            remaining = Math.max(0, planData.citations - used);
            usage = used > 0 ? `${Math.round((used / planData.citations) * 100)}%` : '0%';
        } else if (planData.citations === 'unlimited') {
            usage = '100%';
        }
        
        statsValues[0].textContent = used;
        statsValues[1].textContent = remaining;
        statsValues[2].textContent = usage;
    }
    
    // Update status badge
    const popularBadge = document.querySelector('.popular-badge');
    if (popularBadge) {
        if (planData.status === 'pending') {
            popularBadge.textContent = 'Pending';
            popularBadge.className = 'popular-badge pending';
        } else if (planData.status === 'approved') {
            popularBadge.textContent = 'Active';
            popularBadge.className = 'popular-badge active';
        } else if (planData.status === 'expired') {
            popularBadge.textContent = 'Expired';
            popularBadge.className = 'popular-badge expired';
        } else {
            popularBadge.textContent = 'Active';
            popularBadge.className = 'popular-badge active';
        }
    }
}

// Update plan cards to show current plan and appropriate buttons
function updatePlanCardsUI(currentPlan) {
    const planCards = document.querySelectorAll('.plan-card');
    
    planCards.forEach((card, index) => {
        const button = card.querySelector('.btn');
        const currentPlanLabel = card.querySelector('.current-plan-label');
        
        // Remove existing current plan styling
        card.classList.remove('current');
        
        // Determine which plan this card represents
        let planKey = '';
        switch(index) {
            case 0: planKey = 'starter'; break;
            case 1: planKey = 'professional'; break;
            case 2: planKey = 'business'; break;
            case 3: planKey = 'enterprise'; break;
        }
        
        if (currentPlan && currentPlan.plan === PLAN_OPTIONS[planKey]?.name) {
            // This is the current plan
            card.classList.add('current');
            
            if (currentPlanLabel) {
                currentPlanLabel.style.display = 'block';
            }
            
            if (button) {
                button.textContent = 'Current Plan';
                button.className = 'btn btn-current';
                button.disabled = true;
            }
        } else {
            // This is not the current plan
            if (currentPlanLabel) {
                currentPlanLabel.style.display = 'none';
            }
            
            if (button) {
                if (currentPlan && currentPlan.status === 'pending') {
                    button.textContent = 'Plan Pending';
                    button.className = 'btn btn-pending';
                    button.disabled = true;
                } else {
                    const plan = PLAN_OPTIONS[planKey];
                    if (plan) {
                        if (currentPlan && currentPlan.plan === 'Guest') {
                            button.textContent = 'Upgrade';
                            button.className = 'btn btn-upgrade';
                        } else if (currentPlan && plan.price > (currentPlan.price || 0)) {
                            button.textContent = 'Upgrade';
                            button.className = 'btn btn-upgrade';
                        } else if (currentPlan && plan.price < (currentPlan.price || 0)) {
                            button.textContent = 'Downgrade';
                            button.className = 'btn btn-downgrade';
                        } else {
                            button.textContent = 'Choose Plan';
                            button.className = 'btn btn-upgrade';
                        }
                    }
                    button.disabled = false;
                }
            }
        }
    });
}

// Enhanced choosePlan function with better status handling
async function choosePlan(planKey) {
    if (!isAuthenticated || !currentUser) {
        alert('Please log in to choose a plan.');
        return;
    }
    
    const plan = PLAN_OPTIONS[planKey];
    if (!plan) {
        alert('Invalid plan selection.');
        return;
    }
    
    // Check if user already has a pending plan
    try {
        const q = query(
            collection(db, 'plan_subscribers'), 
            where('userId', '==', currentUser.uid),
            where('status', '==', 'pending')
        );
        const pendingSnapshot = await getDocs(q);
        
        if (!pendingSnapshot.empty) {
            alert('You already have a pending plan request. Please wait for admin approval.');
            return;
        }
    } catch (error) {
        console.error('Error checking pending plans:', error);
    }
    
    // Confirmation dialog
    const confirmed = confirm(`Are you sure you want to request the ${plan.name} plan for $${plan.price}/month? This request will be sent to the admin for approval.`);
    if (!confirmed) return;
    
    try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        
        await addDoc(collection(db, 'plan_subscribers'), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            plan: plan.name,
            price: plan.price,
            citations: plan.citations,
            citationsUsed: 0,
            aiCategorySnipper: plan.aiCategorySnipper,
            startDate: startDate,
            endDate: endDate,
            createdAt: serverTimestamp(),
            status: 'pending'
        });
        
        alert(`Your plan request for the ${plan.name} plan has been submitted and is pending admin approval. You will be notified when it is activated.`);
        
        // Refresh the plan display
        await fetchCurrentUserPlan();
        
    } catch (error) {
        console.error('Error saving plan subscription:', error);
        alert('Failed to submit plan request. Please try again.');
    }
} 