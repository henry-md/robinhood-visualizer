import Papa from 'papaparse';
import { RobinhoodTransaction, DepositData } from './types';

// Parse all raw Robinhood transactions (including trades, dividends, etc.)
export function parseAllRobinhoodTransactions(file: File): Promise<RobinhoodTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RobinhoodTransaction>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Return all transactions, sorted by date
          const transactions = results.data
            .filter((row) => row["Activity Date"] && row["Activity Date"].trim() !== "")
            .map((row) => ({
              ...row,
              timestamp: new Date(row["Activity Date"]).getTime(),
            }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Sort newest first

          resolve(transactions as RobinhoodTransaction[]);
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

export function parseRobinhoodCSV(file: File): Promise<DepositData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RobinhoodTransaction>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Extract all ACH transactions (deposits and withdrawals)
          const transactions = results.data
            .filter((row) => row["Trans Code"] === "ACH")
            .map((row) => {
              const amount = parseFloat(
                row.Amount.replace(/[$,()]/g, "").trim()
              );
              const description = row.Description?.toLowerCase() || "";
              const isDeposit = description.includes("deposit");
              const isWithdrawal = description.includes("withdrawal");

              console.log("Transaction:", {
                date: row["Activity Date"],
                description: row.Description,
                amount: amount,
                isDeposit,
                isWithdrawal,
              });

              return {
                date: row["Activity Date"],
                amount: amount,
                isDeposit: isDeposit,
                isWithdrawal: isWithdrawal,
              };
            })
            .filter((t) => !isNaN(t.amount) && (t.isDeposit || t.isWithdrawal));

          // Group by date
          const dateMap = new Map<string, { deposit: number; withdrawal: number }>();

          transactions.forEach((t) => {
            if (!dateMap.has(t.date)) {
              dateMap.set(t.date, { deposit: 0, withdrawal: 0 });
            }
            const entry = dateMap.get(t.date)!;
            if (t.isDeposit) {
              entry.deposit += Math.abs(t.amount);
            } else if (t.isWithdrawal) {
              entry.withdrawal += Math.abs(t.amount);
            }
          });

          // Convert to array and sort by date
          const data: DepositData[] = Array.from(dateMap.entries())
            .map(([date, values]) => {
              const dateObj = new Date(date);
              return {
                date: date,
                timestamp: dateObj.getTime(),
                deposit: values.deposit,
                withdrawal: values.withdrawal,
                amount: values.deposit, // For backwards compatibility
              };
            })
            .sort((a, b) => a.timestamp - b.timestamp);

          resolve(data);
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
