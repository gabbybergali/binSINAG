import Dexie, { type Table } from 'dexie';

export interface OfflineCollection {
  id?: string;
  bin_id: string;
  bin_code: string;
  verification_method: 'QR_SCAN' | 'MANUAL_TAP';
  weight_collected_kg: number;
  fill_level_before: number;
  timestamp: string;
}

export interface CachedRoute {
  id: string; // "active-route"
  waypoints: any[];
  geometry: any;
  duration_sec: number;
  distance_meters: number;
  timestamp: string;
}

class DexieOfflineDB extends Dexie {
  outbox!: Table<OfflineCollection>;
  cachedRoute!: Table<CachedRoute>;

  constructor() {
    super('BinSinagOfflineDB');
    this.version(1).stores({
      outbox: '++id, bin_id, timestamp',
      cachedRoute: 'id, timestamp'
    });
  }
}

export const db = new DexieOfflineDB();
export default db;
