"use client";

import { useState, useMemo } from "react";
import { ChaseTransaction } from "@/lib/types";
import ChaseTransactions from "./ChaseTransactions";
import StatsBlock from "./StatsBlock";
import SearchBar from "./SearchBar";
import { calculateChaseStats } from "@/lib/chaseStats";

interface ChaseDashboardProps {
  transactions: ChaseTransaction[];
}

export default function ChaseDashboard({ transactions }: ChaseDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const stats = calculateChaseStats(transactions);

  // Filter transactions based on regex search
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return transactions;
    }

    try {
      // Create case-insensitive regex
      const regex = new RegExp(searchQuery, "i");
      return transactions.filter((transaction) => {
        // Search in description, type, and date
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
  }, [transactions, searchQuery]);

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
        placeholder="Search transactions (regex supported)..."
      />
      <ChaseTransactions transactions={filteredTransactions} />
    </div>
  );
}
