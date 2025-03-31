// src/utils/indexedDB.ts
interface DBStoreSchema {
  keyPath: string;
  autoIncrement?: boolean;
  indices?: Array<{
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }>;
}

interface DBConfig {
  name: string;
  version: number;
  stores: Record<string, DBStoreSchema>;
}

interface DBOperation<T> {
  storeName: string;
  operation: 'readwrite' | 'readonly';
  action: (store: IDBObjectStore) => IDBRequest | null;
}

class IndexedDBManager {
  private static instance: IndexedDBManager;
  private db: IDBDatabase | null = null;
  
  private constructor(private config: DBConfig) {}

  static getInstance(config: DBConfig): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager(config);
    }
    return IndexedDBManager.instance;
  }

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.name, this.config.version);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const [storeName, schema] of Object.entries(this.config.stores)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: schema.keyPath,
              autoIncrement: schema.autoIncrement
            });
            
            schema.indices?.forEach(index => 
              store.createIndex(index.name, index.keyPath, index.options)
            );
          }
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(`IndexedDB error: ${(event.target as IDBRequest).error}`);
      };
    });
  }

  async execute<T>({
    storeName,
    operation,
    action
  }: DBOperation<T>): Promise<T> {
    const db = await this.connect();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, operation);
      const store = transaction.objectStore(storeName);
      const request = action(store);

      if (!request) {
        reject('Invalid database operation');
        return;
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // CRUD Operations
  async put<T>(storeName: string, data: T): Promise<T> {
    return this.execute<T>({
      storeName,
      operation: 'readwrite',
      action: (store) => store.put(data)
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T> {
    return this.execute<T>({
      storeName,
      operation: 'readonly',
      action: (store) => store.get(key)
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return this.execute<T[]>({
      storeName,
      operation: 'readonly',
      action: (store) => store.getAll()
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    return this.execute<void>({
      storeName,
      operation: 'readwrite',
      action: (store) => store.delete(key)
    });
  }

  // Index-based queries
  async getByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey
  ): Promise<T> {
    return this.execute<T>({
      storeName,
      operation: 'readonly',
      action: (store) => {
        const index = store.index(indexName);
        return index.get(key);
      }
    });
  }

  // Bulk operations
  async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      items.forEach(item => store.put(item));
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Database Configuration
const dbConfig: DBConfig = {
  name: 'TradingAppDB',
  version: 2,
  stores: {
    marketData: {
      keyPath: 'id',
      autoIncrement: true,
      indices: [
        { name: 'bySymbol', keyPath: 'symbol', options: { unique: false } },
        { name: 'byTimestamp', keyPath: 'timestamp', options: { unique: false } }
      ]
    },
    userPreferences: {
      keyPath: 'userId',
      indices: [
        { name: 'byTheme', keyPath: 'theme', options: { unique: false } }
      ]
    }
  }
};

// Singleton instance export
export const db = IndexedDBManager.getInstance(dbConfig);

// Helper functions with error handling
export const withDB = async <T>(
  operation: (db: IDBDatabase) => Promise<T>,
  fallback?: T
): Promise<T> => {
  try {
    const database = await db.connect();
    return await operation(database);
  } catch (error) {
    console.error('IndexedDB operation failed:', error);
    if (fallback !== undefined) return fallback;
    throw error;
  }
};

// Type-safe API
export const IndexedDB = {
  marketData: {
    save: (data: MarketData) => db.put<MarketData>('marketData', data),
    get: (id: IDBValidKey) => db.get<MarketData>('marketData', id),
    getBySymbol: (symbol: string) => 
      db.getByIndex<MarketData>('marketData', 'bySymbol', symbol),
    getAll: () => db.getAll<MarketData>('marketData')
  },
  userPrefs: {
    save: (prefs: UserPreferences) => 
      db.put<UserPreferences>('userPreferences', prefs),
    get: (userId: string) => 
      db.get<UserPreferences>('userPreferences', userId)
  }
};

// Type Definitions
interface MarketData {
  id?: number;
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark';
  defaultSymbol?: string;
}
