"use client";

import { ChaseTransaction } from "@/lib/types";

interface ChaseTransactionsProps {
  transactions: ChaseTransaction[];
  totalCount?: number;
  showAccountType?: boolean;
  sortColumn?: 'date' | 'description' | 'category' | 'type' | 'amount' | 'balance';
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: 'date' | 'description' | 'category' | 'type' | 'amount' | 'balance') => void;
}

type SortColumn = 'date' | 'description' | 'category' | 'type' | 'amount' | 'balance';

function SortButton({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort
}: {
  column: SortColumn;
  label: string;
  sortColumn?: SortColumn;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: SortColumn) => void;
}) {
  const isActive = sortColumn === column;

  return (
    <button
      onClick={() => onSort?.(column)}
      className="flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-400"
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      <span className="text-xs">
        {isActive && sortDirection === 'asc' && '↑'}
        {isActive && sortDirection === 'desc' && '↓'}
        {!isActive && '↕'}
      </span>
    </button>
  );
}

export default function ChaseTransactions({
  transactions,
  totalCount,
  showAccountType = false,
  sortColumn,
  sortDirection,
  onSort
}: ChaseTransactionsProps) {
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

        <div className="overflow-visible">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                {showAccountType && (
                  <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                    Account
                  </th>
                )}
                <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                  <SortButton column="date" label="Date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
                </th>
                <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                  <SortButton column="description" label="Description" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
                </th>
                <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                  <SortButton column="category" label="Category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
                </th>
                <th className="pb-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                  <SortButton column="type" label="Type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
                </th>
                <th className="pb-3 pr-4 text-right font-medium text-zinc-900 dark:text-zinc-50">
                  <SortButton column="amount" label="Amount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
                </th>
                <th className="pb-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                  <SortButton column="balance" label="Balance" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((transaction, index) => (
                <tr
                  key={index}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  {showAccountType && (
                    <td className="py-3 pr-4">
                      <div className="group/badge relative inline-flex items-center">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${transaction.accountType === 'credit'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            }`}
                        >
                          {transaction.accountType === 'credit' ? 'C' : 'D'}
                        </span>
                        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/badge:opacity-100 dark:bg-zinc-50 dark:text-zinc-900">
                          {transaction.filename || (transaction.accountType === 'credit' ? 'Credit Card' : 'Checking Account')}
                        </span>
                      </div>
                    </td>
                  )}
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
                    className={`py-3 pr-4 text-right font-medium ${transaction.amount >= 0
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
