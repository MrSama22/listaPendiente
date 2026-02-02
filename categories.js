/**
 * Category Manager
 * Handles all logic related to Task Categories (Areas)
 */

class CategoryManager {
    constructor() {
        this.categories = [];
        this.subscribers = [];
        this.defaultColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB',
            '#2ECC71', '#F1C40F', '#E67E22', '#E74C3C'
        ];
    }

    // Initialize with current user
    init(userId) {
        this.userId = userId;
        this.collectionRef = db.collection('users').doc(userId).collection('categories');
        this.listenForUpdates();
    }

    // Subscribe to changes
    subscribe(callback) {
        this.subscribers.push(callback);
        // Call immediately with current data if available
        if (this.categories.length > 0) callback(this.categories);
    }

    notifySubscribers() {
        this.subscribers.forEach(cb => cb(this.categories));
    }

    // Listen to Firestore changes
    listenForUpdates() {
        this.unsubscribe = this.collectionRef.orderBy('createdAt', 'asc')
            .onSnapshot((snapshot) => {
                this.categories = [];
                snapshot.forEach((doc) => {
                    this.categories.push({ id: doc.id, ...doc.data() });
                });
                this.notifySubscribers();
                console.log('📂 Categories updated:', this.categories.length);
            }, (error) => {
                console.error("Error listening to categories:", error);
            });
    }

    // CRUD Operations
    async addCategory(name, emoji, color) {
        try {
            const newCat = {
                name: name.trim(),
                emoji: emoji || '📁',
                color: color || this.getRandomColor(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await this.collectionRef.add(newCat);
            return true;
        } catch (error) {
            console.error("Error adding category:", error);
            throw error;
        }
    }

    async updateCategory(id, data) {
        try {
            await this.collectionRef.doc(id).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating category:", error);
            throw error;
        }
    }

    async deleteCategory(id) {
        try {
            // Logic to unassign tasks will be handled in script.js or cloud functions
            // Here we just delete the category doc
            await this.collectionRef.doc(id).delete();
            return true;
        } catch (error) {
            console.error("Error deleting category:", error);
            throw error;
        }
    }

    getCategory(id) {
        return this.categories.find(c => c.id === id);
    }

    getRandomColor() {
        return this.defaultColors[Math.floor(Math.random() * this.defaultColors.length)];
    }

    // Clean up listener
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.subscribers = [];
    }
}

// Export global instance
window.categoryManager = new CategoryManager();
