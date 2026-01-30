import { ChaseTransaction } from './types';

export interface ChaseStats {
  currentBalance: number;
  depositsThisMonth: number;
  withdrawalsThisMonth: number;
}

export function calculateChaseStats(transactions: ChaseTransaction[]): ChaseStats {
  // Get current balance from the most recent transaction that has a balance
  let currentBalance = 0;
  for (const transaction of transactions) {
    if (transaction.balance !== null) {
      currentBalance = transaction.balance;
      break; // Transactions are sorted newest first
    }
  }

  // Get current month/year
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate deposits and withdrawals for this month
  let depositsThisMonth = 0;
  let withdrawalsThisMonth = 0;

  transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.timestamp);
    if (
      transactionDate.getMonth() === currentMonth &&
      transactionDate.getFullYear() === currentYear
    ) {
      if (transaction.amount > 0) {
        depositsThisMonth += transaction.amount;
      } else {
        withdrawalsThisMonth += Math.abs(transaction.amount);
      }
    }
  });

  return {
    currentBalance,
    depositsThisMonth,
    withdrawalsThisMonth,
  };
}
