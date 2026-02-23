/**
 * Storage — IndexedDB wrapper for local project persistence.
 */
export class Storage {
  constructor(dbName = 'blueprintforge', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this._db = null;
  }

  /**
   * Open/initialize the database.
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('modified', 'metadata.modified', { unique: false });
        }
        if (!db.objectStoreNames.contains('bitmaps')) {
          db.createObjectStore('bitmaps', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this._db = e.target.result;
        resolve();
      };

      request.onerror = (e) => {
        reject(new Error(`Failed to open database: ${e.target.error}`));
      };
    });
  }

  /**
   * Save a project.
   * @param {object} blueprintJSON - Result of blueprint.toJSON()
   */
  async saveProject(blueprintJSON) {
    return this._put('projects', blueprintJSON);
  }

  /**
   * Load a project by ID.
   */
  async loadProject(id) {
    return this._get('projects', id);
  }

  /**
   * List all projects (id, name, modified).
   */
  async listProjects() {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();
      request.onsuccess = () => {
        const projects = request.result.map(p => ({
          id: p.id,
          name: p.name,
          modified: p.metadata?.modified,
        }));
        projects.sort((a, b) => (b.modified || 0) - (a.modified || 0));
        resolve(projects);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Delete a project.
   */
  async deleteProject(id) {
    return this._delete('projects', id);
  }

  /**
   * Save a bitmap blob.
   */
  async saveBitmap(id, blob) {
    return this._put('bitmaps', { id, blob, saved: Date.now() });
  }

  /**
   * Load a bitmap blob.
   */
  async loadBitmap(id) {
    const data = await this._get('bitmaps', id);
    return data?.blob || null;
  }

  // --- Internal helpers ---

  _put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }
}
