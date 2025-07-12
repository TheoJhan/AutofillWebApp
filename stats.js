// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
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
let citationsData = [];
let comparisonData = [];
let currentDetailCitation = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Initializing CB-PHAA Stats...");
    
    // Check Firebase auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Firebase user authenticated:", user.email);
            currentUser = user;
            initializeStats();
        } else {
            console.log("❌ No authenticated user - redirecting to login");
            window.location.href = '/index.html';
        }
    });
});

// Initialize stats page
async function initializeStats() {
    try {
        await loadCitationsData();
        await performDataComparison();
        setupEventListeners();
        updateOverviewStats();
    } catch (error) {
        console.error("❌ Error initializing stats:", error);
        showNotification("Failed to load stats data", "error");
    }
}

// Load citations data from Firestore
async function loadCitationsData() {
    if (!currentUser) return;
    
    try {
        const userDocRef = doc(db, 'CampaignData', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.citations && Array.isArray(data.citations)) {
                citationsData = data.citations;
                console.log('✅ Loaded citations from Firestore:', citationsData.length, 'citations');
            } else {
                console.log('ℹ️ No citations found in campaign data');
                citationsData = [];
            }
        } else {
            console.log('ℹ️ No campaign data found for user');
            citationsData = [];
        }
    } catch (error) {
        console.error('❌ Error loading citations data:', error);
        citationsData = [];
    }
}

// Perform data comparison (simulate scraping)
async function performDataComparison() {
    comparisonData = [];
    
    for (const citation of citationsData) {
        try {
            // Simulate scraping data from URL
            const scrapedData = await simulateScraping(citation.url);
            
            // Compare campaign data with scraped data
            const comparison = compareData(citation, scrapedData);
            
            comparisonData.push({
                citation: citation,
                scraped: scrapedData,
                comparison: comparison,
                status: comparison.overallMatch ? 'match' : 'mismatch'
            });
        } catch (error) {
            console.error(`Error processing citation ${citation.site}:`, error);
            comparisonData.push({
                citation: citation,
                scraped: null,
                comparison: null,
                status: 'error'
            });
        }
    }
    
    populateComparisonTable();
}

// Simulate scraping data from URL
async function simulateScraping(url) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate different scenarios based on URL
    const urlHash = url ? url.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    const scenario = urlHash % 4;
    
    const baseData = {
        businessName: "Sample Business Name",
        address: "123 Main Street, City, State 12345",
        phone: "(555) 123-4567",
        website: "https://samplebusiness.com",
        category: "Legal Services"
    };
    
    switch (scenario) {
        case 0: // Perfect match
            return baseData;
        case 1: // Slight mismatch
            return {
                ...baseData,
                businessName: "Sample Business Name Inc.",
                phone: "(555) 123-4568"
            };
        case 2: // Major mismatch
            return {
                ...baseData,
                businessName: "Different Business Name",
                address: "456 Oak Avenue, City, State 12345",
                phone: "(555) 987-6543"
            };
        case 3: // Error/no data
            throw new Error("Failed to scrape data");
    }
}

// Compare campaign data with scraped data
function compareData(campaign, scraped) {
    if (!scraped) {
        return {
            nameMatch: false,
            addressMatch: false,
            phoneMatch: false,
            websiteMatch: false,
            categoryMatch: false,
            overallMatch: false,
            matchPercentage: 0
        };
    }
    
    const nameMatch = compareStrings(campaign.businessName || '', scraped.businessName);
    const addressMatch = compareStrings(campaign.address || '', scraped.address);
    const phoneMatch = compareStrings(campaign.phone || '', scraped.phone);
    const websiteMatch = compareStrings(campaign.website || '', scraped.website);
    const categoryMatch = compareStrings(campaign.category || '', scraped.category);
    
    const matches = [nameMatch, addressMatch, phoneMatch, websiteMatch, categoryMatch];
    const matchCount = matches.filter(match => match).length;
    const matchPercentage = (matchCount / matches.length) * 100;
    
    return {
        nameMatch,
        addressMatch,
        phoneMatch,
        websiteMatch,
        categoryMatch,
        overallMatch: matchPercentage >= 80,
        matchPercentage: Math.round(matchPercentage)
    };
}

// Compare two strings (case-insensitive, partial match)
function compareStrings(str1, str2) {
    if (!str1 || !str2) return false;
    
    const clean1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check for exact match or high similarity
    if (clean1 === clean2) return true;
    
    // Check if one contains the other (for partial matches)
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
    
    // Calculate similarity (simple implementation)
    const longer = clean1.length > clean2.length ? clean1 : clean2;
    const shorter = clean1.length > clean2.length ? clean2 : clean1;
    
    if (longer.length === 0) return true;
    
    const similarity = (longer.length - editDistance(longer, shorter)) / longer.length;
    return similarity >= 0.8;
}

// Simple edit distance calculation
function editDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Populate comparison table
function populateComparisonTable() {
    const tbody = document.getElementById('comparison-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    comparisonData.forEach((item, index) => {
        const row = document.createElement('tr');
        
        const campaignData = item.citation;
        const scrapedData = item.scraped;
        const comparison = item.comparison;
        // Only show scraped fields if they match; otherwise blank
        const scrapedName = (scrapedData && comparison && comparison.nameMatch) ? scrapedData.businessName : '';
        const scrapedAddress = (scrapedData && comparison && comparison.addressMatch) ? scrapedData.address : '';
        const scrapedPhone = (scrapedData && comparison && comparison.phoneMatch) ? scrapedData.phone : '';
        const scrapedWebsite = (scrapedData && comparison && comparison.websiteMatch) ? scrapedData.website : '';
        const scrapedCategory = (scrapedData && comparison && comparison.categoryMatch) ? scrapedData.category : '';
        row.innerHTML = `
            <td>
                <div>
                    <strong>${campaignData.site}</strong>
                    <br>
                    <small>${campaignData.url || 'No URL'}</small>
                </div>
            </td>
            <td>
                <div>
                    <strong>${campaignData.businessName || 'N/A'}</strong>
                    <br>
                    <small>${campaignData.address || 'N/A'}</small>
                    <br>
                    <small>${campaignData.phone || 'N/A'}</small>
                </div>
            </td>
            <td>
                <div>
                    <strong>${scrapedName || ''}</strong>
                    <br>
                    <small>${scrapedAddress || ''}</small>
                    <br>
                    <small>${scrapedPhone || ''}</small>
                </div>
            </td>
            <td>
                <span class="status-badge ${item.status}">
                    ${getStatusText(item.status, comparison)}
                </span>
            </td>
            <td>
                <button class="action-btn view" onclick="showDetailModal(${index})">
                    View Details
                </button>
                <button class="action-btn refresh" onclick="refreshCitation(${index})">
                    Refresh
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Get status text
function getStatusText(status, comparison) {
    switch (status) {
        case 'match':
            return `Match (${comparison?.matchPercentage || 0}%)`;
        case 'mismatch':
            return `Mismatch (${comparison?.matchPercentage || 0}%)`;
        case 'error':
            return 'Error';
        case 'loading':
            return 'Loading...';
        default:
            return 'Unknown';
    }
}

// Show detail modal
function showDetailModal(index) {
    const item = comparisonData[index];
    if (!item) return;
    
    currentDetailCitation = item;
    
    // Populate modal with data
    document.getElementById('detail-site').textContent = item.citation.site;
    document.getElementById('detail-url').textContent = item.citation.url || 'N/A';
    document.getElementById('detail-status').textContent = getStatusText(item.status, item.comparison);
    
    // Campaign data
    document.getElementById('campaign-name').textContent = item.citation.businessName || 'N/A';
    document.getElementById('campaign-address').textContent = item.citation.address || 'N/A';
    document.getElementById('campaign-phone').textContent = item.citation.phone || 'N/A';
    document.getElementById('campaign-website').textContent = item.citation.website || 'N/A';
    document.getElementById('campaign-category').textContent = item.citation.category || 'N/A';
    
    // Scraped data: only show if matches, else blank
    if (item.scraped && item.comparison) {
        document.getElementById('scraped-name').textContent = item.comparison.nameMatch ? (item.scraped.businessName || '') : '';
        document.getElementById('scraped-address').textContent = item.comparison.addressMatch ? (item.scraped.address || '') : '';
        document.getElementById('scraped-phone').textContent = item.comparison.phoneMatch ? (item.scraped.phone || '') : '';
        document.getElementById('scraped-website').textContent = item.comparison.websiteMatch ? (item.scraped.website || '') : '';
        document.getElementById('scraped-category').textContent = item.comparison.categoryMatch ? (item.scraped.category || '') : '';
    } else {
        document.getElementById('scraped-name').textContent = '';
        document.getElementById('scraped-address').textContent = '';
        document.getElementById('scraped-phone').textContent = '';
        document.getElementById('scraped-website').textContent = '';
        document.getElementById('scraped-category').textContent = '';
    }
    
    // Update match indicators
    if (item.comparison) {
        updateMatchIndicator('name-match', item.comparison.nameMatch);
        updateMatchIndicator('address-match', item.comparison.addressMatch);
        updateMatchIndicator('phone-match', item.comparison.phoneMatch);
        updateMatchIndicator('website-match', item.comparison.websiteMatch);
    } else {
        updateMatchIndicator('name-match', false, 'error');
        updateMatchIndicator('address-match', false, 'error');
        updateMatchIndicator('phone-match', false, 'error');
        updateMatchIndicator('website-match', false, 'error');
    }
    
    // Show modal
    document.getElementById('detail-modal').style.display = 'block';
}

// Update match indicator
function updateMatchIndicator(elementId, isMatch, status = null) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const statusElement = element.querySelector('.match-status');
    if (!statusElement) return;
    
    if (status === 'error') {
        statusElement.textContent = 'Error';
        statusElement.className = 'match-status error';
    } else if (isMatch) {
        statusElement.textContent = 'Match';
        statusElement.className = 'match-status match';
    } else {
        statusElement.textContent = 'Mismatch';
        statusElement.className = 'match-status mismatch';
    }
}

// Refresh citation data
async function refreshCitation(index) {
    const item = comparisonData[index];
    if (!item) return;
    
    // Update status to loading
    const row = document.querySelector(`#comparison-tbody tr:nth-child(${index + 1})`);
    if (row) {
        const statusCell = row.querySelector('.status-badge');
        if (statusCell) {
            statusCell.textContent = 'Loading...';
            statusCell.className = 'status-badge loading';
        }
    }
    
    try {
        // Re-scrape data
        const scrapedData = await simulateScraping(item.citation.url);
        const comparison = compareData(item.citation, scrapedData);
        
        // Update comparison data
        comparisonData[index] = {
            citation: item.citation,
            scraped: scrapedData,
            comparison: comparison,
            status: comparison.overallMatch ? 'match' : 'mismatch'
        };
        
        // Re-populate table
        populateComparisonTable();
        updateOverviewStats();
        
        showNotification(`Refreshed data for ${item.citation.site}`, 'success');
    } catch (error) {
        console.error('Error refreshing citation:', error);
        showNotification(`Failed to refresh ${item.citation.site}`, 'error');
        
        // Update status to error
        comparisonData[index].status = 'error';
        comparisonData[index].scraped = null;
        comparisonData[index].comparison = null;
        populateComparisonTable();
    }
}

// Update overview statistics
function updateOverviewStats() {
    const totalCitations = comparisonData.length;
    const analyzedCitations = comparisonData.filter(item => item.status !== 'error').length;
    const matchedCitations = comparisonData.filter(item => item.status === 'match').length;
    const matchRate = totalCitations > 0 ? Math.round((matchedCitations / totalCitations) * 100) : 0;
    
    document.getElementById('total-citations').textContent = totalCitations;
    document.getElementById('analyzed-citations').textContent = analyzedCitations;
    document.getElementById('match-rate').textContent = `${matchRate}%`;
    
    // Update analysis status
    const statusElement = document.getElementById('analysis-status');
    if (analyzedCitations === totalCitations && totalCitations > 0) {
        statusElement.textContent = 'Complete';
        statusElement.className = 'overview-badge success';
    } else if (analyzedCitations > 0) {
        statusElement.textContent = 'In Progress';
        statusElement.className = 'overview-badge';
    } else {
        statusElement.textContent = 'No Data';
        statusElement.className = 'overview-badge error';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal close buttons
    const closeDetailModal = document.getElementById('close-detail-modal');
    const closeDetail = document.getElementById('close-detail');
    const detailModal = document.getElementById('detail-modal');
    
    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => {
            detailModal.style.display = 'none';
        });
    }
    
    if (closeDetail) {
        closeDetail.addEventListener('click', () => {
            detailModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    detailModal.addEventListener('click', (event) => {
        if (event.target === detailModal) {
            detailModal.style.display = 'none';
        }
    });
    
    // Refresh stats button
    const refreshStatsBtn = document.getElementById('refresh-stats-btn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', async () => {
            try {
                await performDataComparison();
                updateOverviewStats();
                showNotification('Stats refreshed successfully', 'success');
            } catch (error) {
                console.error('Error refreshing stats:', error);
                showNotification('Failed to refresh stats', 'error');
            }
        });
    }
    
    // Export stats button
    const exportStatsBtn = document.getElementById('export-stats-btn');
    if (exportStatsBtn) {
        exportStatsBtn.addEventListener('click', exportStatsReport);
    }
    
    // Filter controls
    const filterStatus = document.getElementById('filter-status');
    const searchCitations = document.getElementById('search-citations');
    
    if (filterStatus) {
        filterStatus.addEventListener('change', filterComparisonData);
    }
    
    if (searchCitations) {
        searchCitations.addEventListener('input', filterComparisonData);
    }
    
    // Update campaign data button
    const updateCampaignDataBtn = document.getElementById('update-campaign-data');
    if (updateCampaignDataBtn) {
        updateCampaignDataBtn.addEventListener('click', updateCampaignDataFromScraped);
    }
}

// Filter comparison data
function filterComparisonData() {
    const statusFilter = document.getElementById('filter-status').value;
    const searchTerm = document.getElementById('search-citations').value.toLowerCase();
    
    const filteredData = comparisonData.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesSearch = !searchTerm || 
            item.citation.site.toLowerCase().includes(searchTerm) ||
            (item.citation.businessName && item.citation.businessName.toLowerCase().includes(searchTerm));
        
        return matchesStatus && matchesSearch;
    });
    
    populateFilteredTable(filteredData);
}

// Populate filtered table
function populateFilteredTable(filteredData) {
    const tbody = document.getElementById('comparison-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    filteredData.forEach((item, index) => {
        const originalIndex = comparisonData.indexOf(item);
        const row = document.createElement('tr');
        
        const campaignData = item.citation;
        const scrapedData = item.scraped;
        const comparison = item.comparison;
        // Only show scraped fields if they match; otherwise blank
        const scrapedName = (scrapedData && comparison && comparison.nameMatch) ? scrapedData.businessName : '';
        const scrapedAddress = (scrapedData && comparison && comparison.addressMatch) ? scrapedData.address : '';
        const scrapedPhone = (scrapedData && comparison && comparison.phoneMatch) ? scrapedData.phone : '';
        row.innerHTML = `
            <td>
                <div>
                    <strong>${campaignData.site}</strong>
                    <br>
                    <small>${campaignData.url || 'No URL'}</small>
                </div>
            </td>
            <td>
                <div>
                    <strong>${campaignData.businessName || 'N/A'}</strong>
                    <br>
                    <small>${campaignData.address || 'N/A'}</small>
                    <br>
                    <small>${campaignData.phone || 'N/A'}</small>
                </div>
            </td>
            <td>
                <div>
                    <strong>${scrapedName || ''}</strong>
                    <br>
                    <small>${scrapedAddress || ''}</small>
                    <br>
                    <small>${scrapedPhone || ''}</small>
                </div>
            </td>
            <td>
                <span class="status-badge ${item.status}">
                    ${getStatusText(item.status, comparison)}
                </span>
            </td>
            <td>
                <button class="action-btn view" onclick="showDetailModal(${originalIndex})">
                    View Details
                </button>
                <button class="action-btn refresh" onclick="refreshCitation(${originalIndex})">
                    Refresh
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Export stats report
function exportStatsReport() {
    const report = {
        generatedAt: new Date().toISOString(),
        totalCitations: comparisonData.length,
        analyzedCitations: comparisonData.filter(item => item.status !== 'error').length,
        matchedCitations: comparisonData.filter(item => item.status === 'match').length,
        matchRate: comparisonData.length > 0 ? Math.round((comparisonData.filter(item => item.status === 'match').length / comparisonData.length) * 100) : 0,
        citations: comparisonData.map(item => ({
            site: item.citation.site,
            url: item.citation.url,
            status: item.status,
            matchPercentage: item.comparison?.matchPercentage || 0,
            campaignData: item.citation,
            scrapedData: item.scraped
        }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citation-stats-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Stats report exported successfully', 'success');
}

// Update campaign data from scraped data
async function updateCampaignDataFromScraped() {
    if (!currentDetailCitation || !currentDetailCitation.scraped) {
        showNotification('No scraped data available to update', 'error');
        return;
    }
    
    try {
        const scrapedData = currentDetailCitation.scraped;
        const citationIndex = citationsData.findIndex(c => c.site === currentDetailCitation.citation.site);
        
        if (citationIndex !== -1) {
            // Update citation with scraped data
            citationsData[citationIndex] = {
                ...citationsData[citationIndex],
                businessName: scrapedData.businessName,
                address: scrapedData.address,
                phone: scrapedData.phone,
                website: scrapedData.website,
                category: scrapedData.category
            };
            
            // Save to Firestore
            const userDocRef = doc(db, 'CampaignData', currentUser.uid);
            await updateDoc(userDocRef, {
                citations: citationsData,
                updatedAt: serverTimestamp()
            });
            
            // Update comparison data
            const comparisonIndex = comparisonData.findIndex(item => item.citation.site === currentDetailCitation.citation.site);
            if (comparisonIndex !== -1) {
                const newComparison = compareData(citationsData[citationIndex], scrapedData);
                comparisonData[comparisonIndex] = {
                    citation: citationsData[citationIndex],
                    scraped: scrapedData,
                    comparison: newComparison,
                    status: newComparison.overallMatch ? 'match' : 'mismatch'
                };
            }
            
            // Refresh UI
            populateComparisonTable();
            updateOverviewStats();
            
            showNotification('Campaign data updated successfully', 'success');
            document.getElementById('detail-modal').style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating campaign data:', error);
        showNotification('Failed to update campaign data', 'error');
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

// Make functions globally available
window.showDetailModal = showDetailModal;
window.refreshCitation = refreshCitation; 