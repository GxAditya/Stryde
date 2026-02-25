import { useState, useCallback } from 'react';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  content_type: string;
}

interface Release {
  name: string;
  assets: ReleaseAsset[];
}

export const useDownload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  const download = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDownloadProgress('Fetching latest release...');

    try {
      // Fetch latest release from GitHub API
      const response = await fetch('https://api.github.com/repos/GxAditya/Stryde/releases/latest', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch release: ${response.statusText}`);
      }

      const release: Release = await response.json();
      setDownloadProgress('Finding Android APK...');

      // Find the APK asset (case-insensitive search for .apk)
      const apkAsset = release.assets.find(
        (asset) => asset.name.toLowerCase().endsWith('.apk')
      );

      if (!apkAsset) {
        throw new Error('No APK found in latest release');
      }

      setDownloadProgress('Downloading...');

      // Fetch the APK file as a blob
      const downloadResponse = await fetch(apkAsset.browser_download_url);
      
      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.statusText}`);
      }

      const blob = await downloadResponse.blob();
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = apkAsset.name;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setDownloadProgress('Download started!');
      setTimeout(() => setDownloadProgress(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { download, isLoading, error, downloadProgress };
};
