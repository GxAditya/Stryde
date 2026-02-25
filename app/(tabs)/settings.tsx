import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View
} from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignTokens } from '@/constants/theme';
import {
  BackupConfig,
  BackupHistoryEntry,
  BackupProvider,
  clearBackupHistory,
  deleteBackupFromHistory,
  getBackupHistory,
  getBackupStats,
  loadBackupConfig,
  performBackup,
} from '@/lib/backup';
import {
  DataType,
  exportData,
  ExportFormat,
  getExportSummary,
  importFromJSON,
  readImportFile,
} from '@/lib/export';
import { loadWakeupSettings, saveWakeupSettings, WakeupSettings } from '@/lib/wakeup-settings';
import { useActivityStore } from '@/stores/activity-store';
import { useCalibrationStore } from '@/stores/calibration-store';
import { useGoalStore } from '@/stores/goal-store';
import { useHydrationStore } from '@/stores/hydration-store';

// Type definitions
interface ExportOption {
  id: DataType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

interface FormatOption {
  id: ExportFormat;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

// Export options
const EXPORT_OPTIONS: ExportOption[] = [
  { id: 'all', label: 'All Data', icon: 'layers', description: 'Complete history including activities, goals, and logs' },
  { id: 'profiles', label: 'Calibration Data', icon: 'speedometer', description: 'Only step length calibration settings' },
];

// Format options
const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'json', label: 'JSON', icon: 'code-slash', description: 'Complete data with all fields' },
  { id: 'csv', label: 'CSV', icon: 'grid', description: 'Spreadsheet-compatible format' },
];

// Provider options
const PROVIDER_OPTIONS: { id: BackupProvider; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'local', label: 'Local Export', icon: 'phone-portrait' },
  { id: 'google_drive', label: 'Google Drive', icon: 'logo-google' },
  { id: 'icloud', label: 'iCloud', icon: 'cloud' },
];

export default function SettingsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: '' });

  // Export state
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>(['all']);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [showExportModal, setShowExportModal] = useState(false);

  // Backup state
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [backupStats, setBackupStats] = useState<{
    totalBackups: number;
    lastBackupTime: number | null;
    totalSize: string;
    autoBackupEnabled: boolean;
  } | null>(null);

  // Wakeup time settings state
  const [wakeupSettings, setWakeupSettings] = useState<WakeupSettings | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load backup config on mount
  useEffect(() => {
    loadBackupSettings();
    loadWakeupTimeSettings();
  }, []);

  const loadBackupSettings = async () => {
    const [config, history, stats] = await Promise.all([
      loadBackupConfig(),
      getBackupHistory(),
      getBackupStats(),
    ]);
    setBackupConfig(config);
    setBackupHistory(history);
    setBackupStats(stats);
  };

  const loadWakeupTimeSettings = async () => {
    const settings = await loadWakeupSettings();
    setWakeupSettings(settings);
  };

  const handleWakeupTimeChange = async (time: Date) => {
    if (!wakeupSettings) return;
    
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const newWakeupTime = `${hours}:${minutes}`;
    
    const newSettings: WakeupSettings = {
      ...wakeupSettings,
      wakeupTime: newWakeupTime,
    };
    
    await saveWakeupSettings(newSettings);
    setWakeupSettings(newSettings);
    setShowTimePicker(false);
  };

  const handleAwakeFilteringToggle = async (value: boolean) => {
    if (!wakeupSettings) return;
    
    const newSettings: WakeupSettings = {
      ...wakeupSettings,
      enableAwakeFiltering: value,
    };
    
    await saveWakeupSettings(newSettings);
    setWakeupSettings(newSettings);
  };

  // Format time for display
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Refresh stores after import
  const refreshStores = async () => {
    await Promise.all([
      useActivityStore.getState().loadActivities(),
      useGoalStore.getState().loadGoals(),
      useHydrationStore.getState().loadLogs(),
      useCalibrationStore.getState().loadProfiles(),
    ]);
  };

  // Handle export
  const handleExport = async () => {
    setIsLoading(true);
    setProgress({ percent: 0, message: 'Starting export...' });
    setShowExportModal(true);

    const result = await exportData(
      selectedFormat,
      selectedDataTypes,
      (percent, message) => setProgress({ percent, message })
    );

    setIsLoading(false);
    setShowExportModal(false);

    if (result.success) {
      Alert.alert(
        'Export Complete',
        `Successfully exported ${result.recordCount} records.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Export Failed', result.error || 'Unknown error', [{ text: 'OK' }]);
    }
  };

  // Handle import
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      Alert.alert(
        'Import Data',
        'Choose import strategy:',
        [
          {
            text: 'Merge',
            onPress: () => performImport(file.uri, 'merge'),
          },
          {
            text: 'Replace All',
            style: 'destructive',
            onPress: () => performImport(file.uri, 'replace'),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const performImport = async (uri: string, strategy: 'merge' | 'replace') => {
    setIsLoading(true);
    setProgress({ percent: 0, message: 'Reading file...' });
    setShowExportModal(true);

    const content = await readImportFile(uri);
    if (!content) {
      setIsLoading(false);
      setShowExportModal(false);
      Alert.alert('Error', 'Failed to read file');
      return;
    }

    const result = await importFromJSON(content, {
      mergeStrategy: strategy,
      onProgress: (percent, message) => setProgress({ percent, message }),
    });

    await refreshStores();
    setIsLoading(false);
    setShowExportModal(false);

    if (result.success) {
      const summary = `
Activities: ${result.imported.activities}
Goals: ${result.imported.goals}
Hydration: ${result.imported.hydration}
Profiles: ${result.imported.profiles}
${result.errors.length > 0 ? `\nErrors: ${result.errors.length}` : ''}
      `.trim();

      Alert.alert('Import Complete', summary, [{ text: 'OK' }]);
    } else {
      Alert.alert(
        'Import Failed',
        result.errors.join('\n') || 'Unknown error',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle backup
  const handleBackup = async () => {
    setIsLoading(true);
    setProgress({ percent: 0, message: 'Starting backup...' });
    setShowExportModal(true);

    const result = await performBackup((percent, message) =>
      setProgress({ percent, message })
    );

    setIsLoading(false);
    setShowExportModal(false);

    if (result.success) {
      await loadBackupSettings();
      Alert.alert('Backup Complete', 'Your data has been backed up successfully.', [
        { text: 'OK' },
      ]);
    } else {
      Alert.alert('Backup Failed', result.error || 'Unknown error', [{ text: 'OK' }]);
    }
  };

  // Toggle data type selection (Radio behavior)
  const toggleDataType = (type: DataType) => {
    setSelectedDataTypes([type]);
  };

  // Update backup config (for future use)
  // const updateBackupConfig = async (updates: Partial<BackupConfig>) => {
  //   if (!backupConfig) return;
  //   const newConfig = { ...backupConfig, ...updates };
  //   await saveBackupConfig(newConfig);
  //   setBackupConfig(newConfig);
  // };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Render export modal
  const renderProgressModal = () => (
    <Modal visible={showExportModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Card style={styles.modalContent}>
          <ActivityIndicator size="large" color={DesignTokens.primary} />
          <ThemedText style={styles.progressText}>{progress.message}</ThemedText>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress.percent}%` },
              ]}
            />
          </View>
          <ThemedText style={styles.progressPercent}>{progress.percent}%</ThemedText>
        </Card>
      </View>
    </Modal>
  );

  // Render time picker modal
  const renderTimePickerModal = () => {
    if (!wakeupSettings) return null;
    
    const [hours, minutes] = wakeupSettings.wakeupTime.split(':').map(Number);
    
    return (
      <Modal visible={showTimePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.timePickerCard}>
            <ThemedText style={styles.timePickerTitle}>Select Wake Up Time</ThemedText>
            
            <View style={styles.timePickerRow}>
              {/* Hours */}
              <View style={styles.timePickerColumn}>
                <TouchableOpacity
                  onPress={() => {
                    const newHours = (hours + 1) % 24;
                    const newSettings = { ...wakeupSettings, wakeupTime: `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}` };
                    setWakeupSettings(newSettings);
                  }}
                  style={styles.timePickerButton}
                >
                  <Ionicons name="chevron-up" size={24} color={DesignTokens.primary} />
                </TouchableOpacity>
                <ThemedText style={styles.timePickerValue}>{hours.toString().padStart(2, '0')}</ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    const newHours = (hours - 1 + 24) % 24;
                    const newSettings = { ...wakeupSettings, wakeupTime: `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}` };
                    setWakeupSettings(newSettings);
                  }}
                  style={styles.timePickerButton}
                >
                  <Ionicons name="chevron-down" size={24} color={DesignTokens.primary} />
                </TouchableOpacity>
              </View>
              
              <ThemedText style={styles.timePickerSeparator}>:</ThemedText>
              
              {/* Minutes */}
              <View style={styles.timePickerColumn}>
                <TouchableOpacity
                  onPress={() => {
                    const newMinutes = (minutes + 5) % 60;
                    const newSettings = { ...wakeupSettings, wakeupTime: `${hours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}` };
                    setWakeupSettings(newSettings);
                  }}
                  style={styles.timePickerButton}
                >
                  <Ionicons name="chevron-up" size={24} color={DesignTokens.primary} />
                </TouchableOpacity>
                <ThemedText style={styles.timePickerValue}>{minutes.toString().padStart(2, '0')}</ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    const newMinutes = (minutes - 5 + 60) % 60;
                    const newSettings = { ...wakeupSettings, wakeupTime: `${hours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}` };
                    setWakeupSettings(newSettings);
                  }}
                  style={styles.timePickerButton}
                >
                  <Ionicons name="chevron-down" size={24} color={DesignTokens.primary} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.timePickerButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setWakeupSettings({ ...wakeupSettings }); // Reset
                  setShowTimePicker(false);
                }}
                style={styles.timePickerButtonStyle}
              />
              <Button
                title="Save"
                onPress={async () => {
                  await saveWakeupSettings(wakeupSettings);
                  setShowTimePicker(false);
                }}
                style={styles.timePickerButtonStyle}
              />
            </View>
          </Card>
        </View>
      </Modal>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText variant="h1" style={styles.headerTitle}>Settings</ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Export Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Export Data
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Export your fitness data in various formats
          </ThemedText>

          {/* Format Selection */}
          <ThemedText style={styles.label}>Export Format</ThemedText>
          <View style={styles.formatGrid}>
            {FORMAT_OPTIONS.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatCard,
                  selectedFormat === format.id && styles.formatCardSelected,
                ]}
                onPress={() => setSelectedFormat(format.id)}>
                <Ionicons
                  name={format.icon}
                  size={24}
                  color={
                    selectedFormat === format.id
                      ? DesignTokens.primary
                      : DesignTokens.textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.formatLabel,
                    selectedFormat === format.id && styles.formatLabelSelected,
                  ]}>
                  {format.label}
                </ThemedText>
                <ThemedText style={styles.formatDescription}>
                  {format.description}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Data Type Selection */}
          <ThemedText style={styles.label}>Data to Export</ThemedText>
          <View style={styles.dataTypeContainer}>
            {EXPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.dataTypeChip,
                  selectedDataTypes.includes(option.id) && styles.dataTypeChipSelected,
                ]}
                onPress={() => toggleDataType(option.id)}>
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={
                    selectedDataTypes.includes(option.id)
                      ? DesignTokens.white
                      : DesignTokens.textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.dataTypeChipText,
                    selectedDataTypes.includes(option.id) &&
                    styles.dataTypeChipTextSelected,
                  ]}>
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Export Summary */}
          <Card style={styles.summaryCard}>
            <Ionicons name="information-circle" size={20} color={DesignTokens.primary} />
            <ThemedText style={styles.summaryText}>
              {getExportSummary(selectedDataTypes)}
            </ThemedText>
          </Card>

          <Button
            title="Export Data"
            onPress={handleExport}
            disabled={isLoading}
            style={styles.actionButton}
          />
        </View>

        {/* Import Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Import Data
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Restore data from a previous export
          </ThemedText>

          <Card style={styles.warningCard}>
            <Ionicons name="warning" size={20} color={DesignTokens.warning} />
            <ThemedText style={styles.warningText}>
              Importing will modify your existing data. Make sure to backup first!
            </ThemedText>
          </Card>

          <Button
            title="Import from File"
            variant="secondary"
            onPress={handleImport}
            disabled={isLoading}
            style={styles.actionButton}
          />
        </View>

        {/* Backup Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Backup & Restore
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Manage your data backups
          </ThemedText>

          {backupStats && (
            <Card style={styles.statsCard}>
              <View style={styles.statRow}>
                <ThemedText style={styles.statLabel}>Total Backups</ThemedText>
                <ThemedText style={styles.statValue}>{backupStats.totalBackups}</ThemedText>
              </View>
              <View style={styles.statRow}>
                <ThemedText style={styles.statLabel}>Last Backup</ThemedText>
                <ThemedText style={styles.statValue}>
                  {backupStats.lastBackupTime
                    ? formatDate(backupStats.lastBackupTime)
                    : 'Never'}
                </ThemedText>
              </View>
              <View style={styles.statRow}>
                <ThemedText style={styles.statLabel}>Auto Backup</ThemedText>
                <ThemedText
                  style={[
                    styles.statValue,
                    backupStats.autoBackupEnabled ? styles.enabledText : styles.disabledText,
                  ]}>
                  {backupStats.autoBackupEnabled ? 'Enabled' : 'Disabled'}
                </ThemedText>
              </View>
            </Card>
          )}

          <Button
            title="Create Backup Now"
            onPress={handleBackup}
            disabled={isLoading}
            style={styles.actionButton}
          />

          {/* Backup History */}
          {backupHistory.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <ThemedText style={styles.label}>Recent Backups</ThemedText>
                <TouchableOpacity onPress={() => clearBackupHistory().then(loadBackupSettings)}>
                  <ThemedText style={styles.clearHistoryText}>Clear History</ThemedText>
                </TouchableOpacity>
              </View>

              {backupHistory.slice(0, 5).map((backup) => (
                <Card key={backup.id} style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <Ionicons
                      name={
                        backup.provider === 'google_drive'
                          ? 'logo-google'
                          : backup.provider === 'icloud'
                            ? 'cloud'
                            : 'phone-portrait'
                      }
                      size={20}
                      color={DesignTokens.textSecondary}
                    />
                    <View style={styles.historyInfo}>
                      <ThemedText style={styles.historyDate}>
                        {formatDate(backup.timestamp)}
                      </ThemedText>
                      <ThemedText style={styles.historySize}>{backup.size}</ThemedText>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        deleteBackupFromHistory(backup.id).then(loadBackupSettings)
                      }>
                      <Ionicons name="trash" size={20} color={DesignTokens.error} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Awake Hours Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Awake Hours
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Set your wake up time to receive notifications only when you're awake
          </ThemedText>

          {wakeupSettings && (
            <Card style={styles.aboutCard}>
              {/* Enable/Disable Toggle */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <ThemedText style={styles.settingLabel}>Enable Awake Filtering</ThemedText>
                  <ThemedText style={styles.settingDescription}>
                    Only send notifications during awake hours
                  </ThemedText>
                </View>
                <Switch
                  value={wakeupSettings.enableAwakeFiltering}
                  onValueChange={handleAwakeFilteringToggle}
                  trackColor={{ false: DesignTokens.border, true: DesignTokens.primary }}
                  thumbColor={DesignTokens.white}
                />
              </View>

              {/* Wake up time picker */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <ThemedText style={styles.settingLabel}>Wake up time</ThemedText>
                  <ThemedText style={styles.settingDescription}>
                    Notifications will be sent from this time for 16 hours
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    const [hours, minutes] = wakeupSettings.wakeupTime.split(':').map(Number);
                    const time = new Date();
                    time.setHours(hours, minutes, 0, 0);
                    setShowTimePicker(true);
                  }}
                  disabled={!wakeupSettings.enableAwakeFiltering}
                >
                  <ThemedText
                    style={[
                      styles.timeButtonText,
                      !wakeupSettings.enableAwakeFiltering && styles.timeButtonDisabled,
                    ]}
                  >
                    {formatTimeDisplay(wakeupSettings.wakeupTime)}
                  </ThemedText>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={
                      wakeupSettings.enableAwakeFiltering
                        ? DesignTokens.textSecondary
                        : DesignTokens.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>
            </Card>
          )}
        </View>

        {/* Calibration Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Calibration
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Improve accuracy by calibrating your stride length
          </ThemedText>

          <Card style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <Ionicons name="speedometer" size={24} color={DesignTokens.primary} />
              <View style={styles.aboutInfo}>
                <ThemedText style={styles.aboutTitle}>Step Calibration</ThemedText>
                <ThemedText style={styles.aboutDescription}>
                  Walk or run a known distance to calculate your exact stride length.
                </ThemedText>
              </View>
            </View>
            <Button
              title="Start Calibration"
              onPress={() => router.push('/calibration')}
              style={styles.actionButton}
            />
          </Card>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            About
          </ThemedText>
          <Card style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <Ionicons name="fitness" size={24} color={DesignTokens.primary} />
              <View style={styles.aboutInfo}>
                <ThemedText style={styles.aboutTitle}>Stryde</ThemedText>
                <ThemedText style={styles.aboutVersion}>Version 1.0.0</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.aboutDescription}>
              Advanced step tracking and fitness analytics for walkers and hikers.
            </ThemedText>
          </Card>
        </View>
      </ScrollView>

      {renderProgressModal()}
      {renderTimePickerModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    // fontSize and fontWeight handled by variant="h1"
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    color: DesignTokens.textSecondary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: DesignTokens.textPrimary,
  },
  formatGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formatCard: {
    flex: 1,
    backgroundColor: DesignTokens.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formatCardSelected: {
    borderColor: DesignTokens.primary,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    color: DesignTokens.textPrimary,
  },
  formatLabelSelected: {
    color: DesignTokens.primary,
  },
  formatDescription: {
    fontSize: 10,
    color: DesignTokens.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  dataTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dataTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignTokens.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  dataTypeChipSelected: {
    backgroundColor: DesignTokens.primary,
  },
  dataTypeChipText: {
    fontSize: 13,
    color: DesignTokens.textSecondary,
  },
  dataTypeChipTextSelected: {
    color: DesignTokens.white,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: DesignTokens.surface,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: DesignTokens.textSecondary,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: `${DesignTokens.warning}20`,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: DesignTokens.warning,
  },
  actionButton: {
    marginTop: 8,
  },
  statsCard: {
    marginBottom: 16,
    backgroundColor: DesignTokens.surface,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.border,
  },
  statLabel: {
    color: DesignTokens.textSecondary,
  },
  statValue: {
    fontWeight: '600',
  },
  enabledText: {
    color: DesignTokens.accent,
  },
  disabledText: {
    color: DesignTokens.textSecondary,
  },
  historySection: {
    marginTop: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearHistoryText: {
    color: DesignTokens.error,
    fontSize: 13,
  },
  historyCard: {
    marginBottom: 8,
    backgroundColor: DesignTokens.surface,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  historySize: {
    fontSize: 12,
    color: DesignTokens.textSecondary,
  },
  aboutCard: {
    backgroundColor: DesignTokens.surface,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  aboutInfo: {
    flex: 1,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  aboutVersion: {
    fontSize: 13,
    color: DesignTokens.textSecondary,
  },
  aboutDescription: {
    fontSize: 13,
    color: DesignTokens.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    padding: 24,
    backgroundColor: DesignTokens.surface,
  },
  progressText: {
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: DesignTokens.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: DesignTokens.primary,
  },
  progressPercent: {
    marginTop: 8,
    fontSize: 12,
    color: DesignTokens.textSecondary,
  },
  // Awake Hours settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: DesignTokens.textPrimary,
  },
  settingDescription: {
    fontSize: 13,
    color: DesignTokens.textSecondary,
    marginTop: 2,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignTokens.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: DesignTokens.primary,
  },
  timeButtonDisabled: {
    color: DesignTokens.textSecondary,
  },
  // Time picker modal styles
  timePickerCard: {
    width: '85%',
    maxWidth: 300,
    padding: 24,
    backgroundColor: DesignTokens.surface,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timePickerColumn: {
    alignItems: 'center',
  },
  timePickerButton: {
    padding: 8,
  },
  timePickerValue: {
    fontSize: 36,
    fontWeight: '700',
    color: DesignTokens.primary,
    marginVertical: 8,
  },
  timePickerSeparator: {
    fontSize: 36,
    fontWeight: '700',
    marginHorizontal: 16,
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerButtonStyle: {
    flex: 1,
  },
});
