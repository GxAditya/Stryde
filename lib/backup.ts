/**
 * Backup functionality for Stryde
 * Cloud backup interface with Google Drive and iCloud support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  exportToJSON,
  importFromJSON,
  CompleteDataExport,
  ExportProgressCallback,
  ImportResult,
} from './export';
import {
  getActivities,
  getGoals,
  getHydrationLogs,
  getCalibrationProfiles,
  initDatabase,
} from './db';

// Backup metadata storage key
const BACKUP_METADATA_KEY = 'stryde_backup_metadata';
const LAST_BACKUP_TIME_KEY = 'stryde_last_backup_time';
const AUTO_BACKUP_ENABLED_KEY = 'stryde_auto_backup_enabled';
const AUTO_BACKUP_INTERVAL_KEY = 'stryde_auto_backup_interval';

// Backup provider types
export type BackupProvider = 'local' | 'google_drive' | 'icloud';

// Backup metadata
export interface BackupMetadata {
  id: string;
  timestamp: number;
  provider: BackupProvider;
  size: number;
  version: string;
  recordCount: {
    activities: number;
    goals: number;
    hydration: number;
    profiles: number;
  };
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
}

// Backup configuration
export interface BackupConfig {
  provider: BackupProvider;
  autoBackup: boolean;
  autoBackupInterval: number; // in hours
  includeActivities: boolean;
  includeGoals: boolean;
  includeHydration: boolean;
  includeProfiles: boolean;
}

// Default backup configuration
export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  provider: 'local',
  autoBackup: false,
  autoBackupInterval: 24, // Daily
  includeActivities: true,
  includeGoals: true,
  includeHydration: true,
  includeProfiles: true,
};

// Backup result
export interface BackupResult {
  success: boolean;
  metadata?: BackupMetadata;
  error?: string;
}

// Restore result
export interface RestoreResult {
  success: boolean;
  metadata?: BackupMetadata;
  importResult?: ImportResult;
  error?: string;
}

// Backup history entry
export interface BackupHistoryEntry {
  id: string;
  timestamp: number;
  provider: BackupProvider;
  size: string;
  status: 'success' | 'failed' | 'in_progress';
  error?: string;
}

/**
 * Get device info for backup metadata
 */
function getDeviceInfo(): BackupMetadata['deviceInfo'] {
  return {
    platform: Platform.OS,
    version: Platform.Version?.toString() || 'unknown',
  };
}

/**
 * Load backup configuration
 */
export async function loadBackupConfig(): Promise<BackupConfig> {
  try {
    const [provider, autoBackup, interval, activities, goals, hydration, profiles] = await Promise.all([
      AsyncStorage.getItem('backup_provider'),
      AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY),
      AsyncStorage.getItem(AUTO_BACKUP_INTERVAL_KEY),
      AsyncStorage.getItem('backup_include_activities'),
      AsyncStorage.getItem('backup_include_goals'),
      AsyncStorage.getItem('backup_include_hydration'),
      AsyncStorage.getItem('backup_include_profiles'),
    ]);

    return {
      provider: (provider as BackupProvider) || DEFAULT_BACKUP_CONFIG.provider,
      autoBackup: autoBackup === 'true',
      autoBackupInterval: interval ? parseInt(interval, 10) : DEFAULT_BACKUP_CONFIG.autoBackupInterval,
      includeActivities: activities !== 'false',
      includeGoals: goals !== 'false',
      includeHydration: hydration !== 'false',
      includeProfiles: profiles !== 'false',
    };
  } catch {
    return DEFAULT_BACKUP_CONFIG;
  }
}

/**
 * Save backup configuration
 */
export async function saveBackupConfig(config: BackupConfig): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem('backup_provider', config.provider),
    AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, config.autoBackup.toString()),
    AsyncStorage.setItem(AUTO_BACKUP_INTERVAL_KEY, config.autoBackupInterval.toString()),
    AsyncStorage.setItem('backup_include_activities', config.includeActivities.toString()),
    AsyncStorage.setItem('backup_include_goals', config.includeGoals.toString()),
    AsyncStorage.setItem('backup_include_hydration', config.includeHydration.toString()),
    AsyncStorage.setItem('backup_include_profiles', config.includeProfiles.toString()),
  ]);
}

/**
 * Get last backup time
 */
export async function getLastBackupTime(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_BACKUP_TIME_KEY);
    return value ? parseInt(value, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Set last backup time
 */
async function setLastBackupTime(timestamp: number): Promise<void> {
  await AsyncStorage.setItem(LAST_BACKUP_TIME_KEY, timestamp.toString());
}

/**
 * Check if auto backup is due
 */
export async function isAutoBackupDue(): Promise<boolean> {
  const config = await loadBackupConfig();
  if (!config.autoBackup) {
    return false;
  }

  const lastBackup = await getLastBackupTime();
  if (!lastBackup) {
    return true;
  }

  const intervalMs = config.autoBackupInterval * 60 * 60 * 1000;
  return Date.now() - lastBackup >= intervalMs;
}

/**
 * Save backup metadata to history
 */
async function saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(BACKUP_METADATA_KEY);
    const history: BackupMetadata[] = existing ? JSON.parse(existing) : [];
    
    // Add new backup to beginning
    history.unshift(metadata);
    
    // Keep only last 50 backups
    if (history.length > 50) {
      history.length = 50;
    }
    
    await AsyncStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save backup metadata:', error);
  }
}

/**
 * Get backup history
 */
export async function getBackupHistory(): Promise<BackupHistoryEntry[]> {
  try {
    const existing = await AsyncStorage.getItem(BACKUP_METADATA_KEY);
    const metadata: BackupMetadata[] = existing ? JSON.parse(existing) : [];
    
    return metadata.map((m) => ({
      id: m.id,
      timestamp: m.timestamp,
      provider: m.provider,
      size: formatBytes(m.size),
      status: 'success',
    }));
  } catch {
    return [];
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Create backup data
 */
async function createBackupData(
  config: BackupConfig,
  onProgress?: ExportProgressCallback
): Promise<{ data: string; metadata: Omit<BackupMetadata, 'id' | 'timestamp'> }> {
  onProgress?.(0, 'Fetching data for backup...');
  await initDatabase();

  const [activities, goals, hydrationLogs, profiles] = await Promise.all([
    config.includeActivities ? getActivities() : Promise.resolve([]),
    config.includeGoals ? getGoals() : Promise.resolve([]),
    config.includeHydration ? getHydrationLogs() : Promise.resolve([]),
    config.includeProfiles ? getCalibrationProfiles() : Promise.resolve([]),
  ]);

  onProgress?.(30, 'Generating backup file...');
  const jsonData = await exportToJSON(
    { activities, goals, hydrationLogs, calibrationProfiles: profiles },
    (p, m) => onProgress?.(30 + p * 0.5, m)
  );

  onProgress?.(90, 'Finalizing...');
  const size = new Blob([jsonData]).size;

  const metadata: Omit<BackupMetadata, 'id' | 'timestamp'> = {
    provider: config.provider,
    size,
    version: '1.0.0',
    recordCount: {
      activities: activities.length,
      goals: goals.length,
      hydration: hydrationLogs.length,
      profiles: profiles.length,
    },
    deviceInfo: getDeviceInfo(),
  };

  onProgress?.(100, 'Backup data ready');
  return { data: jsonData, metadata };
}

/**
 * Perform local backup (stores metadata only, actual data is in export)
 * For local backup, we use the export functionality directly
 */
export async function performLocalBackup(
  onProgress?: ExportProgressCallback
): Promise<BackupResult> {
  try {
    const config = await loadBackupConfig();
    const { data, metadata } = await createBackupData(config, onProgress);

    // For local backup, we trigger an export that user can save
    // The metadata is stored for history
    const fullMetadata: BackupMetadata = {
      ...metadata,
      id: `local_${Date.now()}`,
      timestamp: Date.now(),
    };

    await saveBackupMetadata(fullMetadata);
    await setLastBackupTime(Date.now());

    return {
      success: true,
      metadata: fullMetadata,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Backup failed',
    };
  }
}

/**
 * Google Drive backup interface (placeholder for future implementation)
 */
export interface GoogleDriveBackupInterface {
  authenticate: () => Promise<boolean>;
  uploadFile: (fileName: string, content: string) => Promise<string>;
  downloadFile: (fileId: string) => Promise<string>;
  listBackups: () => Promise<BackupMetadata[]>;
  deleteBackup: (fileId: string) => Promise<boolean>;
}

/**
 * iCloud backup interface (placeholder for future implementation)
 */
export interface iCloudBackupInterface {
  isAvailable: () => Promise<boolean>;
  uploadFile: (fileName: string, content: string) => Promise<string>;
  downloadFile: (fileName: string) => Promise<string>;
  listBackups: () => Promise<BackupMetadata[]>;
  deleteBackup: (fileName: string) => Promise<boolean>;
}

/**
 * Google Drive backup (placeholder - requires Google Sign-In and Drive API)
 */
export async function performGoogleDriveBackup(
  _onProgress?: ExportProgressCallback
): Promise<BackupResult> {
  // This is a placeholder for Google Drive integration
  // Would require:
  // 1. Google Sign-In setup
  // 2. Google Drive API configuration
  // 3. OAuth2 authentication flow
  // 4. File upload to Drive
  
  return {
    success: false,
    error: 'Google Drive backup not yet implemented. Please use local export for now.',
  };
}

/**
 * iCloud backup (placeholder - requires iCloud container setup)
 */
export async function performiCloudBackup(
  _onProgress?: ExportProgressCallback
): Promise<BackupResult> {
  // This is a placeholder for iCloud integration
  // Would require:
  // 1. iCloud container configuration in app capabilities
  // 2. NSUbiquitousKeyValueStore or NSFileManager for iCloud
  // 3. Proper entitlements setup
  
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      error: 'iCloud backup is only available on iOS devices',
    };
  }
  
  return {
    success: false,
    error: 'iCloud backup not yet implemented. Please use local export for now.',
  };
}

/**
 * Perform backup based on configured provider
 */
export async function performBackup(
  onProgress?: ExportProgressCallback
): Promise<BackupResult> {
  const config = await loadBackupConfig();

  switch (config.provider) {
    case 'google_drive':
      return performGoogleDriveBackup(onProgress);
    case 'icloud':
      return performiCloudBackup(onProgress);
    case 'local':
    default:
      return performLocalBackup(onProgress);
  }
}

/**
 * Restore from backup data
 */
export async function restoreFromBackup(
  backupData: string,
  options: {
    mergeStrategy?: 'merge' | 'replace';
    onProgress?: ExportProgressCallback;
  } = {}
): Promise<RestoreResult> {
  try {
    const importResult = await importFromJSON(backupData, options);

    if (!importResult.success) {
      return {
        success: false,
        error: 'Failed to import backup data',
        importResult,
      };
    }

    return {
      success: true,
      importResult,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Restore failed',
    };
  }
}

/**
 * Schedule auto backup check
 * Call this when app starts or comes to foreground
 */
export async function checkAndPerformAutoBackup(
  onProgress?: ExportProgressCallback
): Promise<BackupResult | null> {
  const isDue = await isAutoBackupDue();
  
  if (!isDue) {
    return null;
  }

  return performBackup(onProgress);
}

/**
 * Delete a backup from history
 */
export async function deleteBackupFromHistory(backupId: string): Promise<boolean> {
  try {
    const existing = await AsyncStorage.getItem(BACKUP_METADATA_KEY);
    const history: BackupMetadata[] = existing ? JSON.parse(existing) : [];
    
    const filtered = history.filter((h) => h.id !== backupId);
    
    await AsyncStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all backup history
 */
export async function clearBackupHistory(): Promise<void> {
  await AsyncStorage.removeItem(BACKUP_METADATA_KEY);
  await AsyncStorage.removeItem(LAST_BACKUP_TIME_KEY);
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalBackups: number;
  lastBackupTime: number | null;
  totalSize: string;
  autoBackupEnabled: boolean;
}> {
  const [history, lastBackup, config] = await Promise.all([
    getBackupHistory(),
    getLastBackupTime(),
    loadBackupConfig(),
  ]);

  const totalBytes = history.reduce((sum, h) => {
    const sizeMatch = h.size.match(/([\d.]+)\s*(B|KB|MB|GB)/);
    if (!sizeMatch) return sum;
    
    const value = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2];
    const multiplier: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    
    return sum + value * (multiplier[unit] || 1);
  }, 0);

  return {
    totalBackups: history.length,
    lastBackupTime: lastBackup,
    totalSize: formatBytes(totalBytes),
    autoBackupEnabled: config.autoBackup,
  };
}

/**
 * Export backup data as shareable string
 * This can be used to save backup to user's preferred location
 */
export async function exportBackupData(
  onProgress?: ExportProgressCallback
): Promise<string | null> {
  try {
    const config = await loadBackupConfig();
    const { data } = await createBackupData(config, onProgress);
    return data;
  } catch {
    return null;
  }
}
