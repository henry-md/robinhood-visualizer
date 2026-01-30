"use client";

import { useState, useMemo } from "react";
import fuzzysort from "fuzzysort";
import { ChaseTransaction } from "@/lib/types";
import ChaseTransactions from "./ChaseTransactions";
import StatsBlock from "./StatsBlock";
import SearchBar, { SearchMode } from "./SearchBar";
import { calculateChaseStats } from "@/lib/chaseStats";

interface ChaseDashboardProps {
  transactions: ChaseTransaction[];
}

export default function ChaseDashboard({ transactions }: ChaseDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>('fuzzy');
  const stats = calculateChaseStats(transactions);

  // Filter transactions based on search mode
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return transactions;
    }

    if (searchMode === 'fuzzy') {
      // Use fuzzysort library for fast, optimized fuzzy search
      const results = fuzzysort.go(searchQuery, transactions, {
        keys: ['description', 'type', 'postingDate'],
        threshold: -10000, // Allow fuzzy matches
      });
      return results.map(result => result.obj);
    } else {
      // Use regex search
      try {
        const regex = new RegExp(searchQuery, "i");
        return transactions.filter((transaction) => {
          return (
            regex.test(transaction.description) ||
            regex.test(transaction.type) ||
            regex.test(transaction.postingDate)
          );
        });
      } catch (error) {
        // Invalid regex - return all transactions
        console.error("Invalid regex:", error);
        return transactions;
      }
    }
  }, [transactions, searchQuery, searchMode]);

  return (
    <div className="space-y-8">
      <StatsBlock
        stats={[
          {
            label: "Current Balance",
            value: `$${stats.currentBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
          {
            label: "Deposits This Month",
            value: `$${stats.depositsThisMonth.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "green",
          },
          {
            label: "Withdrawals This Month",
            value: `$${stats.withdrawalsThisMonth.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "red",
          },
        ]}
      />
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        mode={searchMode}
        onModeChange={setSearchMode}
        placeholder={
          searchMode === 'fuzzy'
            ? "Search transactions (fuzzy matching)..."
            : "Search transactions (regex)..."
        }
      />
      <ChaseTransactions transactions={filteredTransactions} />
    </div>
  );
}
