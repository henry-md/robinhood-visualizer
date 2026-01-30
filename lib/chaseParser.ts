import Papa from 'papaparse';
import { ChaseTransaction } from './types';

interface ChaseCSVRow {
  'Details': string;
  'Posting Date': string;
  'Description': string;
  'Amount': string;
  'Type': string;
  'Balance': string;
  'Check or Slip #': string;
}

export function parseChaseCSV(file: File): Promise<ChaseTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<ChaseCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: ChaseTransaction[] = [];

          results.data.forEach((row) => {
            const details = row['Details']?.trim() as 'CREDIT' | 'DEBIT';
            const postingDate = row['Posting Date']?.trim();
            const description = row['Description']?.trim();
            const amountStr = row['Amount']?.trim();
            const type = row['Type']?.trim();
            const balanceStr = row['Balance']?.trim();
            const checkOrSlip = row['Check or Slip #']?.trim() || '';

            // Skip rows with missing critical data
            if (!details || !postingDate || !description || !amountStr) {
              return;
            }

            // Parse amount (remove commas and parse as float)
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            if (isNaN(amount)) {
              return;
            }

            // Parse balance (may be empty)
            let balance: number | null = null;
            if (balanceStr && balanceStr.trim() !== '') {
              balance = parseFloat(balanceStr.replace(/,/g, ''));
            }

            // Parse date (MM/DD/YYYY format)
            const [month, day, year] = postingDate.split('/');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const timestamp = date.getTime();

            transactions.push({
              details,
              postingDate,
              description,
              amount,
              type,
              balance,
              checkOrSlip,
              timestamp,
            });
          });

          // Sort by timestamp (newest first)
          transactions.sort((a, b) => b.timestamp - a.timestamp);

          console.log(`✅ Parsed ${transactions.length} Chase transactions`);
          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
