/**
 * SF2 Mod Store - Public Website JavaScript
 * Handles item display, search, filtering, and modal functionality
 */

// Import Firebase modules from global scope
const { collection, query, getDocs, orderBy, limit, startAfter, where, ref, getDownloadURL } = window.firebaseModules;
const db = window.db;
const storage = window.storage;

// State management
let allItems = [];
let displayedItems = [];
let lastVisible = null;
let isLoading = false;

// DOM Elements
const itemsGrid = document.getElementById('itemsGrid');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const characterFilter = document.getElementById('characterFilter');
const sortBy = document.getElementById('sortBy');
const resetFiltersBtn = document.getElementById('resetFilters');
const loadMoreBtn = document.getElementById('loadMore');
const itemModal = document.getElementById('itemModal');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModal');
const totalItemsEl = document.getElementById('totalItems');

/**
 * Initialize the application
 */
async function init() {
    try {
        showLoading(true);
        await loadItems();
        setupEventListeners();
        showLoading(false);
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to load items. Please refresh the page.');
        showLoading(false);
    }
}

/**
 * Load items from Firestore
 */
async function loadItems() {
    try {
        const itemsRef = collection(db, 'items');
        const q = query(itemsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        allItems = [];
        querySnapshot.forEach((doc) => {
            allItems.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update total items count
        if (totalItemsEl) {
            totalItemsEl.textContent = `${allItems.length}+`;
        }
        
        displayedItems = [...allItems];
        renderItems();
    } catch (error) {
        console.error('Error loading items:', error);
        throw error;
    }
}

/**
 * Render items to the grid
 */
function renderItems() {
    if (displayedItems.length === 0) {
        itemsGrid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    itemsGrid.innerHTML = '';
    
    displayedItems.forEach(item => {
        const card = createItemCard(item);
        itemsGrid.appendChild(card);
    });
}

/**
 * Create an item card element
 */
function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.onclick = () => openItemModal(item);
    
    // Format file size
    const fileSize = formatFileSize(item.fileSize || 0);
    
    // Create tags HTML
    const tagsHTML = item.tags && item.tags.length > 0
        ? item.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')
        : '';
    
    card.innerHTML = `
        <img src="${item.previewUrl || 'https://via.placeholder.com/300x300?text=No+Image'}" 
             alt="${item.title}" 
             class="item-image"
             onerror="this.src='https://via.placeholder.com/300x300?text=Image+Not+Found'">
        <div class="item-content">
            <span class="item-category">${item.category}</span>
            <h3 class="item-title">${item.title}</h3>
            ${item.character ? `<p class="item-character"><i class="fas fa-user"></i> ${capitalizeFirst(item.character)}</p>` : ''}
            ${tagsHTML ? `<div class="item-tags">${tagsHTML}</div>` : ''}
            <div class="item-footer">
                <span class="item-size"><i class="fas fa-file-archive"></i> ${fileSize}</span>
                <span class="item-download"><i class="fas fa-download"></i> Download</span>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Open item detail modal
 */
function openItemModal(item) {
    const fileSize = formatFileSize(item.fileSize || 0);
    const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A';
    
    const tagsHTML = item.tags && item.tags.length > 0
        ? item.tags.map(tag => `<span class="item-category">${tag}</span>`).join(' ')
        : '';
    
    modalBody.innerHTML = `
        <img src="${item.previewUrl || 'https://via.placeholder.com/600x400?text=No+Image'}" 
             alt="${item.title}" 
             class="modal-image"
             onerror="this.src='https://via.placeholder.com/600x400?text=Image+Not+Found'">
        <h2 class="modal-title">${item.title}</h2>
        <div class="modal-meta">
            <span class="item-category">${item.category}</span>
            ${item.character ? `<span class="item-category">${capitalizeFirst(item.character)}</span>` : ''}
            <span class="item-size"><i class="fas fa-calendar"></i> ${createdDate}</span>
            <span class="item-size"><i class="fas fa-file-archive"></i> ${fileSize}</span>
        </div>
        ${tagsHTML ? `<div class="modal-meta">${tagsHTML}</div>` : ''}
        ${item.description ? `<p class="modal-description">${item.description}</p>` : ''}
        <div class="modal-actions">
            <button class="btn btn-primary" onclick="downloadFile('${item.downloadUrl}', '${item.title}')">
                <i class="fas fa-download"></i> Download File
            </button>
            <button class="btn btn-secondary" onclick="closeModal()">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
    `;
    
    itemModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close modal
 */
function closeModal() {
    itemModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

/**
 * Download file
 */
function downloadFile(url, filename) {
    if (!url) {
        alert('Download URL not available');
        return;
    }
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Filter and search items
 */
function filterItems() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const categoryValue = categoryFilter.value.toLowerCase();
    const characterValue = characterFilter.value.toLowerCase();
    
    displayedItems = allItems.filter(item => {
        // Search filter
        const matchesSearch = !searchTerm || 
            item.title.toLowerCase().includes(searchTerm) ||
            (item.description && item.description.toLowerCase().includes(searchTerm)) ||
            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        
        // Category filter
        const matchesCategory = !categoryValue || item.category.toLowerCase() === categoryValue;
        
        // Character filter
        const matchesCharacter = !characterValue || 
            (item.character && item.character.toLowerCase() === characterValue);
        
        return matchesSearch && matchesCategory && matchesCharacter;
    });
    
    sortItems();
    renderItems();
}

/**
 * Sort items
 */
function sortItems() {
    const sortValue = sortBy.value;
    
    switch (sortValue) {
        case 'newest':
            displayedItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            break;
        case 'oldest':
            displayedItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            break;
        case 'name':
            displayedItems.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'size':
            displayedItems.sort((a, b) => (a.fileSize || 0) - (b.fileSize || 0));
            break;
    }
}

/**
 * Reset all filters
 */
function resetFilters() {
    searchInput.value = '';
    categoryFilter.value = '';
    characterFilter.value = '';
    sortBy.value = 'newest';
    filterItems();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search and filter
    searchInput.addEventListener('input', debounce(filterItems, 300));
    categoryFilter.addEventListener('change', filterItems);
    characterFilter.addEventListener('change', filterItems);
    sortBy.addEventListener('change', () => {
        sortItems();
        renderItems();
    });
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Modal
    closeModalBtn.addEventListener('click', closeModal);
    itemModal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    
    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && itemModal.classList.contains('active')) {
            closeModal();
        }
    });
}

/**
 * Show/hide loading spinner
 */
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    itemsGrid.style.display = show ? 'none' : 'grid';
}

/**
 * Show error message
 */
function showError(message) {
    itemsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--error);">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>${message}</h3>
        </div>
    `;
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Debounce function for search
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally accessible
window.closeModal = closeModal;
window.downloadFile = downloadFile;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
