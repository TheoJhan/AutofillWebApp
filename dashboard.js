// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp,
    doc,
    updateDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    getDocs,
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
let isAuthenticated = false;
let commandHistory = [];
let citationsData = []; // Store citations data
let citationNotes = {}; // Store notes for citations
let currentEditingCitation = null; // Track which citation is being edited

document.addEventListener('DOMContentLoaded', function() {
    // Check Firebase auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            isAuthenticated = true;
            showAuthenticatedUI();
            initializeDashboard();
        } else {
            // Redirect to login page
            window.location.href = '/index.html';
        }
    });
});

// Initialize dashboard after authentication
function initializeDashboard() {
    // Check for saved campaign data and show indicator
    checkSavedCampaignData();
    
    // Load and display citations data
    loadCitationsData();
    
    // Event listeners for table interactions
    const table = document.querySelector('.data-table');
    if (table) {
        const tableBody = table.querySelector('tbody');

        // Highlight input content on click
        if (tableBody) {
            tableBody.addEventListener('click', (event) => {
                const target = event.target;
                // Handle text selection
                if (target.matches('.main-category-input, .sub-category-input, .citation-url-input')) {
                    target.select();
                }
                // Handle single row redirect icon click
                if (target.classList.contains('action-icon-redirect')) {
                    const row = target.closest('tr');
                    const urlInput = row.querySelector('.citation-url-input');
                    if (urlInput && urlInput.value) {
                        // Open URL in new tab (web app version)
                        window.open(urlInput.value, '_blank');
                    }
                }
            });
        }

        // Select All checkbox functionality
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            table.addEventListener('change', (event) => {
                if (event.target === selectAllCheckbox) {
                    const rowCheckboxes = table.querySelectorAll('.row-checkbox');
                    rowCheckboxes.forEach(checkbox => {
                        checkbox.checked = selectAllCheckbox.checked;
                    });
                } else if (event.target.classList.contains('row-checkbox')) {
                    if (!event.target.checked) {
                        selectAllCheckbox.checked = false;
                    } else {
                        const rowCheckboxes = table.querySelectorAll('.row-checkbox');
                        const allChecked = Array.from(rowCheckboxes).every(checkbox => checkbox.checked);
                        selectAllCheckbox.checked = allChecked;
                    }
                }
                updateBulkActionsButton();
            });
        }
    }

    // Bulk Actions dropdown logic
    const bulkActionsBtn = document.getElementById('bulk-actions-btn');
    const bulkActionsDropdown = document.getElementById('bulk-actions-dropdown');
    
    if (bulkActionsBtn) {
        bulkActionsBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            bulkActionsDropdown.classList.toggle('show');
        });
    }
    // Hide dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!bulkActionsBtn.contains(event.target)) {
            bulkActionsDropdown.classList.remove('show');
        }
    });

    // Filter dropdown logic
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    const currentFilterSpan = document.getElementById('current-filter');
    
    if(filterBtn) {
        // Populate filter options
        const statusOptions = [
            { value: 'All', label: 'All' },
            { value: 'To do', label: 'To do' },
            { value: 'Live', label: 'Live' },
            { value: 'Submitted', label: 'Submitted' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Existing', label: 'Existing' },
            { value: 'Unavailable', label: 'Unavailable' },
            { value: 'Replace', label: 'Replace' }
        ];
        statusOptions.forEach(opt => {
            const link = document.createElement('a');
            link.href = '#';
            link.dataset.value = opt.value;
            link.textContent = opt.label;
            filterDropdown.appendChild(link);
        });

        // Show/hide dropdown
        filterBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            filterDropdown.classList.toggle('show');
        });

        // Handle filter selection
        filterDropdown.addEventListener('click', (e) => {
            if(e.target.tagName === 'A') {
                e.preventDefault();
                currentFilterSpan.textContent = e.target.textContent;
                currentFilterSpan.dataset.value = e.target.dataset.value;
                filterDropdown.classList.remove('show');
                applySearchAndFilter();
            }
        });
    }

    // Hide dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (filterBtn && !filterBtn.contains(event.target)) {
            filterDropdown.classList.remove('show');
        }
    });

    // Search logic
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', applySearchAndFilter);
    }

    // Bulk action implementations
    const analyzeSelected = document.getElementById('analyze-selected');
    if (analyzeSelected) analyzeSelected.addEventListener('click', handleAnalyzeSelected);

    const redirectSelected = document.getElementById('redirect-selected');
    if (redirectSelected) redirectSelected.addEventListener('click', handleRedirectSelected);
    
    const clearSelection = document.getElementById('clear-selection');
    if (clearSelection) clearSelection.addEventListener('click', handleClearSelection);

    const tableBody = document.querySelector('.data-table tbody');

    // Add styles for dropdowns in JS since they are part of the dynamic content
    const style = document.createElement('style');
    style.innerHTML = `
        .dropdown-cell {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
        }
        .dropdown-cell span {
            flex-grow: 1;
        }
    `;
    document.head.appendChild(style);
    
    // Note: Update button event listener is handled later in the function

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCitationsToHTML);
    }

    // Add event listeners for input changes
    addInputEventListeners();

    // Note modal event listeners
    const noteModal = document.getElementById('note-modal');
    const closeNoteModalBtn = document.getElementById('close-note-modal');
    const cancelNoteBtn = document.getElementById('cancel-note');
    const submitNoteBtn = document.getElementById('submit-note');

    if (closeNoteModalBtn) {
        closeNoteModalBtn.addEventListener('click', closeNoteModal);
    }
    if (cancelNoteBtn) {
        cancelNoteBtn.addEventListener('click', closeNoteModal);
    }
    if (submitNoteBtn) {
        submitNoteBtn.addEventListener('click', submitNote);
    }

    // Update citations button
    const updateCitationsBtn = document.getElementById('update-citations-btn');
    if (updateCitationsBtn) {
        updateCitationsBtn.addEventListener('click', async () => {
            const overlay = document.getElementById('update-overlay');
            const progressBar = document.getElementById('update-progress-bar');
            if (overlay && progressBar) {
                overlay.style.display = 'flex';
                progressBar.style.width = '0%';
                setTimeout(() => { progressBar.style.width = '60%'; }, 100);
            }
            try {
                await updateCitationsData(() => {
                    if (progressBar) progressBar.style.width = '100%';
                });
            } catch (error) {
                // error handled in updateCitationsData
            } finally {
                setTimeout(() => {
                    if (overlay) overlay.style.display = 'none';
                    if (progressBar) progressBar.style.width = '0%';
                }, 800);
            }
        });
    }
}

const scoreColors = {
    high: '#28a745',
    medium: '#ffc107',
    low: '#dc3545'
}

function getScoreColor(score) {
    if (score >= 90) return scoreColors.high;
    if (score >= 70) return scoreColors.medium;
    return scoreColors.low;
}

// Function to check for saved campaign data and show indicator
function checkSavedCampaignData() {
    try {
        const formData = JSON.parse(localStorage.getItem('formData') || '{}');
        
        if (formData && Object.keys(formData).length > 0) {
            updateDashboardSaveIndicator(formData.idBox);
        }
    } catch (error) {
        console.error("❌ Failed to check saved campaign data:", error);
    }
}

// Function to update dashboard save indicator
function updateDashboardSaveIndicator(savedId) {
    const saveIndicator = document.getElementById("saveIndicator");
    const lastSavedId = document.getElementById("lastSavedId");
    
    if (saveIndicator && lastSavedId) {
        if (savedId && savedId.trim()) {
            lastSavedId.textContent = `ID: ${savedId}`;
            saveIndicator.style.display = "inline-flex";
        } else {
            // Show indicator even without ID if there's saved data
            lastSavedId.textContent = "Data Saved";
            saveIndicator.style.display = "inline-flex";
        }
    }
}

// Function to load citations data from storage
async function loadCitationsData() {
    if (!currentUser) return;
    
    try {
        const userDocRef = doc(db, 'CampaignData', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.citations && Array.isArray(data.citations)) {
                citationsData = data.citations;
                populateTableWithCitationsData(citationsData);
                updateSummaryCards(citationsData);
            } else {
                populateTableWithDefaultData();
            }
        } else {
            populateTableWithDefaultData();
        }
    } catch (error) {
        console.error('❌ Error loading citations data:', error);
        populateTableWithDefaultData();
    }
}

// Helper to fetch and cache categories per site
const categoryCache = {};
async function getCategoriesForSite(site) {
    if (!site) {
        return { mainCategories: ["Skip Category"], subCategories: ["Skip Category"] };
    }
    
    if (categoryCache[site]) {
        return categoryCache[site];
    }

    const sanitizedSite = site.replace(/\./g, '_');
    const resourcePath = `resources/${sanitizedSite}_category.json`;

    try {
        const resp = await fetch(resourcePath);
        
        // Check if response is ok
        if (!resp.ok) {
            categoryCache[site] = { mainCategories: ["Skip Category"], subCategories: ["Skip Category"] };
            return categoryCache[site];
        }
        
        // Check if response is actually JSON
        const contentType = resp.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            categoryCache[site] = { mainCategories: ["Skip Category"], subCategories: ["Skip Category"] };
            return categoryCache[site];
        }
        
        const data = await resp.json();
        
        // Validate that data is an array and has the expected structure
        if (!Array.isArray(data) || data.length === 0) {
            categoryCache[site] = { mainCategories: ["Skip Category"], subCategories: ["Skip Category"] };
            return categoryCache[site];
        }
        
        // Extract categories safely
        const mainCategories = Array.from(new Set(
            data
                .filter(x => x && x["Main Category"])
                .map(x => x["Main Category"])
        ));
        const subCategories = Array.from(new Set(
            data
                .filter(x => x && x["Sub Category"])
                .map(x => x["Sub Category"])
        ));
        
        // If no valid categories found, use defaults
        if (mainCategories.length === 0) mainCategories.push("Skip Category");
        if (subCategories.length === 0) subCategories.push("Skip Category");
        
        categoryCache[site] = { mainCategories, subCategories };
        return categoryCache[site];
        
    } catch (error) {
        // Cache the default result to avoid repeated failed requests
        categoryCache[site] = { mainCategories: ["Skip Category"], subCategories: ["Skip Category"] };
        return categoryCache[site];
    }
}

// Function to get colored SVG icon
function getStatusIconSVG(icon, color) {
    const icons = {
        'check-circle.svg': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="white"/><path d="M9.5 12.5L11.5 14.5L15 11" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2"/></svg>`,
        'clock.svg': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="white"/><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2"/><path d="M12 7V12L15 15" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`,
        'check-circle-purple.svg': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="white"/><path d="M9.5 12.5L11.5 14.5L15 11" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2"/></svg>`,
        'x-circle.svg': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="white"/><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2"/><path d="M9 9L15 15M15 9L9 15" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`,
        'refresh-cw.svg': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display:inline-block;vertical-align:middle;" xmlns="http://www.w3.org/2000/svg"><g><circle cx="12" cy="12" r="12" fill="white"/><path d="M17.65 6.35A8 8 0 1 0 20 12" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="20 6 20 12 14 12" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></svg>`
    };
    return icons[icon] || '';
}

// Function to populate table with citations data
function populateTableWithCitationsData(citationsData) {
    const tableBody = document.querySelector('.data-table tbody');
    tableBody.innerHTML = ''; // Clear existing data
    
    const statusOptions = [
        { value: 'To do', label: 'To do', icon: 'clock.svg', color: '#6c757d' },
        { value: 'Live', label: 'Live', icon: 'check-circle.svg', color: '#28a745' },
        { value: 'Submitted', label: 'Submitted', icon: 'clock.svg', color: '#1e90ff' },
        { value: 'Pending', label: 'Pending', icon: 'clock.svg', color: '#ff9800' },
        { value: 'Existing', label: 'Existing', icon: 'check-circle-purple.svg', color: '#a259e6' },
        { value: 'Unavailable', label: 'Unavailable', icon: 'x-circle.svg', color: '#dc3545' },
        { value: 'Replace', label: 'Replace', icon: 'refresh-cw.svg', color: '#fd7e14' }
    ];

    citationsData.forEach((data, idx) => {
        const row = document.createElement('tr');

        // Determine status: use existing status, or derive from action, or default to "To do"
        let status = data.status || 'To do'; // Use existing status or default
        if (!data.status && data.action) { // If no status, check for action
            if (data.action.toLowerCase().includes('add')) status = 'To do';
            else if (data.action.toLowerCase().includes('update')) status = 'Existing';
        }

        // Find the status option object
        const statusObj = statusOptions.find(opt => opt.value === status) || statusOptions[0];

        // URL input
        const urlInput = `<input type="text" class="citation-url-input" value="${data.url || ''}" style="width: 100%; min-width: 180px;">`;

        // Status select
        let statusSelect = `<div class="status-select-wrapper"><select class="status-select" data-site="${data.site}" data-row="${idx}">`;
        statusOptions.forEach(opt => {
            statusSelect += `<option value="${opt.value}" ${opt.value === status ? 'selected' : ''} data-icon="${opt.icon}" data-color="${opt.color}">${opt.label}</option>`;
        });
        statusSelect += `</select><span class="status-icon">${getStatusIconSVG(statusObj.icon, statusObj.color)} <span style="color:#222;">${statusObj.label}</span></span></div>`;

        // Main Category and Subcategory inputs (with datalist)
        // More robust site name cleaning to get just the domain
        const siteMatch = data.site.match(/[a-zA-Z0-9.-]+\.(com|net|org|biz|us|co)/);
        const site = siteMatch ? siteMatch[0] : '';

        const mainCatId = `maincat-${idx}`;
        const subCatId = `subcat-${idx}`;
        // Use existing values or defaults
        const mainCategoryValue = data.mainCategory || 'Skip Category';
        const subCategoryValue = data.subCategory || 'Skip Category';
        
        let mainCatInput = `<input list="${mainCatId}" class="main-category-input" value="${mainCategoryValue}" data-site="${data.site}" data-row="${idx}" style="width: 140px;">`;
        let subCatInput = `<input list="${subCatId}" class="sub-category-input" value="${subCategoryValue}" data-site="${data.site}" data-row="${idx}" style="width: 140px;">`;
        let mainCatDatalist = `<datalist id="${mainCatId}"><option>Skip Category</option></datalist>`;
        let subCatDatalist = `<datalist id="${subCatId}"><option>Skip Category</option></datalist>`;

        // Identifier for new citations
        let newCitationIcon = '';
        if (data.action === 'Replacement') {
            newCitationIcon = `<img src="icons/replacemajor.svg" alt="Replacement" title="Replacement Citation" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;">`;
        }

        // Action icons: use the same set and order for all citations
        let actionIcons = '';
            actionIcons = `<img src="icons/external-link.svg" title="Open Link" class="action-icon-redirect">
                <img src="icons/chart-bar.svg" title="View Stats" class="action-icon-analyze">
                <img src="icons/note-edit.svg" title="Add Note" class="action-icon-note" style="width:18px;height:18px;cursor:pointer;">
                <img src="icons/more-horizontal.svg" title="More Options">`;

        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td>
            <td>${newCitationIcon}<span>${data.site}</span></td>
            <td>${mainCatInput}${mainCatDatalist}</td>
            <td>${subCatInput}${subCatDatalist}</td>
            <td>${statusSelect}</td>
            <td><span class="score-tag" style="color: ${getScoreColor(80)};">80</span></td>
            <td>${urlInput}</td>
            <td>
                <div class="action-icons">
                    ${actionIcons}
                </div>
            </td>
        `;
        tableBody.appendChild(row);

        // After row is added, fetch and fill datalists
        getCategoriesForSite(site).then(({mainCategories, subCategories}) => {
            const mainDatalist = document.getElementById(mainCatId);
            const subDatalist = document.getElementById(subCatId);
            if (mainDatalist) mainDatalist.innerHTML = mainCategories.map(cat => `<option value="${cat}">`).join('') + '<option value="Skip Category">';
            if (subDatalist) subDatalist.innerHTML = subCategories.map(cat => `<option value="${cat}">`).join('') + '<option value="Skip Category">';
        });

        // Add delete handler for new citations
        if (data.action === 'Replacement') {
            const deleteIcon = row.querySelector('.action-icon-delete');
            if (deleteIcon) {
                deleteIcon.addEventListener('click', function(e) {
                    e.stopPropagation();
                    deleteCitation(data.site, data.url);
                });
            }
        }

        // Add note handler for all citations
        const noteIcon = row.querySelector('.action-icon-note');
        if (noteIcon) {
            noteIcon.addEventListener('click', function(e) {
                e.stopPropagation();
                openNoteModal(data);
            });
        }

        // Add view stats handler for all citations
        const statsIcon = row.querySelector('.action-icon-analyze');
        if (statsIcon) {
            statsIcon.addEventListener('click', function(e) {
                e.stopPropagation();
                // Store the citation data in sessionStorage for the stats page
                sessionStorage.setItem('selectedCitation', JSON.stringify(data));
                window.open('stats.html', '_blank');
            });
        }

        // Add event listeners for main category and sub category inputs
        const mainCategoryInput = row.querySelector('.main-category-input');
        const subCategoryInput = row.querySelector('.sub-category-input');
        
        if (mainCategoryInput) {
            mainCategoryInput.addEventListener('input', function() {
                updateCitationField(data.site, 'mainCategory', this.value);
            });
        }
        
        if (subCategoryInput) {
            subCategoryInput.addEventListener('input', function() {
                updateCitationField(data.site, 'subCategory', this.value);
            });
        }

        // Add event listener for URL input
        const urlInputField = row.querySelector('.citation-url-input');
        if (urlInputField) {
            urlInputField.addEventListener('input', function() {
                updateCitationField(data.site, 'url', this.value);
            });
        }

        // Add event listener for status select
        const statusSelectField = row.querySelector('.status-select');
        if (statusSelectField) {
            statusSelectField.addEventListener('change', function() {
                updateCitationField(data.site, 'status', this.value);
            });
        }
    });
    
    // Update the table footer count
    updateTableFooter(citationsData.length, citationsData.length);

    // Update the summary cards
    updateSummaryCards(citationsData);

    // Add event listeners for status select to update icon/label
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const icon = selectedOption.getAttribute('data-icon');
            const color = selectedOption.getAttribute('data-color');
            const label = selectedOption.textContent;
            const wrapper = this.closest('.status-select-wrapper');
            const iconSpan = wrapper.querySelector('.status-icon');
            iconSpan.innerHTML = `${getStatusIconSVG(icon, color)} <span style=\"color:#222;\">${label}</span>`;
        });
    });
}

// Function to populate table with default data (fallback)
function populateTableWithDefaultData() {
    const tableBody = document.querySelector('.data-table tbody');
    tableBody.innerHTML = ''; // Clear existing data
    
    const citationData = [
        { site: 'Google', mainCategory: 'Legal Services', subCategory: 'Personal Injury Law', status: 'Live', score: 95, url: 'https://google.com/business/lis' },
        { site: 'MapQuest', mainCategory: 'Legal Services', subCategory: 'Personal Injury Law', status: 'Live', score: 91, url: 'https://mapquest.com/business' },
        { site: 'Yahoo! Local', mainCategory: 'Legal Services', subCategory: 'Family Law', status: 'Existing', score: 89, url: 'https://yahoo.com/local' },
        { site: 'Facebook', mainCategory: 'Legal Services', subCategory: 'Personal Injury Law', status: 'Submitted', score: 87, url: 'https://facebook.com/business' },
        { site: 'BBB', mainCategory: 'Legal Services', subCategory: 'Business Law', status: 'Replace', score: 78, url: 'https://bbb.org/business' },
        { site: 'Yelp', mainCategory: 'Legal Services', subCategory: 'Criminal Defense', status: 'To do', score: 72, url: 'https://yelp.com/biz/listing' },
        { site: 'YellowPages', mainCategory: 'Legal Services', subCategory: 'Immigration Law', status: 'To do', score: 65, url: 'https://yellowpages.com/listing' },
        { site: 'Foursquare', mainCategory: 'Legal Services', subCategory: 'Personal Injury Law', status: 'Unavailable', score: 45, url: 'https://foursquare.com/venue' }
    ];

    const statusStyles = {
        'To do': { icon: 'clock.svg', color: '#6c757d', background: '#f8f9fa' },
        Live: { icon: 'check-circle.svg', color: '#28a745', background: '#eaf6ec' },
        Existing: { icon: 'check-circle-purple.svg', color: '#6f42c1', background: '#f1eff8' },
        Submitted: { icon: 'clock.svg', color: '#17a2b8', background: '#e8f6f8' },
        Replace: { icon: 'refresh-cw.svg', color: '#fd7e14', background: '#fff3e8' },
        Pending: { icon: 'clock.svg', color: '#ffc107', background: '#fff9e6' },
        Unavailable: { icon: 'x-circle.svg', color: '#dc3545', background: '#fbebec' }
    };

    citationData.forEach(data => {
        const row = document.createElement('tr');
        const status = statusStyles[data.status];
        
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td>
            <td>${data.site}</td>
            <td>
                <div class="dropdown-cell">
                    <span>${data.mainCategory}</span>
                </div>
            </td>
            <td>
                <div class="dropdown-cell">
                    <span>${data.subCategory}</span>
                </div>
            </td>
            <td>
                <div class="status-tag" style="color: ${status.color}; background-color: ${status.background};">
                    <img src="icons/${status.icon}" alt="${data.status}">
                    <span>${data.status}</span>
                </div>
            </td>
            <td><span class="score-tag" style="color: ${getScoreColor(data.score)};">${data.score}</span></td>
            <td><a href="${data.url}" target="_blank">${data.url}</a></td>
            <td>
                <div class="action-icons">
                    <img src="icons/external-link.svg" title="Open Link" class="action-icon-redirect">
                    <img src="icons/chart-bar.svg" title="View Stats" class="action-icon-analyze">
                    <img src="icons/more-horizontal.svg" title="More Options">
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        
        // Add event listeners for default data
        const statsIcon = row.querySelector('.action-icon-analyze');
        if (statsIcon) {
            statsIcon.addEventListener('click', function(e) {
                e.stopPropagation();
                // Store the citation data in sessionStorage for the stats page
                sessionStorage.setItem('selectedCitation', JSON.stringify(data));
                window.open('stats.html', '_blank');
            });
        }
    });
    
    // Update the table footer count
    updateTableFooter(citationData.length, citationData.length);
    // Update the summary cards with default data
    updateSummaryCards(citationData);
}

// Function to update table footer count
function updateTableFooter(visibleCount, totalCount) {
    const footerText = document.querySelector('.table-footer p');
    if (footerText) {
        footerText.textContent = `Showing ${visibleCount} of ${totalCount} citations`;
    }
}

// Function to update summary cards
function updateSummaryCards(citations) {
    const totalCitations = citations.length;
    
    const workedCitations = citations.filter(c => 
        ['Live', 'Submitted', 'Pending', 'Existing'].includes(c.status)
    ).length;

    const needsAttention = citations.filter(c => c.status === 'Unavailable').length;
    
    const averageScore = citations.length > 0 
        ? Math.round(citations.reduce((sum, c) => sum + (c.score || 0), 0) / citations.length)
        : 0;

    document.getElementById('total-citations-count').textContent = totalCitations;
    document.getElementById('worked-citations-count').textContent = workedCitations;
    document.getElementById('needs-attention-count').textContent = needsAttention;
    
    // Assuming the average score card has an ID, let's add it.
    const avgScoreEl = document.getElementById('average-score-count');
    if (avgScoreEl) {
        avgScoreEl.textContent = averageScore;
    }
}

// Function to save the current state of the citations table to storage
// This function is deprecated - citations are now saved directly to Firestore
// function saveCitationsData() {
//     // Removed localStorage functionality - data is now saved to Firestore
//     console.log('ℹ️ saveCitationsData is deprecated - use updateCitationsData instead');
// }

// --- Bulk Action Functions ---

function updateBulkActionsButton() {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    const count = selectedCheckboxes.length;
    const bulkActionsBtn = document.getElementById('bulk-actions-btn');

    bulkActionsBtn.textContent = `Bulk Actions (${count})`;
    bulkActionsBtn.disabled = count === 0;
}

function handleAnalyzeSelected(e) {
    e.preventDefault();
    alert('Analyze feature is not yet implemented.');
}

function handleRedirectSelected(e) {
    e.preventDefault();
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    selectedCheckboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const urlInput = row.querySelector('.citation-url-input');
        if (urlInput && urlInput.value) {
            // Open URL in new tab (web app version)
            window.open(urlInput.value, '_blank');
        }
    });
}

function handleClearSelection(e) {
    e.preventDefault();
    const allCheckboxes = document.querySelectorAll('.row-checkbox, #selectAllCheckbox');
    allCheckboxes.forEach(checkbox => checkbox.checked = false);
    updateBulkActionsButton();
}

function applySearchAndFilter() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('current-filter').dataset.value || 'All';
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    let visibleCount = 0;

    tableRows.forEach(row => {
        const site = row.cells[1].textContent.toLowerCase();
        const statusSelect = row.querySelector('.status-select');
        const status = statusSelect ? statusSelect.value : '';

        const matchesSearch = site.includes(searchTerm) || status.toLowerCase().includes(searchTerm);
        const matchesFilter = statusFilter === 'All' || status === statusFilter;

        if (matchesSearch && matchesFilter) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    updateTableFooter(visibleCount, tableRows.length);
}

// --- End Bulk Action Functions ---

// Modal functionality for adding new citations
let allCitations = [];
let filteredCitations = [];
let selectedCitations = new Set();

// Load citations from JSON file
async function loadCitations() {
    try {
        const response = await fetch('resources/citationList.json');
        allCitations = await response.json();
        return allCitations;
    } catch (error) {
        return [];
    }
}

// Get campaign country from storage
async function getCampaignCountry() {
    try {
        const formData = JSON.parse(localStorage.getItem('formData') || '{}');
        return formData.countryabbv || null;
    } catch (error) {
        return null;
    }
}

// Filter citations based on criteria
function filterCitations(citations, country, typeFilter, enabledFilter, searchTerm) {
    let filtered = citations.filter(citation => {
        // Only show citations that are enabled (Y or B)
        if (!['Y', 'B'].includes(citation.enabled)) return false;
        
        // Check if enabled matches filter
        if (enabledFilter && enabledFilter !== '' && enabledFilter !== 'all') {
            if (enabledFilter === 'Y,B') {
                // Show both Y and B citations (no additional filtering needed)
            } else if (enabledFilter === 'Y' && citation.enabled !== 'Y') {
                return false;
            } else if (enabledFilter === 'B' && citation.enabled !== 'B') {
                return false;
            }
        }

        // Check if type matches filter
        if (typeFilter && typeFilter !== '' && typeFilter !== 'all') {
            if (citation.type !== typeFilter) return false;
        }

        // Check search term
        if (searchTerm && searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase().trim();
            const citationText = citation.citation.toLowerCase();
            const domainAuth = citation['domain authority']?.toString().toLowerCase() || '';
            const location = citation.location?.toLowerCase() || '';
            const businessType = citation['business type']?.toLowerCase() || '';
            
            // Check if any of the basic fields match
            const basicMatch = citationText.includes(searchLower) || 
                              domainAuth.includes(searchLower) || 
                              location.includes(searchLower);
            
            // For business type, check for exact word match (not partial matches)
            let businessTypeMatch = false;
            if (businessType) {
                // Split business type into individual words and check for exact match
                const businessTypeWords = businessType.split(/[,\s]+/).map(word => word.trim().toLowerCase());
                businessTypeMatch = businessTypeWords.some(word => word === searchLower);
            }
            
            if (!basicMatch && !businessTypeMatch) {
                return false;
            }
        }

        // Check if country matches campaign country using regex
        if (country) {
            const citationCountries = citation.country.split(',');
            const countryRegex = new RegExp(`^${country}`, 'i'); // Case-insensitive, starts with campaign country
            
            const hasMatchingCountry = citationCountries.some(citationCountry => {
                const trimmedCountry = citationCountry.trim();
                return countryRegex.test(trimmedCountry);
            });
            
            if (!hasMatchingCountry) return false;
        }

        return true;
    });

    // Sort by domain authority (highest to lowest)
    filtered.sort((a, b) => {
        const daA = parseInt(a['domain authority']) || 0;
        const daB = parseInt(b['domain authority']) || 0;
        return daB - daA; // Descending order (highest first)
    });

    return filtered;
}

// Function to clip/truncate country data for display
function clipCountryData(countryString) {
    if (!countryString) return 'N/A';
    
    const countries = countryString.split(',').map(c => c.trim());
    
    if (countries.length === 1) {
        return countries[0];
    } else if (countries.length === 2) {
        return countries.join(', ');
    } else {
        // If more than 2 countries, show first 2 + count
        return `${countries.slice(0, 2).join(', ')} +${countries.length - 2}`;
    }
}

// Populate type filter dropdown
function populateTypeFilter(citations) {
    const typeFilter = document.getElementById('type-filter');
    const allowedTypes = [
        'General Directory',
        'Niche Directory', 
        'General + Local Directory',
        'Local + Niche Directory'
    ];
    
    // Clear existing options except "All Types"
    typeFilter.innerHTML = '<option value="">All Types</option>';
    
    allowedTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
}

// Render citations list
function renderCitations(citations) {
    const citationsList = document.getElementById('citations-list');

    if (!citationsList) {
        return;
    }
    
    citationsList.innerHTML = '';
    
    // Add total results count at the top
    const totalResultsDiv = document.createElement('div');
    totalResultsDiv.style.cssText = 'font-weight: bold; margin-bottom: 15px; color: var(--text-primary);';
    totalResultsDiv.textContent = `Total Results: ${citations.length}`;
    citationsList.appendChild(totalResultsDiv);

    if (citations.length === 0) {
        const noResultsDiv = document.createElement('div');
        noResultsDiv.style.cssText = 'text-align: center; color: var(--text-secondary); padding: 20px;';
        noResultsDiv.textContent = 'No citations found matching your criteria.';
        citationsList.appendChild(noResultsDiv);
        return;
    }

    console.log('📝 Rendering citations...');
    citations.forEach((citation, index) => {
        console.log(`📄 Rendering citation ${index + 1}:`, citation.citation);
        
        const citationItem = document.createElement('div');
        citationItem.className = 'citation-item';
        citationItem.dataset.citation = citation.citation;

        const isSelected = selectedCitations.has(citation.citation);
        if (isSelected) {
            citationItem.classList.add('selected');
        }

        citationItem.innerHTML = `
            <input type="checkbox" class="citation-checkbox" ${isSelected ? 'checked' : ''}>
            <div class="citation-info">
                <div class="citation-name">${citation.citation}</div>
                <div class="citation-details">
                    <div class="citation-detail">
                        <strong>DA:</strong> ${citation['domain authority']}
                    </div>
                    <div class="citation-detail">
                        <strong>Country:</strong> ${clipCountryData(citation.country)}
                    </div>
                    <div class="citation-detail">
                        <strong>Location:</strong> ${citation.location || 'N/A'}
                    </div>
                    <div class="citation-detail">
                        <strong>Categories:</strong> ${clipBusinessTypeData(citation['business type'])}
                    </div>
                </div>
            </div>
            <div class="citation-type">${citation.type}</div>
            <div class="citation-enabled ${citation.enabled === 'Y' ? 'yes' : citation.enabled === 'B' ? 'backup' : ''}">
                ${citation.enabled === 'Y' ? 'Yes' : citation.enabled === 'B' ? 'Backup' : 'No'}
            </div>
        `;

        // Add click handlers
        const checkbox = citationItem.querySelector('.citation-checkbox');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleCitationSelection(citation.citation, citationItem);
        });

        citationItem.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                toggleCitationSelection(citation.citation, citationItem);
            }
        });

        citationsList.appendChild(citationItem);
    });
    
    console.log('✅ Citations rendered successfully');
}

// Toggle citation selection
function toggleCitationSelection(citationName, citationItem) {
    if (selectedCitations.has(citationName)) {
        selectedCitations.delete(citationName);
        citationItem.classList.remove('selected');
    } else {
        selectedCitations.add(citationName);
        citationItem.classList.add('selected');
    }
    
    updateAddButton();
    updateSelectedCount();
}

// Update add button text
function updateAddButton() {
    const addButton = document.getElementById('add-selected');
    const count = selectedCitations.size;
    addButton.textContent = count > 0 ? `Add Selected (${count})` : 'Add Selected';
    addButton.disabled = count === 0;
}

function updateSelectedCount() {
    const selectedCountEl = document.getElementById('selected-count');
    if (selectedCountEl) {
        selectedCountEl.textContent = `Chooses: ${selectedCitations.size}`;
    }
}

// Apply filters
function applyFilters() {
    // Check if modal is open
    const modal = document.getElementById('add-citation-modal');
    if (!modal || modal.style.display !== 'block') {
        return;
    }
    
    const typeFilter = document.getElementById('type-filter').value;
    const enabledFilter = document.getElementById('enabled-filter').value;
    const searchFilter = document.getElementById('search-filter').value;
    
    getCampaignCountry().then(country => {
        if (country) {
            console.log('🔍 Filtering by campaign country:', country);
        }
        // Use the global allCitations variable
        const citationsToFilter = window.allCitations || allCitations || [];
        console.log('📊 Citations to filter:', citationsToFilter.length);
        filteredCitations = filterCitations(citationsToFilter, country, typeFilter, enabledFilter, searchFilter);
        console.log(`📊 Found ${filteredCitations.length} citations after filtering`);
        renderCitations(filteredCitations);
    });
}

function normalizeDomain(domain) {
    if (!domain) return '';
    // Remove protocol, www, and trailing slashes, lowercase
    return domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
}

async function openAddCitationModal() {
    console.log('🚀 Opening Add Citation Modal...');
    // Load citations from JSON file when modal opens
    try {
        console.log('📥 Loading citations from JSON file...');
        const citations = await loadCitations();
        console.log('📊 Citations loaded:', citations);
        if (citations && citations.length > 0) {
            // Normalize all existing domains from campaignData
            const existingDomains = new Set((citationsData || []).map(c => normalizeDomain(c.site)));
            // Filter out citations whose normalized domain is already present
            const filteredCitations = citations.filter(c => !existingDomains.has(normalizeDomain(c.citation)));
            console.log('✅ Filtered citations for modal:', filteredCitations.length);
            window.allCitations = filteredCitations;
            allCitations = filteredCitations;
        } else {
            console.log('❌ No citations loaded for modal');
            window.allCitations = [];
            allCitations = [];
        }
    } catch (error) {
        console.error('❌ Error loading citations for modal:', error);
        window.allCitations = [];
        allCitations = [];
    }

    const modal = document.getElementById('add-citation-modal');
    console.log('🔍 Modal element found:', modal);
    
    // Get campaign country and apply initial filters
    const country = await getCampaignCountry();
    if (country) {
        console.log('🌍 Campaign country:', country);
    }
    
    // Populate type filter
    console.log('🎛️ Populating type filter...');
    populateTypeFilter(allCitations);
    
    // Set default values for filters
    const typeFilter = document.getElementById('type-filter');
    const enabledFilter = document.getElementById('enabled-filter');
    const searchFilter = document.getElementById('search-filter');
    
    if (typeFilter) {
        typeFilter.value = 'all';
        console.log('🎛️ Set type filter to "all"');
    }
    
    if (enabledFilter) {
        enabledFilter.value = 'all';
        console.log('🎛️ Set enabled filter to "all"');
    }
    
    // Show the modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Initial filter and render
    applyFilters();
}

// Close modal
function closeAddCitationModal() {
    const modal = document.getElementById('add-citation-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Clear selections
    selectedCitations.clear();
    updateAddButton();
    updateSelectedCount();
}

// Add selected citations
function addSelectedCitations() {
    const selectedCitationsArray = Array.from(selectedCitations);
    
    if (selectedCitationsArray.length === 0) {
        alert('Please select at least one citation to add.');
        return;
    }
    
    // Get current citations from Firestore data
    const currentCitations = citationsData || [];
    
    // Use the correct allCitations reference
    const citationsToUse = window.allCitations || allCitations || [];
    
    // Add new citations with correct structure matching campaign-data.js
    const newCitations = selectedCitationsArray.map(citationName => {
        const citationData = citationsToUse.find(c => c.citation === citationName);
        return {
            site: citationData.citation,
            action: 'Replacement', // Changed from 'Add Listing' to 'Replacement'
            url: citationData['listing url'],
            status: 'To do',
            notes: '',
            mainCategory: '',
            subCategory: ''
        };
    });
    
    // Combine with existing citations
    const updatedCitations = [...currentCitations, ...newCitations];
    
    // Update the global citationsData and save to Firestore
    citationsData = updatedCitations;
    
    // Save to Firestore and refresh the table
    updateCitationsData(() => {
        // Refresh the table with updated data
        populateTableWithCitationsData(citationsData);
        updateSummaryCards(citationsData);
        showNotification(`Added ${newCitations.length} new citations!`, 'success');
    });
    
    // Close the modal after adding citations
    closeAddCitationModal();
}

// Event listeners for modal
document.addEventListener('DOMContentLoaded', () => {
    // Add New Citation button
    const addNewCitationBtn = document.getElementById('add-new-citation-btn');
    if (addNewCitationBtn) {
        addNewCitationBtn.addEventListener('click', openAddCitationModal);
    }
    
    // Close modal button
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeAddCitationModal);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancel-add');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAddCitationModal);
    }
    
    // Add selected button
    const addSelectedBtn = document.getElementById('add-selected');
    if (addSelectedBtn) {
        addSelectedBtn.addEventListener('click', addSelectedCitations);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('add-citation-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAddCitationModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeAddCitationModal();
        }
    });
});

// Delete citation function
function deleteCitation(site, url) {
    try {
        // Filter out the citation to delete from the global citationsData
        const filteredCitations = citationsData.filter(c => !(c.site === site && c.url === url && c.action === 'Replacement'));
        
        // Update the global citationsData and save to Firestore
        citationsData = filteredCitations;
        updateCitationsData();
    } catch (error) {
        console.error("❌ Failed to delete citation:", error);
    }
}

// Export citations to HTML
function exportCitationsToHTML() {
    try {
        // Use citationsData from Firestore instead of localStorage
        const citations = citationsData || [];
        let html = `<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Citations Export</title></head><body>`;
        html += `<h2>Citations Export</h2>`;
        html += `<table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse;font-family:sans-serif;'>`;
        html += `<thead><tr><th>Citation</th><th>Status</th><th>URL</th></tr></thead><tbody>`;
        citations.forEach(c => {
            html += `<tr><td>${c.site || ''}</td><td>${c.status || ''}</td><td>${c.url || ''}</td></tr>`;
        });
        html += `</tbody></table></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'citations_export.html';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error("❌ Failed to export citations:", error);
    }
}

// Show authenticated UI
function showAuthenticatedUI() {
    const authOverlay = document.getElementById('authOverlay');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (authOverlay) authOverlay.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';
}

// Show authentication overlay
function showAuthenticationOverlay() {
    const authOverlay = document.getElementById('authOverlay');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (authOverlay) authOverlay.style.display = 'flex';
    if (dashboardContent) dashboardContent.style.display = 'none';
}

// Redirect to unauthorized page
function redirectToUnauthorized() {
    window.location.href = '/unauthorized.html';
}

// Update authentication status text
function updateAuthStatus(message) {
    const authStatusText = document.getElementById('authStatusText');
    if (authStatusText) {
        authStatusText.textContent = message;
    }
}

// Clip business type data for display
function clipBusinessTypeData(businessType) {
    if (!businessType) return 'N/A';
    
    const types = businessType.split(',').map(t => t.trim());
    
    if (types.length === 1) {
        return types[0];
    } else if (types.length === 2) {
        return types.join(', ');
    } else {
        // If more than 2 types, show first 2 + count
        return `${types.slice(0, 2).join(', ')} +${types.length - 2}`;
    }
}

// Update citations data in Firestore
async function updateCitationsData(onProgress) {
    if (!currentUser) {
        console.error('❌ No current user found');
        showNotification('User not authenticated', 'error');
        return;
    }
    
    console.log('🔄 Starting citation update...');
    console.log('👤 Current user:', currentUser.uid);
    console.log('📊 Citations data to save:', citationsData);
    console.log('📊 Citations data length:', citationsData.length);
    
    try {
        const userDocRef = doc(db, 'CampaignData', currentUser.uid);
        await updateDoc(userDocRef, {
            citations: citationsData,
            updatedAt: serverTimestamp()
        });
        if (typeof onProgress === 'function') onProgress();
        console.log('✅ Citations updated in Firestore successfully');
        showNotification('Citations updated successfully!', 'success');
    } catch (error) {
        console.error('❌ Error updating citations:', error);
        console.error('❌ Error details:', error.message);
        showNotification('Failed to update citations. Please try again.', 'error');
    }
}

// Open note modal for a citation
function openNoteModal(citation) {
    currentEditingCitation = citation;
    const noteModal = document.getElementById('note-modal');
    const noteSite = document.getElementById('note-site');
    const noteContent = document.getElementById('note-content');
    
    noteSite.value = citation.site;
    noteContent.value = citationNotes[citation.site] || '';
    
    noteModal.style.display = 'block';
}

// Close note modal
function closeNoteModal() {
    const noteModal = document.getElementById('note-modal');
    noteModal.style.display = 'none';
    currentEditingCitation = null;
}

// Submit note for a citation
function submitNote() {
    if (!currentEditingCitation) return;
    
    const noteContent = document.getElementById('note-content').value;
    citationNotes[currentEditingCitation.site] = noteContent;
    
    // Update the citation in the data
    const citationIndex = citationsData.findIndex(c => c.site === currentEditingCitation.site);
    if (citationIndex !== -1) {
        citationsData[citationIndex].note = noteContent;
    }
    
    closeNoteModal();
    showNotification('Note saved successfully!', 'success');
}

// Update citation fields
function updateCitationField(site, field, value) {
    console.log(`🔄 Updating citation field: ${site} - ${field} = ${value}`);
    console.log(`📊 Current citationsData length: ${citationsData.length}`);
    
    const citationIndex = citationsData.findIndex(c => c.site === site);
    console.log(`🔍 Found citation at index: ${citationIndex}`);
    
    if (citationIndex !== -1) {
        citationsData[citationIndex][field] = value;
        console.log(`✅ Updated citation ${site} ${field}: ${value}`);
        console.log(`📊 Updated citation data:`, citationsData[citationIndex]);
    } else {
        console.error(`❌ Citation not found: ${site}`);
        console.log(`📊 Available citations:`, citationsData.map(c => c.site));
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Trebuchet MS', Tahoma, Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.4s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">${type === 'success' ? '✅' : '❌'}</span>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }
    }, 5000);
}

// Add event listeners for input changes
function addInputEventListeners() {
    // Main category input listeners
    document.querySelectorAll('.main-category-input').forEach(input => {
        input.addEventListener('input', function() {
            const site = this.getAttribute('data-site');
            const value = this.value;
            updateCitationField(site, 'mainCategory', value);
        });
    });

    // Sub category input listeners
    document.querySelectorAll('.sub-category-input').forEach(input => {
        input.addEventListener('input', function() {
            const site = this.getAttribute('data-site');
            const value = this.value;
            updateCitationField(site, 'subCategory', value);
        });
    });

    // Status select listeners
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', function() {
            const site = this.getAttribute('data-site');
            const value = this.value;
            updateCitationField(site, 'status', value);
        });
    });

    // URL input listeners
    document.querySelectorAll('.citation-url-input').forEach(input => {
        input.addEventListener('input', function() {
            const site = this.getAttribute('data-site');
            const value = this.value;
            updateCitationField(site, 'url', value);
        });
    });
} 