import Papa from 'papaparse';
import { ChaseTransaction, ChaseFile } from './types';

// Checking account CSV format
interface ChaseCheckingCSVRow {
  'Details': string;
  'Posting Date': string;
  'Description': string;
  'Amount': string;
  'Type': string;
  'Balance': string;
  'Check or Slip #': string;
}

// Credit card CSV format
interface ChaseCreditCSVRow {
  'Transaction Date': string;
  'Post Date': string;
  'Description': string;
  'Category': string;
  'Type': string;
  'Amount': string;
  'Memo': string;
}

export function parseChaseCSV(file: File): Promise<ChaseFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: ChaseTransaction[] = [];

          // Detect CSV format by checking for specific columns
          const firstRow = results.data[0] as ChaseCreditCSVRow | ChaseCheckingCSVRow;
          const isCreditCard = 'Transaction Date' in firstRow && 'Post Date' in firstRow;
          const isChecking = 'Details' in firstRow && 'Posting Date' in firstRow;

          if (!isCreditCard && !isChecking) {
            reject(new Error('Unrecognized Chase CSV format'));
            return;
          }

          if (isCreditCard) {
            // Parse credit card format
            (results.data as ChaseCreditCSVRow[]).forEach((row) => {
              const transactionDate = row['Transaction Date']?.trim();
              const postDate = row['Post Date']?.trim();
              const description = row['Description']?.trim();
              const category = row['Category']?.trim();
              const type = row['Type']?.trim();
              const amountStr = row['Amount']?.trim();
              const memo = row['Memo']?.trim() || '';

              // Skip rows with missing critical data
              if (!postDate || !description || !amountStr) {
                return;
              }

              // Parse amount (remove commas and parse as float)
              const amount = parseFloat(amountStr.replace(/,/g, ''));
              if (isNaN(amount)) {
                return;
              }

              // Parse date (MM/DD/YYYY format) - use Post Date as primary
              const [month, day, year] = postDate.split('/');
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const timestamp = date.getTime();

              transactions.push({
                transactionDate,
                postingDate: postDate,
                description,
                category,
                amount,
                type,
                balance: null,
                memo,
                timestamp,
                accountType: 'credit',
              });
            });
          } else {
            // Parse checking account format
            (results.data as ChaseCheckingCSVRow[]).forEach((row) => {
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
                accountType: 'checking',
              });
            });
          }

          // Sort by timestamp (newest first)
          transactions.sort((a, b) => b.timestamp - a.timestamp);

          // Calculate date range
          let startDate = '';
          let endDate = '';
          if (transactions.length > 0) {
            endDate = transactions[0].postingDate; // Newest (sorted first)
            startDate = transactions[transactions.length - 1].postingDate; // Oldest
          }

          const accountTypeLabel = isCreditCard ? 'credit card' : 'checking';
          const accountType = isCreditCard ? 'credit' : 'checking';
          console.log(`✅ Parsed ${transactions.length} Chase ${accountTypeLabel} transactions from ${file.name}`);

          resolve({
            filename: file.name,
            transactions,
            dateRange: {
              start: startDate,
              end: endDate,
            },
            accountType,
          });
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
