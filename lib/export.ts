/**
 * Export functionality for Stryde
 * Supports CSV, JSON, and GPX export formats
 */

import { Paths, File, Directory } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';
import {
  Activity,
  Goal,
  HydrationLog,
  CalibrationProfile,
  RoutePoint,
  getActivities,
  getGoals,
  getHydrationLogs,
  getCalibrationProfiles,
  initDatabase,
  createActivity,
  createGoal,
  createHydrationLog,
  createCalibrationProfile,
  resetDatabase,
} from '@/lib/db';

// Export format types
export type ExportFormat = 'csv' | 'json' | 'gpx';

// Data type selection
export type DataType = 'activities' | 'goals' | 'hydration' | 'profiles' | 'all';

// Export progress callback
export type ExportProgressCallback = (progress: number, message: string) => void;

// Export result
export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
  recordCount?: number;
}

// Import result
export interface ImportResult {
  success: boolean;
  imported: {
    activities: number;
    goals: number;
    hydration: number;
    profiles: number;
  };
  errors: string[];
}

// Complete data export structure
export interface CompleteDataExport {
  version: string;
  exportedAt: string;
  activities: Activity[];
  goals: Goal[];
  hydrationLogs: HydrationLog[];
  calibrationProfiles: CalibrationProfile[];
}

const EXPORT_VERSION = '1.0.0';

/**
 * Generate CSV content from data
 */
function generateCSV<T extends object>(
  data: T[],
  headers: string[],
  rowMapper: (item: T) => (string | number | null)[]
): string {
  if (data.length === 0) {
    return headers.join(',');
  }

  const escapeCSV = (value: string | number | null): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map(rowMapper);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export activities to CSV
 */
export async function exportActivitiesToCSV(
  activities: Activity[],
  onProgress?: ExportProgressCallback
): Promise<string> {
  onProgress?.(0, 'Preparing activity data...');

  const headers = [
    'ID',
    'Profile ID',
    'Steps',
    'Distance (m)',
    'Duration (ms)',
    'Elevation Gain (m)',
    'Started At',
    'Ended At',
    'Route Points Count',
  ];

  const rowMapper = (activity: Activity): (string | number | null)[] => [
    activity.id,
    activity.profile_id,
    activity.steps,
    activity.distance_m.toFixed(2),
    activity.duration_ms,
    activity.elevation_gain_m.toFixed(2),
    new Date(activity.started_at).toISOString(),
    activity.ended_at ? new Date(activity.ended_at).toISOString() : '',
    activity.route_points?.length || 0,
  ];

  onProgress?.(50, 'Generating CSV...');
  const csv = generateCSV(activities, headers, rowMapper);
  onProgress?.(100, 'Complete');

  return csv;
}

/**
 * Export goals to CSV
 */
export async function exportGoalsToCSV(
  goals: Goal[],
  onProgress?: ExportProgressCallback
): Promise<string> {
  onProgress?.(0, 'Preparing goal data...');

  const headers = ['ID', 'Type', 'Target', 'Current', 'Date', 'Progress %'];

  const rowMapper = (goal: Goal): (string | number | null)[] => [
    goal.id,
    goal.type,
    goal.target,
    goal.current,
    goal.date,
    ((goal.current / goal.target) * 100).toFixed(1),
  ];

  onProgress?.(50, 'Generating CSV...');
  const csv = generateCSV(goals, headers, rowMapper);
  onProgress?.(100, 'Complete');

  return csv;
}

/**
 * Export hydration logs to CSV
 */
export async function exportHydrationToCSV(
  logs: HydrationLog[],
  onProgress?: ExportProgressCallback
): Promise<string> {
  onProgress?.(0, 'Preparing hydration data...');

  const headers = ['ID', 'Amount (ml)', 'Timestamp', 'Date', 'Time'];

  const rowMapper = (log: HydrationLog): (string | number | null)[] => {
    const date = new Date(log.timestamp);
    return [
      log.id,
      log.amount_ml,
      log.timestamp,
      date.toISOString().split('T')[0],
      date.toTimeString().split(' ')[0],
    ];
  };

  onProgress?.(50, 'Generating CSV...');
  const csv = generateCSV(logs, headers, rowMapper);
  onProgress?.(100, 'Complete');

  return csv;
}

/**
 * Export calibration profiles to CSV
 */
export async function exportProfilesToCSV(
  profiles: CalibrationProfile[],
  onProgress?: ExportProgressCallback
): Promise<string> {
  onProgress?.(0, 'Preparing profile data...');

  const headers = [
    'ID',
    'Activity Type',
    'Step Length (m)',
    'Confidence',
    'Created At',
    'Updated At',
  ];

  const rowMapper = (profile: CalibrationProfile): (string | number | null)[] => [
    profile.id,
    profile.activity_type,
    profile.step_length_m.toFixed(4),
    (profile.confidence * 100).toFixed(1),
    new Date(profile.created_at).toISOString(),
    new Date(profile.updated_at).toISOString(),
  ];

  onProgress?.(50, 'Generating CSV...');
  const csv = generateCSV(profiles, headers, rowMapper);
  onProgress?.(100, 'Complete');

  return csv;
}

/**
 * Export all data to JSON
 */
export async function exportToJSON(
  data: {
    activities?: Activity[];
    goals?: Goal[];
    hydrationLogs?: HydrationLog[];
    calibrationProfiles?: CalibrationProfile[];
  },
  onProgress?: ExportProgressCallback
): Promise<string> {
  onProgress?.(0, 'Preparing data export...');

  const exportData: CompleteDataExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    activities: data.activities || [],
    goals: data.goals || [],
    hydrationLogs: data.hydrationLogs || [],
    calibrationProfiles: data.calibrationProfiles || [],
  };

  onProgress?.(50, 'Generating JSON...');
  const json = JSON.stringify(exportData, null, 2);
  onProgress?.(100, 'Complete');

  return json;
}

/**
 * Generate GPX content from route points
 */
function generateGPX(
  activity: Activity,
  routePoints: RoutePoint[]
): string {
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toISOString();
  };

  const trkpts = routePoints
    .map((point) => {
      const ele = point.elevation !== undefined ? `<ele>${point.elevation.toFixed(2)}</ele>` : '';
      const time = `<time>${formatTime(point.timestamp)}</time>`;
      return `    <trkpt lat="${point.latitude}" lon="${point.longitude}">${ele}${time}</trkpt>`;
    })
    .join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Stryde Fitness App" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Stryde Activity - ${activity.id}</name>
    <desc>Activity exported from Stryde</desc>
    <time>${formatTime(activity.started_at)}</time>
  </metadata>
  <trk>
    <name>Activity ${new Date(activity.started_at).toLocaleString()}</name>
    <type>${activity.profile_id || 'walking'}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Export activity route to GPX
 */
export async function exportActivityToGPX(
  activity: Activity,
  onProgress?: ExportProgressCallback
): Promise<string | null> {
  onProgress?.(0, 'Preparing GPX export...');

  if (!activity.route_points || activity.route_points.length === 0) {
    onProgress?.(100, 'No route points available');
    return null;
  }

  onProgress?.(50, 'Generating GPX...');
  const gpx = generateGPX(activity, activity.route_points);
  onProgress?.(100, 'Complete');

  return gpx;
}

/**
 * Export multiple activities' routes to GPX (one track per activity)
 */
export async function exportActivitiesToGPX(
  activities: Activity[],
  onProgress?: ExportProgressCallback
): Promise<string | null> {
  onProgress?.(0, 'Preparing GPX export...');

  const activitiesWithRoutes = activities.filter(
    (a) => a.route_points && a.route_points.length > 0
  );

  if (activitiesWithRoutes.length === 0) {
    onProgress?.(100, 'No route points available');
    return null;
  }

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toISOString();
  };

  onProgress?.(30, 'Generating tracks...');

  const tracks = activitiesWithRoutes
    .map((activity) => {
      const trkpts = activity.route_points
        .map((point) => {
          const ele = point.elevation !== undefined ? `<ele>${point.elevation.toFixed(2)}</ele>` : '';
          const time = `<time>${formatTime(point.timestamp)}</time>`;
          return `      <trkpt lat="${point.latitude}" lon="${point.longitude}">${ele}${time}</trkpt>`;
        })
        .join('\n');

      return `  <trk>
    <name>Activity ${new Date(activity.started_at).toLocaleString()}</name>
    <desc>Steps: ${activity.steps}, Distance: ${(activity.distance_m / 1000).toFixed(2)}km</desc>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>`;
    })
    .join('\n');

  onProgress?.(70, 'Finalizing GPX...');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Stryde Fitness App" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Stryde Activities Export</name>
    <desc>Exported ${activitiesWithRoutes.length} activities from Stryde</desc>
    <time>${formatTime(Date.now())}</time>
  </metadata>
${tracks}
</gpx>`;

  onProgress?.(100, 'Complete');
  return gpx;
}

/**
 * Create temporary file for sharing
 */
async function createTempFile(content: string, extension: string): Promise<string> {
  const fileName = `stryde_export_${Date.now()}.${extension}`;
  const cacheDir = Paths.cache;
  const file = cacheDir.createFile(fileName, 'text/plain');
  
  // Write content using text method
  await file.write(content);
  
  return file.uri;
}

/**
 * Clean up temporary file
 */
async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    const file = new File(filePath);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Share exported file
 */
async function shareFile(filePath: string, fileName: string): Promise<boolean> {
  try {
    const isAvailable = await isAvailableAsync();
    if (!isAvailable) {
      return false;
    }

    await shareAsync(filePath, {
      mimeType: fileName.endsWith('.json')
        ? 'application/json'
        : fileName.endsWith('.gpx')
          ? 'application/gpx+xml'
          : 'text/csv',
      dialogTitle: `Share ${fileName}`,
      UTI: fileName.endsWith('.json')
        ? 'public.json'
        : fileName.endsWith('.gpx')
          ? 'com.topografix.gpx'
          : 'public.comma-separated-values-text',
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Main export function
 */
export async function exportData(
  format: ExportFormat,
  dataTypes: DataType[],
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  try {
    onProgress?.(0, 'Initializing export...');
    await initDatabase();

    // Determine what to export
    const exportAll = dataTypes.includes('all');
    const includeActivities = exportAll || dataTypes.includes('activities');
    const includeGoals = exportAll || dataTypes.includes('goals');
    const includeHydration = exportAll || dataTypes.includes('hydration');
    const includeProfiles = exportAll || dataTypes.includes('profiles');

    // Fetch data
    onProgress?.(10, 'Fetching data...');
    const [activities, goals, hydrationLogs, profiles] = await Promise.all([
      includeActivities ? getActivities() : Promise.resolve([]),
      includeGoals ? getGoals() : Promise.resolve([]),
      includeHydration ? getHydrationLogs() : Promise.resolve([]),
      includeProfiles ? getCalibrationProfiles() : Promise.resolve([]),
    ]);

    let content: string;
    let extension: string;
    let recordCount = 0;

    onProgress?.(30, 'Generating export file...');

    switch (format) {
      case 'csv':
        // For CSV, we combine all data into separate sections
        const csvParts: string[] = [];

        if (includeActivities && activities.length > 0) {
          csvParts.push('ACTIVITIES\n' + (await exportActivitiesToCSV(activities)));
          recordCount += activities.length;
        }

        if (includeGoals && goals.length > 0) {
          if (csvParts.length > 0) csvParts.push('');
          csvParts.push('GOALS\n' + (await exportGoalsToCSV(goals)));
          recordCount += goals.length;
        }

        if (includeHydration && hydrationLogs.length > 0) {
          if (csvParts.length > 0) csvParts.push('');
          csvParts.push('HYDRATION\n' + (await exportHydrationToCSV(hydrationLogs)));
          recordCount += hydrationLogs.length;
        }

        if (includeProfiles && profiles.length > 0) {
          if (csvParts.length > 0) csvParts.push('');
          csvParts.push('PROFILES\n' + (await exportProfilesToCSV(profiles)));
          recordCount += profiles.length;
        }

        content = csvParts.join('\n') || 'No data to export';
        extension = 'csv';
        break;

      case 'json':
        content = await exportToJSON(
          { activities, goals, hydrationLogs, calibrationProfiles: profiles },
          (p, m) => onProgress?.(30 + p * 0.4, m)
        );
        recordCount = activities.length + goals.length + hydrationLogs.length + profiles.length;
        extension = 'json';
        break;

      case 'gpx':
        // GPX only supports activities with routes
        const gpxContent = await exportActivitiesToGPX(
          activities,
          (p, m) => onProgress?.(30 + p * 0.4, m)
        );
        if (!gpxContent) {
          return {
            success: false,
            error: 'No activities with route data available for GPX export',
          };
        }
        content = gpxContent;
        recordCount = activities.filter((a) => a.route_points?.length > 0).length;
        extension = 'gpx';
        break;

      default:
        return { success: false, error: 'Unsupported export format' };
    }

    onProgress?.(70, 'Creating file...');
    const filePath = await createTempFile(content, extension);
    const fileName = `stryde_export_${Date.now()}.${extension}`;

    onProgress?.(80, 'Opening share dialog...');
    const shared = await shareFile(filePath, fileName);

    onProgress?.(90, 'Cleaning up...');
    // Keep file temporarily in case user needs to retry sharing
    setTimeout(() => cleanupTempFile(filePath), 60000);

    onProgress?.(100, 'Export complete');

    return {
      success: true,
      filePath,
      fileName,
      recordCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Export a single activity to GPX file
 */
export async function exportSingleActivityToGPX(
  activity: Activity,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  try {
    onProgress?.(0, 'Preparing GPX export...');

    const gpxContent = await exportActivityToGPX(activity, onProgress);
    if (!gpxContent) {
      return {
        success: false,
        error: 'No route points available for this activity',
      };
    }

    const extension = 'gpx';
    const filePath = await createTempFile(gpxContent, extension);
    const fileName = `stryde_activity_${activity.id}_${Date.now()}.${extension}`;

    const shared = await shareFile(filePath, fileName);
    setTimeout(() => cleanupTempFile(filePath), 60000);

    return {
      success: true,
      filePath,
      fileName,
      recordCount: activity.route_points?.length || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Parse JSON import data
 */
function parseJSONImport(jsonContent: string): CompleteDataExport | null {
  try {
    const data = JSON.parse(jsonContent) as CompleteDataExport;

    // Validate structure
    if (!data.version || !data.exportedAt) {
      return null;
    }

    return {
      version: data.version,
      exportedAt: data.exportedAt,
      activities: data.activities || [],
      goals: data.goals || [],
      hydrationLogs: data.hydrationLogs || [],
      calibrationProfiles: data.calibrationProfiles || [],
    };
  } catch {
    return null;
  }
}

/**
 * Import data from JSON string
 */
export async function importFromJSON(
  jsonContent: string,
  options: {
    mergeStrategy?: 'merge' | 'replace';
    onProgress?: ExportProgressCallback;
  } = {}
): Promise<ImportResult> {
  const { mergeStrategy = 'merge', onProgress } = options;
  const result: ImportResult = {
    success: false,
    imported: {
      activities: 0,
      goals: 0,
      hydration: 0,
      profiles: 0,
    },
    errors: [],
  };

  try {
    onProgress?.(0, 'Parsing import data...');

    const data = parseJSONImport(jsonContent);
    if (!data) {
      result.errors.push('Invalid JSON format');
      return result;
    }

    await initDatabase();

    // If replace strategy, clear existing data first
    if (mergeStrategy === 'replace') {
      onProgress?.(5, 'Clearing existing data...');
      await resetDatabase();
      await initDatabase();
    }

    const totalItems =
      data.activities.length +
      data.goals.length +
      data.hydrationLogs.length +
      data.calibrationProfiles.length;

    let processedItems = 0;

    // Import calibration profiles first (activities depend on them)
    onProgress?.(10, 'Importing calibration profiles...');
    for (const profile of data.calibrationProfiles) {
      try {
        await createCalibrationProfile(profile);
        result.imported.profiles++;
      } catch (error) {
        result.errors.push(
          `Failed to import profile ${profile.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      processedItems++;
      onProgress?.(10 + (processedItems / totalItems) * 80, 'Importing...');
    }

    // Import activities
    onProgress?.(30, 'Importing activities...');
    for (const activity of data.activities) {
      try {
        await createActivity(activity);
        result.imported.activities++;
      } catch (error) {
        result.errors.push(
          `Failed to import activity ${activity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      processedItems++;
      onProgress?.(10 + (processedItems / totalItems) * 80, 'Importing...');
    }

    // Import goals
    onProgress?.(60, 'Importing goals...');
    for (const goal of data.goals) {
      try {
        await createGoal(goal);
        result.imported.goals++;
      } catch (error) {
        result.errors.push(
          `Failed to import goal ${goal.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      processedItems++;
      onProgress?.(10 + (processedItems / totalItems) * 80, 'Importing...');
    }

    // Import hydration logs
    onProgress?.(80, 'Importing hydration logs...');
    for (const log of data.hydrationLogs) {
      try {
        await createHydrationLog(log);
        result.imported.hydration++;
      } catch (error) {
        result.errors.push(
          `Failed to import hydration log ${log.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      processedItems++;
      onProgress?.(10 + (processedItems / totalItems) * 80, 'Importing...');
    }

    result.success =
      result.imported.activities > 0 ||
      result.imported.goals > 0 ||
      result.imported.hydration > 0 ||
      result.imported.profiles > 0;

    onProgress?.(100, 'Import complete');
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Import failed');
    return result;
  }
}

/**
 * Read file content from URI
 */
export async function readImportFile(fileUri: string): Promise<string | null> {
  try {
    const file = new File(fileUri);
    if (!file.exists) {
      return null;
    }
    const content = await file.text();
    return content;
  } catch {
    return null;
  }
}

/**
 * Get export summary for UI display
 */
export function getExportSummary(dataTypes: DataType[]): string {
  if (dataTypes.includes('all')) {
    return 'All data including activities, goals, hydration logs, and calibration profiles';
  }

  const descriptions: Record<DataType, string> = {
    activities: 'activity history with route data',
    goals: 'fitness goals and progress',
    hydration: 'hydration tracking logs',
    profiles: 'calibration profiles',
    all: 'all data',
  };

  const selected = dataTypes.map((type) => descriptions[type]).filter(Boolean);

  if (selected.length === 0) {
    return 'No data selected';
  }

  if (selected.length === 1) {
    return selected[0];
  }

  const last = selected.pop();
  return `${selected.join(', ')} and ${last}`;
}

/**
 * Get file size estimate
 */
export function estimateExportSize(
  format: ExportFormat,
  recordCount: number
): string {
  // Rough estimates based on typical record sizes
  const bytesPerRecord: Record<ExportFormat, number> = {
    csv: 200,
    json: 500,
    gpx: 300,
  };

  const estimatedBytes = recordCount * bytesPerRecord[format];

  if (estimatedBytes < 1024) {
    return `${estimatedBytes} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    return `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
