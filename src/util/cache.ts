import NodeCache from "node-cache";
import storage from "node-persist";

/**
 * A simple key-value store that persists to disk,
 * used for caching the result of expensive operations that are likely to give the same results
 * if called again. For example, when we scrape a URL to get the text.
 *
 * init() needs to be called after construction.
 */
class PersistentCache {
   private cacheFolder: string;
   private cache: NodeCache;

   constructor(cacheFolder: string) {
      this.cacheFolder = cacheFolder;
      this.cache = new NodeCache();
   }

   /**
    * Will create the folder if missing, and load existing cache from disk.
    */
   public async init() {
      console.log(`Initializing cache in ${this.cacheFolder}`);
      await storage.init({
         dir: this.cacheFolder,
         stringify: JSON.stringify,
         parse: JSON.parse,
         encoding: "utf8",
         logging: false, // can be set to true for debugging
         ttl: false, // time to live for the entire cache
         expiredInterval: 60 * 1000, // clear expired items every minute
         forgiveParseErrors: false,
      });

      await this.loadFromDisk();
   }

   async store(key: string, value: any, ttlSeconds: number = 0) {
      this.cache.set(key, value, ttlSeconds);
      await this.persist();
   }

   retrieve(key: string): any {
      return this.cache.get(key);
   }

   private async persist() {
      const keys = this.cache.keys();
      for (const key of keys) {
         const value = this.cache.get(key);
         await storage.setItem(key, value); // Use storage directly
      }
   }

   private async loadFromDisk() {
      const keys = await storage.keys(); // Use storage directly
      for (const key of keys) {
         const value = await storage.getItem(key);
         this.cache.set(key, value);
      }
   }
}

export { PersistentCache };
