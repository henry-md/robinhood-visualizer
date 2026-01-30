import { FileType } from './types';

/**
 * Detects the type of CSV file based on its headers
 */
export async function detectFileType(file: File): Promise<FileType> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      const firstLine = text.split('\n')[0].toLowerCase();

      // Check for Robinhood headers
      if (firstLine.includes('activity date') &&
          firstLine.includes('process date') &&
          firstLine.includes('trans code')) {
        resolve('robinhood');
        return;
      }

      // Check for Chase checking account headers
      if (firstLine.includes('details') &&
          firstLine.includes('posting date') &&
          firstLine.includes('description') &&
          firstLine.includes('amount') &&
          firstLine.includes('type')) {
        resolve('chase');
        return;
      }

      // Check for Chase credit card headers
      if (firstLine.includes('transaction date') &&
          firstLine.includes('post date') &&
          firstLine.includes('description') &&
          firstLine.includes('category') &&
          firstLine.includes('amount')) {
        resolve('chase');
        return;
      }

      resolve('unknown');
    };

    reader.onerror = () => {
      resolve('unknown');
    };

    // Read only first 1KB to check headers
    reader.readAsText(file.slice(0, 1024));
  });
}
