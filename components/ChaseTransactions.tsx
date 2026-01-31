"use client";

import { ChaseTransaction } from "@/lib/types";

interface ChaseTransactionsProps {
  transactions: ChaseTransaction[];
  totalCount?: number;
}

export default function ChaseTransactions({ transactions, totalCount }: ChaseTransactionsProps) {
  const isShowingAll = totalCount !== undefined && transactions.length === totalCount;

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Chase Transactions
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No transactions match your search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Chase Transactions
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Showing {isShowingAll ? 'all ' : ''}{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                  Date
                </th>
                <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                  Description
                </th>
                <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                  Category
                </th>
                <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                  Type
                </th>
                <th className="pb-3 pr-4 text-right font-medium text-zinc-900 dark:text-zinc-50">
                  Amount
                </th>
                <th className="pb-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((transaction, index) => (
                <tr
                  key={index}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                    {transaction.postingDate}
                  </td>
                  <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                    <div className="max-w-md truncate">
                      {transaction.description}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                    {transaction.category || '-'}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {transaction.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td
                    className={`py-3 pr-4 text-right font-medium ${
                      transaction.amount >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {transaction.amount >= 0 ? '+' : ''}
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </td>
                  <td className="py-3 text-right text-zinc-700 dark:text-zinc-300">
                    {transaction.balance !== null
                      ? `$${transaction.balance.toFixed(2)}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
