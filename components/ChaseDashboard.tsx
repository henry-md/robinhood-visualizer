"use client";

import { useState, useMemo, useEffect } from "react";
import fuzzysort from "fuzzysort";
import { ChaseFile } from "@/lib/types";
import ChaseTransactions from "./ChaseTransactions";
import ChaseFileList from "./ChaseFileList";
import StatsBlock from "./StatsBlock";
import SearchBar, { SearchMode } from "./SearchBar";
import TransactionFilters, { FilterState } from "./TransactionFilters";
import AINotification from "./AINotification";
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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
  });
  const [aiIndices, setAiIndices] = useState<number[]>([]);
  const [aiMessage, setAiMessage] = useState<string>("");
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      minAmount: "",
      maxAmount: "",
      startDate: "",
      endDate: "",
    });
  };

  // Clamp active tab to valid bounds (avoids useEffect for state updates)
  const safeActiveTab = Math.min(activeFileTab, Math.max(0, files.length - 1));

  // Combine all transactions for stats
  const allTransactions = useMemo(() => {
    return files.flatMap(f => f.transactions);
  }, [files]);

  const stats = calculateChaseStats(allTransactions);

  // Get transactions for active file tab
  const activeTransactions = useMemo(() => {
    return files[safeActiveTab]?.transactions || [];
  }, [files, safeActiveTab]);

  // AI Search effect
  useEffect(() => {
    const performAISearch = async () => {
      if (searchMode !== 'ai' || !searchQuery.trim()) {
        setAiIndices([]);
        setAiMessage("");
        return;
      }

      setIsAiSearching(true);
      try {
        const response = await fetch('/api/ai-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            transactions: activeTransactions,
          }),
        });

        if (!response.ok) {
          throw new Error('AI search failed');
        }

        const data = await response.json();
        setAiIndices(data.indices || []);
        setAiMessage(data.message || "");
      } catch (error) {
        console.error('AI search error:', error);
        setAiIndices([]);
        setAiMessage("Failed to perform AI search. Please try again.");
      } finally {
        setIsAiSearching(false);
      }
    };

    performAISearch();
  }, [searchQuery, searchMode, activeTransactions]);

  // Filter transactions based on search mode and filters
  const filteredTransactions = useMemo(() => {
    let filtered = activeTransactions;

    // Only apply filters if the filter panel is visible
    if (showFilters) {
      // Apply amount range filter
      const minAmt = filters.minAmount ? parseFloat(filters.minAmount) : null;
      const maxAmt = filters.maxAmount ? parseFloat(filters.maxAmount) : null;

      if (minAmt !== null || maxAmt !== null) {
        filtered = filtered.filter((transaction) => {
          const absAmount = Math.abs(transaction.amount);
          if (minAmt !== null && absAmount < minAmt) return false;
          if (maxAmt !== null && absAmount > maxAmt) return false;
          return true;
        });
      }

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        filtered = filtered.filter((transaction) => {
          const txDate = new Date(transaction.timestamp);
          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            if (txDate < startDate) return false;
          }
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            // Set to end of day
            endDate.setHours(23, 59, 59, 999);
            if (txDate > endDate) return false;
          }
          return true;
        });
      }
    }

    // Apply text search filter
    if (!searchQuery.trim()) {
      return filtered;
    }

    // AI mode - filter by indices returned from AI
    if (searchMode === 'ai') {
      if (isAiSearching) {
        return []; // Show no results while searching
      }
      return filtered.filter((_, index) => aiIndices.includes(index));
    }

    if (searchMode === 'fuzzy') {
      // Use fuzzysort library for fast, optimized fuzzy search
      const results = fuzzysort.go(searchQuery, filtered, {
        keys: ['description', 'type', 'postingDate', 'category'],
        threshold: -10000, // Allow fuzzy matches
      });
      return results.map(result => result.obj);
    } else {
      // Use regex search
      try {
        const regex = new RegExp(searchQuery, "i");
        return filtered.filter((transaction) => {
          return (
            regex.test(transaction.description) ||
            regex.test(transaction.type) ||
            regex.test(transaction.postingDate) ||
            (transaction.category && regex.test(transaction.category))
          );
        });
      } catch (error) {
        // Invalid regex - return all transactions
        console.error("Invalid regex:", error);
        return filtered;
      }
    }
  }, [activeTransactions, searchQuery, searchMode, filters, showFilters, aiIndices, isAiSearching]);

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
            : searchMode === 'regex'
            ? "Search transactions (regex)..."
            : "Ask AI to search transactions..."
        }
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {searchMode === 'ai' && isAiSearching && searchQuery.trim() && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              AI is analyzing your transactions...
            </p>
          </div>
        </div>
      )}

      {aiMessage && searchMode === 'ai' && !isAiSearching && (
        <AINotification
          message={aiMessage}
          onDismiss={() => setAiMessage("")}
        />
      )}

      {showFilters && (
        <TransactionFilters
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
        />
      )}

      <div className="space-y-4">
        {/* File Tabs */}
        {files.length > 1 && (
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              {files.map((file, index) => (
                <button
                  key={file.filename}
                  onClick={() => setActiveFileTab(index)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${safeActiveTab === index
                      ? 'border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="group/badge relative inline-flex items-center">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${file.accountType === 'credit'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          }`}
                      >
                        {file.accountType === 'credit' ? 'C' : 'D'}
                      </span>
                      {/* Tooltip */}
                      <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/badge:opacity-100 dark:bg-zinc-50 dark:text-zinc-900">
                        {file.accountType === 'credit' ? 'Credit Card' : 'Checking Account'}
                      </span>
                    </span>
                    {file.filename}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        )}

        <ChaseTransactions
          transactions={filteredTransactions}
          totalCount={activeTransactions.length}
        />
      </div>
    </div>
  );
}
