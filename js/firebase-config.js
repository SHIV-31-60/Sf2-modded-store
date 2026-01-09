/**
 * Firebase Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Create a new project or select existing one
 * 3. Go to Project Settings > General
 * 4. Scroll down to "Your apps" section
 * 5. Click on Web icon (</>) to add a web app
 * 6. Register your app and copy the configuration
 * 7. Replace the values below with your Firebase project configuration
 * 
 * IMPORTANT: This file contains your Firebase configuration.
 * For production, consider using environment variables or Firebase Hosting config.
 */

export const firebaseConfig = {
  apiKey: "AIzaSyCyMqLASDipzP4Pze6ZUcJg15Ni0gd7RUI",
  authDomain: "sf2-modded-store.firebaseapp.com",
  projectId: "sf2-modded-store",
  storageBucket: "sf2-modded-store.firebasestorage.app",
  messagingSenderId: "421523351970",
  appId: "1:421523351970:web:6ed66f11db833b2601aafb",
  measurementId: "G-PYB6NT29JY"
};

/**
 * FIREBASE SERVICES USED:
 * 
 * 1. Firebase Authentication
 *    - Used for admin login
 *    - Go to Firebase Console > Authentication > Sign-in method
 *    - Enable "Email/Password" provider
 *    - Add admin user: Authentication > Users > Add user
 * 
 * 2. Cloud Firestore
 *    - Database for storing item metadata
 *    - Go to Firebase Console > Firestore Database > Create database
 *    - Start in TEST MODE (change to production mode later with security rules)
 *    - Collection name: "items"
 * 
 * 3. Firebase Storage
 *    - Store images and download files
 *    - Go to Firebase Console > Storage > Get started
 *    - Start in TEST MODE (change to production mode later with security rules)
 *    - Folders: /previews/ and /files/
 * 
 * 4. Firebase Hosting (Optional for deployment)
 *    - Deploy your website to Firebase
 *    - Install Firebase CLI: npm install -g firebase-tools
 *    - Login: firebase login
 *    - Initialize: firebase init hosting
 *    - Deploy: firebase deploy
 */

// Firestore Collection Names
export const COLLECTIONS = {
    ITEMS: 'items',
    CATEGORIES: 'categories',
    STATS: 'stats'
};

// Storage Folder Paths
export const STORAGE_PATHS = {
    PREVIEWS: 'previews',
    FILES: 'files'
};

// File Size Limits (in bytes)
export const FILE_LIMITS = {
    PREVIEW_IMAGE: 2 * 1024 * 1024,  // 2MB
    DOWNLOAD_FILE: 5 * 1024 * 1024   // 5MB
};

// Pagination Settings
export const PAGINATION = {
    ITEMS_PER_PAGE: 12,
    LOAD_MORE_COUNT: 12
};

// Default values
export const DEFAULTS = {
    NO_IMAGE: 'https://via.placeholder.com/300x300?text=No+Image',
    CATEGORIES: [
        'texture',
        'file',
        'zip',
        'weapon',
        'armor',
        'character'
    ],
    CHARACTERS: [
        'shadow',
        'hermit',
        'butcher',
        'wasp',
        'lynx',
        'titan',
        'shogun'
    ]
};