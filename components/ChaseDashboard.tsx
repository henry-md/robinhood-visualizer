"use client";

import { useState, useMemo, useEffect } from "react";
import fuzzysort from "fuzzysort";
import { ChaseFile, ChaseTransaction } from "@/lib/types";
import ChaseTransactions from "./ChaseTransactions";
import ChaseFileList from "./ChaseFileList";
import StatsBlock from "./StatsBlock";
import SearchBar, { SearchMode } from "./SearchBar";
import { calculateChaseStats } from "@/lib/chaseStats";

interface ChaseDashboardProps {
  files: ChaseFile[];
  onRemoveFile: (filename: string) => void;
  onClearAll: () => void;
  onAddMore: () => void;
}

export default function ChaseDashboard({ files, onRemoveFile, onClearAll, onAddMore }: ChaseDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>('fuzzy');
  const [activeFileTab, setActiveFileTab] = useState(0);

  // Reset active tab if it's out of bounds
  useEffect(() => {
    if (activeFileTab >= files.length && files.length > 0) {
      setActiveFileTab(files.length - 1);
    }
  }, [files.length, activeFileTab]);

  // Combine all transactions for stats
  const allTransactions = useMemo(() => {
    return files.flatMap(f => f.transactions);
  }, [files]);

  const stats = calculateChaseStats(allTransactions);

  // Get transactions for active file tab
  const activeTransactions = useMemo(() => {
    return files[activeFileTab]?.transactions || [];
  }, [files, activeFileTab]);

  // Filter transactions based on search mode
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeTransactions;
    }

    if (searchMode === 'fuzzy') {
      // Use fuzzysort library for fast, optimized fuzzy search
      const results = fuzzysort.go(searchQuery, activeTransactions, {
        keys: ['description', 'type', 'postingDate'],
        threshold: -10000, // Allow fuzzy matches
      });
      return results.map(result => result.obj);
    } else {
      // Use regex search
      try {
        const regex = new RegExp(searchQuery, "i");
        return activeTransactions.filter((transaction) => {
          return (
            regex.test(transaction.description) ||
            regex.test(transaction.type) ||
            regex.test(transaction.postingDate)
          );
        });
      } catch (error) {
        // Invalid regex - return all transactions
        console.error("Invalid regex:", error);
        return activeTransactions;
      }
    }
  }, [activeTransactions, searchQuery, searchMode]);

  return (
    <div className="space-y-8">
      <ChaseFileList
        files={files}
        onRemoveFile={onRemoveFile}
        onClearAll={onClearAll}
        onAddMore={onAddMore}
      />

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

      <div className="space-y-4">
        {/* File Tabs */}
        {files.length > 1 && (
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              {files.map((file, index) => (
                <button
                  key={file.filename}
                  onClick={() => setActiveFileTab(index)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                    activeFileTab === index
                      ? 'border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {file.filename}
                </button>
              ))}
            </nav>
          </div>
        )}

        <ChaseTransactions transactions={filteredTransactions} />
      </div>
    </div>
  );
}
