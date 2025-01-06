// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

const userId = tg.initDataUnsafe?.user?.id;
if (!userId) {
    alert("User ID not found! Ensure you are logged in to Telegram.");
    throw new Error("User ID is required to save airdrop data.");
}

// Initialize state
let airdrops = [];
let selectedAirdropId = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 5;
let currentSort = 'newest';
let currentFilter = '';
let activeTags = new Set();
let currentViewMode = 'list';
let isFullScreenMode = false;

// DOM Elements
const airdropForm = document.getElementById('airdropForm');
const airdropsContainer = document.getElementById('airdropsContainer');
const confirmModal = document.getElementById('confirmModal');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const resetButton = document.getElementById('resetButton');
const toast = document.getElementById('toast');
const searchInput = document.getElementById('searchAirdrops');
const sortSelect = document.getElementById('sortDrops');
const tagsContainer = document.getElementById('tagsContainer');
const paginationContainer = document.getElementById('pagination');
const totalAirdropsElement = document.getElementById('totalAirdrops');
const todayAirdropsElement = document.getElementById('todayAirdrops');
const themeToggle = document.getElementById('themeToggle');
const viewModeToggle = document.getElementById('viewModeToggle');
const expandAllButton = document.getElementById('expandAll');

// Create full-screen view container
const fullScreenView = document.createElement('div');
fullScreenView.className = 'full-screen-view';
fullScreenView.innerHTML = `
    <div class="full-screen-header">
        <h2 class="full-screen-title">All Airdrops</h2>
        <button class="close-full-screen">×</button>
    </div>
    <div class="full-screen-content">
        <div class="airdrops-container"></div>
    </div>
`;
document.body.appendChild(fullScreenView);

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Load airdrops from localStorage
function loadAirdrops() {
    const savedData = JSON.parse(localStorage.getItem('airdropStorage')) || {};
    airdrops = savedData[userId] || [];
    updateStats();
    renderTags();
    renderAirdrops();
}


// Save airdrops to localStorage
function saveAirdrops() {
    const savedData = JSON.parse(localStorage.getItem('airdropStorage')) || {};
    savedData[userId] = airdrops;
    localStorage.setItem('airdropStorage', JSON.stringify(savedData));
    updateStats();
}

// Update statistics
function updateStats() {
    totalAirdropsElement.textContent = airdrops.length;
    
    const today = new Date().toDateString();
    const todayCount = airdrops.filter(airdrop => 
        new Date(airdrop.timestamp).toDateString() === today
    ).length;
    
    todayAirdropsElement.textContent = todayCount;
}

// Extract and render tags
function renderTags() {
    const tags = new Set();
    airdrops.forEach(airdrop => {
        if (airdrop.tags) {
            airdrop.tags.forEach(tag => tags.add(tag));
        }
    });

    tagsContainer.innerHTML = Array.from(tags).map(tag => `
        <span class="tag ${activeTags.has(tag) ? 'active' : ''}" data-tag="${tag}">
            ${tag}
        </span>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.tag').forEach(tagElement => {
        tagElement.addEventListener('click', () => {
            const tag = tagElement.dataset.tag;
            if (activeTags.has(tag)) {
                activeTags.delete(tag);
            } else {
                activeTags.add(tag);
            }
            renderTags();
            renderAirdrops();
        });
    });
}

// Show toast message
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Filter and sort airdrops
function getFilteredAndSortedAirdrops() {
    let filtered = [...airdrops];

    // Apply search filter
    if (currentFilter) {
        const searchTerm = currentFilter.toLowerCase();
        filtered = filtered.filter(airdrop => 
            airdrop.name.toLowerCase().includes(searchTerm) ||
            airdrop.link.toLowerCase().includes(searchTerm)
        );
    }

    // Apply tag filters
    if (activeTags.size > 0) {
        filtered = filtered.filter(airdrop => 
            airdrop.tags && airdrop.tags.some(tag => activeTags.has(tag))
        );
    }

    // Apply sorting
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'newest':
                return b.timestamp - a.timestamp;
            case 'oldest':
                return a.timestamp - b.timestamp;
            case 'az':
                return a.name.localeCompare(b.name);
            case 'za':
                return b.name.localeCompare(a.name);
            case 'popular':
                return (b.visits || 0) - (a.visits || 0);
            default:
                return 0;
        }
    });

    return filtered;
}

// Render pagination
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    let paginationHTML = '';

    if (totalPages > 1) {
        paginationHTML += `
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">←</button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>
            `;
        }

        paginationHTML += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">→</button>
        `;
    }

    paginationContainer.innerHTML = paginationHTML;

    // Add click handlers
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                currentPage = parseInt(btn.dataset.page);
                renderAirdrops();
            }
        });
    });
}

// Track airdrop visits
function trackVisit(airdropId) {
    const airdrop = airdrops.find(a => a.id === airdropId);
    if (airdrop) {
        airdrop.visits = (airdrop.visits || 0) + 1;
        saveAirdrops();
    }
}

// Render airdrops
function renderAirdrops() {
    const filteredAirdrops = getFilteredAndSortedAirdrops();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageAirdrops = filteredAirdrops.slice(startIndex, endIndex);

    if (pageAirdrops.length === 0) {
        airdropsContainer.innerHTML = `
            <div class="empty-state">
                <p>No airdrops found</p>
                <p>Try adjusting your filters or adding new airdrops</p>
            </div>
        `;
    } else {
        airdropsContainer.innerHTML = pageAirdrops.map(airdrop => `
            <div class="airdrop-item">
                <div class="airdrop-info">
                    <div class="airdrop-name">${airdrop.name}</div>
                    <div class="airdrop-meta">
                        <span>${formatDate(airdrop.timestamp)}</span>
                        ${airdrop.visits ? `<span>👁 ${airdrop.visits} visits</span>` : ''}
                        ${airdrop.tags ? airdrop.tags.map(tag => 
                            `<span class="airdrop-tag">${tag}</span>`
                        ).join('') : ''}
                    </div>
                </div>
                <div class="airdrop-actions">
                    <button class="btn-go" onclick="window.open('${airdrop.link}', '_blank'); trackVisit('${airdrop.id}')">
                        Go to Airdrop →
                    </button>
                    <button class="btn-icon delete-btn" data-id="${airdrop.id}">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    renderPagination(filteredAirdrops.length);

    // Add delete button listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedAirdropId = e.target.dataset.id;
            showModal();
        });
    });
}

// Format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show modal
function showModal() {
    confirmModal.classList.add('active');
}

// Hide modal
function hideModal() {
    confirmModal.classList.remove('active');
}

// Add new airdrop
function addAirdrop(name, link) {
    // Extract tags from name (e.g., "Name #tag1 #tag2")
    const tags = [];
    const nameWithoutTags = name.replace(/#\w+/g, match => {
        tags.push(match.slice(1));
        return '';
    }).trim();

    const newAirdrop = {
        id: Date.now().toString(),
        name: nameWithoutTags,
        link,
        timestamp: Date.now(),
        tags,
        visits: 0
    };
    
    airdrops.push(newAirdrop);
    saveAirdrops();
    renderTags();
    renderAirdrops();
    showToast('Airdrop added successfully');
}

// Delete airdrop
function deleteAirdrop(id) {
    airdrops = airdrops.filter(airdrop => airdrop.id !== id);
    saveAirdrops();
    renderTags();
    renderAirdrops();
    showToast('Airdrop deleted successfully');
}

// Reset all airdrops
function resetAirdrops() {
    airdrops = [];
    saveAirdrops();
    renderTags();
    renderAirdrops();
    showToast('All airdrops have been reset');
}

// Toggle view mode (grid/list)
function toggleViewMode() {
    currentViewMode = currentViewMode === 'list' ? 'grid' : 'list';
    document.documentElement.setAttribute('data-view', currentViewMode);
    renderAirdrops();
}

// Show full-screen view
function showFullScreenView() {
    const container = fullScreenView.querySelector('.airdrops-container');
    container.innerHTML = airdrops.map(airdrop => `
        <div class="airdrop-item">
            <div class="airdrop-info">
                <div class="airdrop-name">${airdrop.name}</div>
                <div class="airdrop-meta">
                    <span>${formatDate(airdrop.timestamp)}</span>
                    ${airdrop.visits ? `<span>👁 ${airdrop.visits} visits</span>` : ''}
                    ${airdrop.tags ? airdrop.tags.map(tag => 
                        `<span class="airdrop-tag">${tag}</span>`
                    ).join('') : ''}
                </div>
            </div>
            <div class="airdrop-actions">
                <button class="btn-go" onclick="window.open('${airdrop.link}', '_blank'); trackVisit('${airdrop.id}')">
                    Go to Airdrop →
                </button>
                <button class="btn-icon delete-btn" data-id="${airdrop.id}">🗑️</button>
            </div>
        </div>
    `).join('');

    // Add delete button listeners
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedAirdropId = e.target.dataset.id;
            showModal();
        });
    });

    fullScreenView.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Hide full-screen view
function hideFullScreenView() {
    fullScreenView.classList.remove('active');
    document.body.style.overflow = '';
}

// Initialize view mode
function initializeViewMode() {
    document.documentElement.setAttribute('data-view', currentViewMode);
}

// Check channel membership
async function checkChannelMembership() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) return false;

        // Create a modal for channel join request
        const channelModal = document.createElement('div');
        channelModal.className = 'modal active';
        channelModal.innerHTML = `
            <div class="modal-content">
                <h3>Join Our Channel</h3>
                <p>Please join our official channel to use this app:</p>
                <div class="channel-info">
                    <span class="channel-name">${TELEGRAM_CHANNEL}</span>
                </div>
                <div class="modal-actions">
                    <a href="${CHANNEL_LINK}" class="btn-primary" target="_blank">Join Channel</a>
                </div>
            </div>
        `;
        document.body.appendChild(channelModal);

        // Check membership status periodically
        const checkInterval = setInterval(async () => {
            try {
                const isMember = await tg.sendData('check_membership');
                if (isMember === 'true') {
                    clearInterval(checkInterval);
                    channelModal.remove();
                    showToast('Welcome to ARD Manager!');
                }
            } catch (error) {
                console.error('Error checking membership:', error);
            }
        }, 2000);

        return false;
    } catch (error) {
        console.error('Error checking channel membership:', error);
        return false;
    }
}

// Event Listeners
airdropForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('airdropName');
    const linkInput = document.getElementById('airdropLink');
    
    addAirdrop(nameInput.value, linkInput.value);
    
    nameInput.value = '';
    linkInput.value = '';
});

searchInput.addEventListener('input', (e) => {
    currentFilter = e.target.value;
    currentPage = 1;
    renderAirdrops();
});

sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderAirdrops();
});

themeToggle.addEventListener('click', toggleTheme);

confirmDeleteBtn.addEventListener('click', () => {
    if (selectedAirdropId) {
        deleteAirdrop(selectedAirdropId);
        hideModal();
        selectedAirdropId = null;
    }
});

cancelDeleteBtn.addEventListener('click', () => {
    hideModal();
    selectedAirdropId = null;
});

resetButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all airdrops?')) {
        resetAirdrops();
    }
});

// Close modal when clicking outside
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        hideModal();
        selectedAirdropId = null;
    }
});

viewModeToggle.addEventListener('click', toggleViewMode);
expandAllButton.addEventListener('click', showFullScreenView);
fullScreenView.querySelector('.close-full-screen').addEventListener('click', hideFullScreenView);

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    initializeViewMode();
    
    // Show intro animation
    const introAnimation = document.querySelector('.intro-animation');
    setTimeout(() => {
        introAnimation.style.opacity = '0';
        setTimeout(() => {
            introAnimation.style.display = 'none';
            // Check channel membership after intro
            checkChannelMembership();
        }, 1000);
    }, 2000);

    loadAirdrops();
    tg.ready();
});
