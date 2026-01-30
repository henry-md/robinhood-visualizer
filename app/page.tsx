"use client";

import { useState, useEffect } from "react";
import FileUpload from "@/components/FileUpload";
import RobinhoodDashboard from "@/components/RobinhoodDashboard";
import ChaseDashboard from "@/components/ChaseDashboard";
import { parseRobinhoodCSV } from "@/lib/csvParser";
import { DepositData, PortfolioValueData, ChaseTransaction, FileType } from "@/lib/types";
import { parseAllTransactions, getAllUniqueTickers } from "@/lib/portfolioCalculations";
import { fetchStockPrices, calculatePortfolioValues } from "@/lib/portfolioValue";
import { detectFileType } from "@/lib/fileTypeDetector";
import { parseChaseCSV } from "@/lib/chaseParser";

export default function Home() {
  const [deposits, setDeposits] = useState<DepositData[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioValueData[]>([]);
  const [chaseTransactions, setChaseTransactions] = useState<ChaseTransaction[]>([]);
  const [fileType, setFileType] = useState<FileType>('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    setCsvFile(file);

    try {
      // Detect file type
      const detectedType = await detectFileType(file);
      setFileType(detectedType);

      if (detectedType === 'robinhood') {
        const parsedDeposits = await parseRobinhoodCSV(file);
        setDeposits(parsedDeposits);
      } else if (detectedType === 'chase') {
        const parsedTransactions = await parseChaseCSV(file);
        setChaseTransactions(parsedTransactions);
      } else {
        setError("Unknown file format. Please upload a Robinhood or Chase CSV file.");
      }
    } catch (err) {
      setError("Failed to parse CSV file. Please check the file format.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPortfolio = async () => {
    if (!csvFile) return;

    setLoading(true);
    setError(null);

    try {
      // Parse all transactions
      const { stockTransactions, cashTransactions } = await parseAllTransactions(csvFile);

      if (stockTransactions.length === 0) {
        setError("No stock transactions found in CSV.");
        return;
      }

      // Get all unique tickers
      const tickers = getAllUniqueTickers(stockTransactions);

      // Get date range
      const allTransactions = [...stockTransactions, ...cashTransactions];
      const startDate = new Date(Math.min(...allTransactions.map(t => t.timestamp)));
      const endDate = new Date();

      // Fetch stock prices
      const priceData = await fetchStockPrices(tickers, startDate, endDate);

      // Calculate portfolio values
      const portfolioValues = calculatePortfolioValues(
        stockTransactions,
        cashTransactions,
        priceData,
        startDate,
        endDate
      );

      setPortfolioData(portfolioValues);
    } catch (err) {
      setError("Failed to calculate portfolio values. " + (err as Error).message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Financial Tracker
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Upload your Robinhood or Chase CSV to visualize your financial data
          </p>
        </div>

        <div className="space-y-8">
          <FileUpload onFileSelect={handleFileSelect} />

          {loading && (
            <div className="text-center text-zinc-600 dark:text-zinc-400">
              Processing your file...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          {fileType === 'robinhood' && deposits.length > 0 && (
            <RobinhoodDashboard
              data={deposits}
              portfolioData={portfolioData}
              onLoadPortfolio={handleLoadPortfolio}
              isLoadingPortfolio={loading && portfolioData.length === 0}
            />
          )}

          {fileType === 'chase' && chaseTransactions.length > 0 && (
            <ChaseDashboard transactions={chaseTransactions} />
          )}
        </div>
      </main>
    </div>
  );
}
