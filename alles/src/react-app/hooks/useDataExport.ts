import { useState } from 'react';

export interface ExportOptions {
  includeTrades: boolean;
  includeStrategies: boolean;
  includeSettings: boolean;
  format: 'csv' | 'json';
  dateRange?: {
    start: string;
    end: string;
  };
}

export function useDataExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importData = async (file: File) => {
    try {
      setError(null);
      const text = await file.text();
      
      // Try to parse as JSON first
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        // If JSON parsing fails, try to handle as CSV
        return { success: false, error: 'Currently only JSON import is supported' };
      }
      
      // Validate data structure
      if (!data.trades && !data.strategies) {
        return { success: false, error: 'Invalid file format - no trade or strategy data found' };
      }
      
      // TODO: Implement actual data import to backend
      console.log('Import data:', data);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import data';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const exportData = async (options: ExportOptions) => {
    try {
      setExporting(true);
      setError(null);

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Export failed');
      }

      if (options.format === 'json') {
        const data = await response.json();
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tradecircle-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tradecircle-export-${new Date().toISOString().split('T')[0]}.${options.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  return { exportData, exporting, error, importData };
}
