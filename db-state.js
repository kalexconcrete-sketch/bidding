// ============================================================================
// DON SMITH CONCRETE BID PRO - Database & State Management
// ============================================================================

// ============================================================================
// 1. UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a UUID v4 identifier
 * @returns {string} UUID string
 */
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Format a number as USD currency
 * @param {number} num - Number to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) {
        return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

/**
 * Format a date for display
 * @param {Date|string|number} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
function formatDate(date, options = {}) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Format bytes to human-readable file size
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (!bytes || isNaN(bytes)) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Debounce a function call
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }

    if (obj instanceof Object) {
        const copy = {};
        Object.keys(obj).forEach(key => {
            copy[key] = deepClone(obj[key]);
        });
        return copy;
    }

    return obj;
}

// ============================================================================
// 2. DATABASE MANAGER (IndexedDB Wrapper)
// ============================================================================

const DB_NAME = 'DonSmithConcreteBidPro';
const DB_VERSION = 1;

const DatabaseManager = {
    db: null,
    isInitialized: false,
    initPromise: null,

    /**
     * Store definitions with their indexes
     */
    stores: {
        projects: {
            keyPath: 'id',
            indexes: [
                { name: 'customerId', keyPath: 'customerId', unique: false },
                { name: 'status', keyPath: 'status', unique: false },
                { name: 'type', keyPath: 'type', unique: false },
                { name: 'dueDate', keyPath: 'dueDate', unique: false },
                { name: 'createdAt', keyPath: 'createdAt', unique: false }
            ]
        },
        bids: {
            keyPath: 'id',
            indexes: [
                { name: 'projectId', keyPath: 'projectId', unique: false },
                { name: 'status', keyPath: 'status', unique: false },
                { name: 'createdAt', keyPath: 'createdAt', unique: false }
            ]
        },
        customers: {
            keyPath: 'id',
            indexes: [
                { name: 'companyName', keyPath: 'companyName', unique: false },
                { name: 'email', keyPath: 'email', unique: false },
                { name: 'createdAt', keyPath: 'createdAt', unique: false }
            ]
        },
        suppliers: {
            keyPath: 'id',
            indexes: [
                { name: 'name', keyPath: 'name', unique: false },
                { name: 'category', keyPath: 'category', unique: false },
                { name: 'rating', keyPath: 'rating', unique: false }
            ]
        },
        materials: {
            keyPath: 'id',
            indexes: [
                { name: 'category', keyPath: 'category', unique: false },
                { name: 'name', keyPath: 'name', unique: false },
                { name: 'supplierId', keyPath: 'supplierId', unique: false }
            ]
        },
        photos: {
            keyPath: 'id',
            indexes: [
                { name: 'projectId', keyPath: 'projectId', unique: false },
                { name: 'createdAt', keyPath: 'createdAt', unique: false }
            ]
        },
        voiceNotes: {
            keyPath: 'id',
            indexes: [
                { name: 'projectId', keyPath: 'projectId', unique: false },
                { name: 'createdAt', keyPath: 'createdAt', unique: false }
            ]
        },
        communications: {
            keyPath: 'id',
            indexes: [
                { name: 'customerId', keyPath: 'customerId', unique: false },
                { name: 'type', keyPath: 'type', unique: false },
                { name: 'date', keyPath: 'date', unique: false }
            ]
        },
        settings: {
            keyPath: 'key',
            indexes: []
        }
    },

    /**
     * Initialize the database with schema
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        // Return existing promise if already initializing
        if (this.initPromise) {
            return this.initPromise;
        }

        // Return existing db if already initialized
        if (this.isInitialized && this.db) {
            return this.db;
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                this.initPromise = null;
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                console.log('Database initialized successfully');

                // Handle connection close
                this.db.onclose = () => {
                    this.isInitialized = false;
                    this.db = null;
                    this.initPromise = null;
                };

                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores and indexes
                Object.entries(this.stores).forEach(([storeName, config]) => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, {
                            keyPath: config.keyPath
                        });

                        // Create indexes
                        config.indexes.forEach(index => {
                            store.createIndex(index.name, index.keyPath, {
                                unique: index.unique
                            });
                        });

                        console.log(`Created store: ${storeName}`);
                    }
                });
            };
        });

        return this.initPromise;
    },

    /**
     * Ensure database is initialized before operations
     * @returns {Promise<IDBDatabase>}
     */
    async ensureDb() {
        if (!this.isInitialized || !this.db) {
            await this.init();
        }
        return this.db;
    },

    /**
     * Add a record to a store
     * @param {string} storeName - Name of the store
     * @param {object} data - Data to add
     * @returns {Promise<string>} ID of added record
     */
    async add(storeName, data) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Auto-generate ID if not provided (except for settings store)
            if (storeName !== 'settings' && !data.id) {
                data.id = generateId();
            }

            // Auto-add timestamps
            if (storeName !== 'settings') {
                const now = new Date().toISOString();
                if (!data.createdAt) {
                    data.createdAt = now;
                }
                data.updatedAt = now;
            }

            const request = store.add(data);

            request.onsuccess = () => {
                resolve(data.id || data.key);
            };

            request.onerror = (event) => {
                console.error(`Error adding to ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Get a record by ID
     * @param {string} storeName - Name of the store
     * @param {string} id - Record ID
     * @returns {Promise<object|null>}
     */
    async get(storeName, id) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = (event) => {
                console.error(`Error getting from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Get all records from a store
     * @param {string} storeName - Name of the store
     * @returns {Promise<array>}
     */
    async getAll(storeName) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = (event) => {
                console.error(`Error getting all from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Update a record in a store
     * @param {string} storeName - Name of the store
     * @param {object} data - Data to update (must include id)
     * @returns {Promise<string>} ID of updated record
     */
    async update(storeName, data) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Auto-update timestamp
            if (storeName !== 'settings') {
                data.updatedAt = new Date().toISOString();
            }

            const request = store.put(data);

            request.onsuccess = () => {
                resolve(data.id || data.key);
            };

            request.onerror = (event) => {
                console.error(`Error updating in ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Delete a record from a store
     * @param {string} storeName - Name of the store
     * @param {string} id - Record ID
     * @returns {Promise<void>}
     */
    async delete(storeName, id) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                console.error(`Error deleting from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Query records by index
     * @param {string} storeName - Name of the store
     * @param {string} indexName - Name of the index
     * @param {*} value - Value to search for
     * @returns {Promise<array>}
     */
    async query(storeName, indexName, value) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = (event) => {
                console.error(`Error querying ${storeName} by ${indexName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Clear all records from a store
     * @param {string} storeName - Name of the store
     * @returns {Promise<void>}
     */
    async clear(storeName) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log(`Cleared store: ${storeName}`);
                resolve();
            };

            request.onerror = (event) => {
                console.error(`Error clearing ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Query records by index with range
     * @param {string} storeName - Name of the store
     * @param {string} indexName - Name of the index
     * @param {IDBKeyRange} range - IDB key range
     * @returns {Promise<array>}
     */
    async queryRange(storeName, indexName, range) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = (event) => {
                console.error(`Error querying range in ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Count records in a store
     * @param {string} storeName - Name of the store
     * @returns {Promise<number>}
     */
    async count(storeName) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error(`Error counting ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Bulk add records to a store
     * @param {string} storeName - Name of the store
     * @param {array} records - Array of records to add
     * @returns {Promise<array>} Array of added IDs
     */
    async bulkAdd(storeName, records) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const ids = [];
            const now = new Date().toISOString();

            records.forEach(data => {
                if (storeName !== 'settings' && !data.id) {
                    data.id = generateId();
                }
                if (storeName !== 'settings') {
                    if (!data.createdAt) data.createdAt = now;
                    data.updatedAt = now;
                }
                store.add(data);
                ids.push(data.id || data.key);
            });

            transaction.oncomplete = () => {
                resolve(ids);
            };

            transaction.onerror = (event) => {
                console.error(`Error bulk adding to ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Export all data from database
     * @returns {Promise<object>}
     */
    async exportAll() {
        const data = {};
        for (const storeName of Object.keys(this.stores)) {
            data[storeName] = await this.getAll(storeName);
        }
        return data;
    },

    /**
     * Import data to database
     * @param {object} data - Data object with store names as keys
     * @returns {Promise<void>}
     */
    async importAll(data) {
        for (const [storeName, records] of Object.entries(data)) {
            if (this.stores[storeName] && Array.isArray(records)) {
                await this.clear(storeName);
                if (records.length > 0) {
                    await this.bulkAdd(storeName, records);
                }
            }
        }
    }
};

// ============================================================================
// 3. STATE MANAGEMENT (Pub/Sub Reactive State)
// ============================================================================

const AppState = {
    /**
     * Internal state storage
     */
    _state: {
        // UI state
        ui: {
            currentView: 'dashboard',
            sidebarOpen: false,
            modalOpen: null,
            loading: false,
            error: null,
            toast: null,
            theme: 'light',
            searchQuery: ''
        },

        // Projects list
        projects: [],

        // Currently selected/editing project
        currentProject: null,

        // Currently selected/editing bid
        currentBid: null,

        // Customers list
        customers: [],

        // Currently selected customer
        currentCustomer: null,

        // Suppliers list
        suppliers: [],

        // Materials catalog
        materials: [],

        // App settings
        settings: {
            companyName: 'Don Smith Concrete',
            defaultOverheadPercent: 15,
            defaultProfitPercent: 10,
            defaultContingencyPercent: 5,
            taxRate: 0,
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            autoSave: true,
            offlineMode: false
        },

        // Sync status
        sync: {
            lastSynced: null,
            pendingChanges: 0,
            isOnline: navigator.onLine
        }
    },

    /**
     * Subscribers map: key -> Set of callback functions
     */
    _subscribers: new Map(),

    /**
     * History for undo functionality
     */
    _history: [],
    _historyIndex: -1,
    _maxHistory: 50,

    /**
     * Subscribe to state changes for a specific key
     * @param {string} key - State key to subscribe to (supports dot notation)
     * @param {Function} callback - Callback function(newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this._subscribers.has(key)) {
            this._subscribers.set(key, new Set());
        }

        this._subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const subscribers = this._subscribers.get(key);
            if (subscribers) {
                subscribers.delete(callback);
                if (subscribers.size === 0) {
                    this._subscribers.delete(key);
                }
            }
        };
    },

    /**
     * Get state value by key (supports dot notation)
     * @param {string} key - State key
     * @returns {*} State value
     */
    getState(key) {
        if (!key) return deepClone(this._state);

        const keys = key.split('.');
        let value = this._state;

        for (const k of keys) {
            if (value === undefined || value === null) {
                return undefined;
            }
            value = value[k];
        }

        return deepClone(value);
    },

    /**
     * Set state value and notify subscribers
     * @param {string} key - State key (supports dot notation)
     * @param {*} value - New value
     * @param {boolean} recordHistory - Whether to record in history
     */
    setState(key, value, recordHistory = false) {
        const keys = key.split('.');
        const oldValue = this.getState(key);

        // Don't update if value hasn't changed
        if (JSON.stringify(oldValue) === JSON.stringify(value)) {
            return;
        }

        // Record history if needed
        if (recordHistory) {
            this._recordHistory(key, oldValue, value);
        }

        // Navigate to the parent and set the value
        let current = this._state;
        for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] === undefined) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = deepClone(value);

        // Notify subscribers
        this._notifySubscribers(key, value, oldValue);
    },

    /**
     * Batch update multiple state values
     * @param {object} updates - Object with key-value pairs to update
     */
    batchUpdate(updates) {
        const notifications = [];

        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this.getState(key);

            if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
                const keys = key.split('.');
                let current = this._state;

                for (let i = 0; i < keys.length - 1; i++) {
                    if (current[keys[i]] === undefined) {
                        current[keys[i]] = {};
                    }
                    current = current[keys[i]];
                }

                current[keys[keys.length - 1]] = deepClone(value);
                notifications.push({ key, value, oldValue });
            }
        });

        // Notify all subscribers after all updates
        notifications.forEach(({ key, value, oldValue }) => {
            this._notifySubscribers(key, value, oldValue);
        });
    },

    /**
     * Notify subscribers of a state change
     * @param {string} key - State key that changed
     * @param {*} newValue - New value
     * @param {*} oldValue - Previous value
     */
    _notifySubscribers(key, newValue, oldValue) {
        // Notify exact key subscribers
        const subscribers = this._subscribers.get(key);
        if (subscribers) {
            subscribers.forEach(callback => {
                try {
                    callback(deepClone(newValue), deepClone(oldValue));
                } catch (error) {
                    console.error('State subscriber error:', error);
                }
            });
        }

        // Notify parent key subscribers (e.g., 'ui' when 'ui.loading' changes)
        const parts = key.split('.');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentKey = parts.slice(0, i).join('.');
            const parentSubscribers = this._subscribers.get(parentKey);
            if (parentSubscribers) {
                const parentValue = this.getState(parentKey);
                parentSubscribers.forEach(callback => {
                    try {
                        callback(parentValue, null);
                    } catch (error) {
                        console.error('State subscriber error:', error);
                    }
                });
            }
        }

        // Notify wildcard subscribers
        const wildcardSubscribers = this._subscribers.get('*');
        if (wildcardSubscribers) {
            wildcardSubscribers.forEach(callback => {
                try {
                    callback(key, deepClone(newValue), deepClone(oldValue));
                } catch (error) {
                    console.error('State subscriber error:', error);
                }
            });
        }
    },

    /**
     * Record state change in history for undo/redo
     */
    _recordHistory(key, oldValue, newValue) {
        // Remove any forward history
        if (this._historyIndex < this._history.length - 1) {
            this._history = this._history.slice(0, this._historyIndex + 1);
        }

        this._history.push({ key, oldValue, newValue, timestamp: Date.now() });
        this._historyIndex = this._history.length - 1;

        // Limit history size
        if (this._history.length > this._maxHistory) {
            this._history.shift();
            this._historyIndex--;
        }
    },

    /**
     * Undo last state change
     * @returns {boolean} Whether undo was successful
     */
    undo() {
        if (this._historyIndex < 0) return false;

        const { key, oldValue } = this._history[this._historyIndex];
        this._historyIndex--;

        // Set without recording to history
        const keys = key.split('.');
        let current = this._state;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = deepClone(oldValue);

        this._notifySubscribers(key, oldValue, null);
        return true;
    },

    /**
     * Redo last undone state change
     * @returns {boolean} Whether redo was successful
     */
    redo() {
        if (this._historyIndex >= this._history.length - 1) return false;

        this._historyIndex++;
        const { key, newValue } = this._history[this._historyIndex];

        const keys = key.split('.');
        let current = this._state;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = deepClone(newValue);

        this._notifySubscribers(key, newValue, null);
        return true;
    },

    /**
     * Reset state to initial values
     */
    reset() {
        this._state = {
            ui: {
                currentView: 'dashboard',
                sidebarOpen: false,
                modalOpen: null,
                loading: false,
                error: null,
                toast: null,
                theme: 'light',
                searchQuery: ''
            },
            projects: [],
            currentProject: null,
            currentBid: null,
            customers: [],
            currentCustomer: null,
            suppliers: [],
            materials: [],
            settings: {
                companyName: 'Don Smith Concrete',
                defaultOverheadPercent: 15,
                defaultProfitPercent: 10,
                defaultContingencyPercent: 5,
                taxRate: 0,
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY',
                autoSave: true,
                offlineMode: false
            },
            sync: {
                lastSynced: null,
                pendingChanges: 0,
                isOnline: navigator.onLine
            }
        };

        this._history = [];
        this._historyIndex = -1;

        // Notify all subscribers
        this._subscribers.forEach((callbacks, key) => {
            if (key !== '*') {
                const value = this.getState(key);
                callbacks.forEach(callback => {
                    try {
                        callback(value, null);
                    } catch (error) {
                        console.error('State subscriber error:', error);
                    }
                });
            }
        });
    },

    /**
     * Load state from database
     */
    async loadFromDatabase() {
        try {
            this.setState('ui.loading', true);

            await DatabaseManager.init();

            const [projects, customers, suppliers, materials, settingsRecords] = await Promise.all([
                DatabaseManager.getAll('projects'),
                DatabaseManager.getAll('customers'),
                DatabaseManager.getAll('suppliers'),
                DatabaseManager.getAll('materials'),
                DatabaseManager.getAll('settings')
            ]);

            // Convert settings array to object
            const settings = { ...this._state.settings };
            settingsRecords.forEach(record => {
                if (record.key && record.value !== undefined) {
                    settings[record.key] = record.value;
                }
            });

            this.batchUpdate({
                projects: projects || [],
                customers: customers || [],
                suppliers: suppliers || [],
                materials: materials || [],
                settings
            });

            this.setState('ui.loading', false);
            console.log('State loaded from database');
        } catch (error) {
            console.error('Error loading state from database:', error);
            this.setState('ui.error', 'Failed to load data from database');
            this.setState('ui.loading', false);
        }
    },

    /**
     * Save a settings value to database
     */
    async saveSetting(key, value) {
        try {
            const existing = await DatabaseManager.get('settings', key);
            if (existing) {
                await DatabaseManager.update('settings', { key, value });
            } else {
                await DatabaseManager.add('settings', { key, value });
            }

            // Update state
            const settings = this.getState('settings');
            settings[key] = value;
            this.setState('settings', settings);
        } catch (error) {
            console.error('Error saving setting:', error);
            throw error;
        }
    }
};

// ============================================================================
// 4. INITIALIZATION & ONLINE/OFFLINE HANDLING
// ============================================================================

// Track online/offline status
window.addEventListener('online', () => {
    AppState.setState('sync.isOnline', true);
    console.log('App is online');
});

window.addEventListener('offline', () => {
    AppState.setState('sync.isOnline', false);
    console.log('App is offline');
});

// Auto-initialize database and load state when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await DatabaseManager.init();
        await AppState.loadFromDatabase();
        console.log('Don Smith Concrete Bid Pro - Database & State initialized');
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
