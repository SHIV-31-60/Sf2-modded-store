/**
 * SF2 Mod Store - Admin Panel JavaScript
 * Handles authentication, file uploads, and item management
 */

// Import Firebase modules and config
import { COLLECTIONS, STORAGE_PATHS, FILE_LIMITS } from './firebase-config.js';

const { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    orderBy,
    limit,
    where,
    ref, 
    uploadBytesResumable, 
    getDownloadURL,
    deleteObject
} = window.firebaseModules;

const auth = window.auth;
const db = window.db;
const storage = window.storage;

// State
let currentUser = null;
let allItems = [];
let currentEditItem = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminEmail = document.getElementById('adminEmail');

/**
 * Initialize admin panel
 */
function init() {
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showDashboard();
        } else {
            showLogin();
        }
    });
    
    setupEventListeners();
}

/**
 * Show login screen
 */
function showLogin() {
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';
}

/**
 * Show dashboard
 */
async function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'flex';
    
    if (adminEmail && currentUser) {
        adminEmail.textContent = currentUser.email;
    }
    
    // Load dashboard data
    await loadDashboardData();
}

/**
 * Handle login
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginError.style.display = 'none';
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Invalid email or password';
        loginError.style.display = 'block';
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await signOut(auth);
        currentUser = null;
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });
    
    // Add item form
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddItem);
    }
    
    const resetFormBtn = document.getElementById('resetForm');
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', resetAddForm);
    }
    
    // File inputs
    const previewInput = document.getElementById('itemPreview');
    if (previewInput) {
        previewInput.addEventListener('change', handlePreviewSelect);
    }
    
    const fileInput = document.getElementById('itemFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Edit modal
    const closeEditModalBtn = document.getElementById('closeEditModal');
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', closeEditModal);
    }
    
    const cancelEditBtn = document.getElementById('cancelEdit');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditModal);
    }
    
    const editItemForm = document.getElementById('editItemForm');
    if (editItemForm) {
        editItemForm.addEventListener('submit', handleEditItem);
    }
    
    // Search in manage items
    const manageSearch = document.getElementById('manageSearch');
    if (manageSearch) {
        manageSearch.addEventListener('input', debounce(filterManageItems, 300));
    }
}

/**
 * Switch between sections
 */
function switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');
    
    // Update sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}Section`)?.classList.add('active');
    
    // Update title
    const titles = {
        'dashboard': 'Dashboard',
        'add-item': 'Add New Item',
        'manage-items': 'Manage Items',
        'categories': 'Categories'
    };
    document.getElementById('sectionTitle').textContent = titles[sectionName] || 'Dashboard';
    
    // Load section-specific data
    if (sectionName === 'manage-items') {
        loadManageItems();
    } else if (sectionName === 'categories') {
        loadCategoriesData();
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        // Load all items
        const itemsRef = collection(db, COLLECTIONS.ITEMS);
        const querySnapshot = await getDocs(itemsRef);
        
        allItems = [];
        let totalSize = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allItems.push({
                id: doc.id,
                ...data
            });
            totalSize += data.fileSize || 0;
        });
        
        // Update stats
        document.getElementById('totalItemsCount').textContent = allItems.length;
        document.getElementById('storageUsed').textContent = formatFileSize(totalSize);
        
        // Load recent items
        loadRecentItems();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

/**
 * Load recent items
 */
function loadRecentItems() {
    const recentList = document.getElementById('recentItemsList');
    if (!recentList) return;
    
    const recentItems = [...allItems]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5);
    
    if (recentItems.length === 0) {
        recentList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No items uploaded yet</p>';
        return;
    }
    
    recentList.innerHTML = recentItems.map(item => `
        <div class="recent-item">
            <img src="${item.previewUrl || 'https://via.placeholder.com/60'}" 
                 alt="${item.title}" 
                 class="recent-item-image"
                 onerror="this.src='https://via.placeholder.com/60'">
            <div class="recent-item-info">
                <h4>${item.title}</h4>
                <p>${item.category} • ${formatFileSize(item.fileSize || 0)}</p>
            </div>
        </div>
    `).join('');
}

/**
 * Handle preview image selection
 */
function handlePreviewSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
        alert('Please select a PNG or JPG image');
        e.target.value = '';
        return;
    }
    
    // Validate file size
    if (file.size > FILE_LIMITS.PREVIEW_IMAGE) {
        alert(`Preview image must be less than ${formatFileSize(FILE_LIMITS.PREVIEW_IMAGE)}`);
        e.target.value = '';
        return;
    }
    
    // Show preview
    const preview = document.getElementById('previewImagePreview');
    if (preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Handle download file selection
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > FILE_LIMITS.DOWNLOAD_FILE) {
        alert(`File must be less than ${formatFileSize(FILE_LIMITS.DOWNLOAD_FILE)}`);
        e.target.value = '';
        return;
    }
    
    // Show file info
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        fileInfo.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--success);"></i>
            ${file.name} (${formatFileSize(file.size)})
        `;
    }
}

/**
 * Handle add item form submission
 */
async function handleAddItem(e) {
    e.preventDefault();
    
    // Get form data
    const title = document.getElementById('itemTitle').value.trim();
    const category = document.getElementById('itemCategory').value;
    const character = document.getElementById('itemCharacter').value;
    const tags = document.getElementById('itemTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
    const description = document.getElementById('itemDescription').value.trim();
    const previewFile = document.getElementById('itemPreview').files[0];
    const downloadFile = document.getElementById('itemFile').files[0];
    
    if (!title || !category || !previewFile || !downloadFile) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        // Show progress
        showUploadProgress(true);
        updateProgress(0, 'Uploading preview image...');
        
        // Upload preview image
        const previewUrl = await uploadFile(previewFile, STORAGE_PATHS.PREVIEWS, (progress) => {
            updateProgress(progress * 0.4, 'Uploading preview image...');
        });
        
        updateProgress(40, 'Uploading download file...');
        
        // Upload download file
        const downloadUrl = await uploadFile(downloadFile, STORAGE_PATHS.FILES, (progress) => {
            updateProgress(40 + (progress * 0.4), 'Uploading download file...');
        });
        
        updateProgress(80, 'Saving to database...');
        
        // Save to Firestore
        const itemData = {
            title,
            category,
            character: character || null,
            tags,
            description: description || null,
            previewUrl,
            downloadUrl,
            fileSize: downloadFile.size,
            fileName: downloadFile.name,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        await addDoc(collection(db, COLLECTIONS.ITEMS), itemData);
        
        updateProgress(100, 'Upload complete!');
        
        // Reset form
        setTimeout(() => {
            showUploadProgress(false);
            resetAddForm();
            alert('Item added successfully!');
            loadDashboardData();
        }, 1000);
        
    } catch (error) {
        console.error('Error adding item:', error);
        alert('Failed to add item. Please try again.');
        showUploadProgress(false);
    }
}

/**
 * Upload file to Firebase Storage
 */
function uploadFile(file, folder, onProgress) {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `${folder}/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            },
            (error) => {
                console.error('Upload error:', error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

/**
 * Show/hide upload progress
 */
function showUploadProgress(show) {
    const progress = document.getElementById('uploadProgress');
    if (progress) {
        progress.style.display = show ? 'block' : 'none';
    }
}

/**
 * Update progress bar
 */
function updateProgress(percent, text) {
    const fill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (fill) fill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = text;
}

/**
 * Reset add item form
 */
function resetAddForm() {
    document.getElementById('addItemForm').reset();
    document.getElementById('previewImagePreview').innerHTML = '';
    document.getElementById('fileInfo').innerHTML = '';
}

/**
 * Load items for management
 */
async function loadManageItems() {
    const manageList = document.getElementById('manageItemsList');
    if (!manageList) return;
    
    if (allItems.length === 0) {
        await loadDashboardData();
    }
    
    renderManageItems(allItems);
}

/**
 * Render manage items
 */
function renderManageItems(items) {
    const manageList = document.getElementById('manageItemsList');
    if (!manageList) return;
    
    if (items.length === 0) {
        manageList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No items found</p>';
        return;
    }
    
    manageList.innerHTML = items.map(item => `
        <div class="manage-item-card">
            <img src="${item.previewUrl || 'https://via.placeholder.com/100'}" 
                 alt="${item.title}" 
                 class="manage-item-image"
                 onerror="this.src='https://via.placeholder.com/100'">
            <div class="manage-item-info">
                <h3>${item.title}</h3>
                <div class="manage-item-meta">
                    <span><i class="fas fa-folder"></i> ${item.category}</span>
                    ${item.character ? `<span><i class="fas fa-user"></i> ${capitalizeFirst(item.character)}</span>` : ''}
                    <span><i class="fas fa-file"></i> ${formatFileSize(item.fileSize || 0)}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="manage-item-actions">
                <button class="btn btn-icon btn-edit" onclick="openEditModal('${item.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-delete" onclick="deleteItem('${item.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Filter manage items
 */
function filterManageItems() {
    const searchTerm = document.getElementById('manageSearch').value.toLowerCase().trim();
    
    const filtered = allItems.filter(item => {
        return item.title.toLowerCase().includes(searchTerm) ||
               item.category.toLowerCase().includes(searchTerm) ||
               (item.character && item.character.toLowerCase().includes(searchTerm)) ||
               (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
    });
    
    renderManageItems(filtered);
}

/**
 * Open edit modal
 */
function openEditModal(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;
    
    currentEditItem = item;
    
    // Populate form
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editTitle').value = item.title;
    document.getElementById('editCategory').value = item.category;
    document.getElementById('editCharacter').value = item.character || '';
    document.getElementById('editTags').value = item.tags ? item.tags.join(', ') : '';
    document.getElementById('editDescription').value = item.description || '';
    
    // Show modal
    document.getElementById('editModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close edit modal
 */
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentEditItem = null;
}

/**
 * Handle edit item
 */
async function handleEditItem(e) {
    e.preventDefault();
    
    const itemId = document.getElementById('editItemId').value;
    const title = document.getElementById('editTitle').value.trim();
    const category = document.getElementById('editCategory').value;
    const character = document.getElementById('editCharacter').value;
    const tags = document.getElementById('editTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
    const description = document.getElementById('editDescription').value.trim();
    
    try {
        const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
        await updateDoc(itemRef, {
            title,
            category,
            character: character || null,
            tags,
            description: description || null,
            updatedAt: Date.now()
        });
        
        alert('Item updated successfully!');
        closeEditModal();
        await loadDashboardData();
        loadManageItems();
        
    } catch (error) {
        console.error('Error updating item:', error);
        alert('Failed to update item. Please try again.');
    }
}

/**
 * Delete item
 */
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        return;
    }
    
    try {
        const item = allItems.find(i => i.id === itemId);
        if (!item) return;
        
        // Delete from Firestore
        await deleteDoc(doc(db, COLLECTIONS.ITEMS, itemId));
        
        // Note: Deleting files from Storage requires additional permissions
        // For now, we'll just delete the Firestore document
        // In production, implement Cloud Functions to delete files automatically
        
        alert('Item deleted successfully!');
        await loadDashboardData();
        loadManageItems();
        
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item. Please try again.');
    }
}

/**
 * Load categories data
 */
function loadCategoriesData() {
    const categories = {
        texture: 0,
        file: 0,
        zip: 0,
        weapon: 0,
        armor: 0,
        character: 0
    };
    
    allItems.forEach(item => {
        if (categories.hasOwnProperty(item.category)) {
            categories[item.category]++;
        }
    });
    
    document.getElementById('textureCount').textContent = `${categories.texture} items`;
    document.getElementById('fileCount').textContent = `${categories.file} items`;
    document.getElementById('zipCount').textContent = `${categories.zip} items`;
    document.getElementById('weaponCount').textContent = `${categories.weapon} items`;
    document.getElementById('armorCount').textContent = `${categories.armor} items`;
    document.getElementById('characterCount').textContent = `${categories.character} items`;
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
 * Debounce function
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
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteItem = deleteItem;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
