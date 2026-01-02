import Papa from 'papaparse';
import { RobinhoodTransaction, DepositData } from './types';

export function parseRobinhoodCSV(file: File): Promise<DepositData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RobinhoodTransaction>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const deposits = results.data
            .filter((row) => {
              return (
                row["Trans Code"] === "ACH" &&
                row.Description.includes("Deposit")
              );
            })
            .map((row) => {
              const amount = parseFloat(
                row.Amount.replace(/[$,()]/g, "").trim()
              );
              return {
                date: row["Activity Date"],
                amount: amount,
              };
            })
            .filter((deposit) => !isNaN(deposit.amount));

          // Sort by date
          deposits.sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

          resolve(deposits);
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
