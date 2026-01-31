"use client";

import { useState, useEffect } from "react";
import FileUpload from "@/components/FileUpload";
import RobinhoodDashboard from "@/components/RobinhoodDashboard";
import ChaseDashboard from "@/components/ChaseDashboard";
import RecentUploads from "@/components/RecentUploads";
import { parseRobinhoodCSV } from "@/lib/csvParser";
import { DepositData, PortfolioValueData, ChaseTransaction, ChaseFile, FileType } from "@/lib/types";
import { parseAllTransactions, getAllUniqueTickers } from "@/lib/portfolioCalculations";
import { fetchStockPrices, calculatePortfolioValues } from "@/lib/portfolioValue";
import { detectFileType } from "@/lib/fileTypeDetector";
import { parseChaseCSV } from "@/lib/chaseParser";

export default function Home() {
  const [deposits, setDeposits] = useState<DepositData[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioValueData[]>([]);
  const [chaseFiles, setChaseFiles] = useState<ChaseFile[]>([]);
  const [fileType, setFileType] = useState<FileType>('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const saveUploadToRecent = async (type: FileType, files: ChaseFile[] | File) => {
    try {
      const uploadData: any = {
        fileType: type,
        files: []
      };

      if (type === 'chase' && Array.isArray(files)) {
        // For Chase files, read the actual file content
        for (const chaseFile of files) {
          // Store the transactions as JSON string
          uploadData.files.push({
            filename: chaseFile.filename,
            content: JSON.stringify(chaseFile.transactions),
            accountType: chaseFile.accountType
          });
        }
      } else if (type === 'robinhood' && files instanceof File) {
        // For Robinhood, read the file content
        const content = await files.text();
        uploadData.files.push({
          filename: files.name,
          content: content
        });
      }

      await fetch('/api/recent-uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadData)
      });
    } catch (error) {
      console.error('Error saving to recent uploads:', error);
    }
  };

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    setCsvFile(file);

    try {
      // Detect file type
      const detectedType = await detectFileType(file);

      if (detectedType === 'robinhood') {
        setFileType('robinhood');
        const parsedDeposits = await parseRobinhoodCSV(file);
        setDeposits(parsedDeposits);
        // Save to recent uploads
        await saveUploadToRecent('robinhood', file);
      } else if (detectedType === 'chase') {
        setFileType('chase');
        const parsedFile = await parseChaseCSV(file);
        // Append to existing files
        const updatedFiles = [...chaseFiles, parsedFile];
        setChaseFiles(updatedFiles);
        // Save single file upload to recent
        await saveUploadToRecent('chase', [parsedFile]);
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

  const handleBatchFilesSelect = async (files: File[]) => {
    setLoading(true);
    setError(null);

    try {
      const parsedChaseFiles: ChaseFile[] = [];

      // Process all files
      for (const file of files) {
        const detectedType = await detectFileType(file);

        if (detectedType === 'chase') {
          const parsedFile = await parseChaseCSV(file);
          parsedChaseFiles.push(parsedFile);
        } else {
          setError(`File ${file.name} is not a valid Chase CSV file.`);
          return;
        }
      }

      // Update state with all parsed files
      setFileType('chase');
      const updatedFiles = [...chaseFiles, ...parsedChaseFiles];
      setChaseFiles(updatedFiles);

      // Save to recent uploads once with all files
      await saveUploadToRecent('chase', parsedChaseFiles);
    } catch (err) {
      setError("Failed to parse CSV files. Please check the file format.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveChaseFile = (filename: string) => {
    setChaseFiles(prev => {
      const updated = prev.filter(f => f.filename !== filename);
      // If this was the last file, reset file type
      if (updated.length === 0) {
        setFileType('unknown');
      }
      return updated;
    });
  };

  const handleClearAllChaseFiles = () => {
    setChaseFiles([]);
    setFileType('unknown');
  };

  const handleClearAllFiles = () => {
    setChaseFiles([]);
    setDeposits([]);
    setPortfolioData([]);
    setCsvFile(null);
    setFileType('unknown');
  };

  const handleRecentUploadSelect = async (upload: any) => {
    setLoading(true);
    setError(null);

    try {
      // Clear existing data first
      handleClearAllFiles();

      if (upload.fileType === 'robinhood') {
        // Restore Robinhood file
        const fileContent = upload.files[0].content;
        const blob = new Blob([fileContent], { type: 'text/csv' });
        const file = new File([blob], upload.files[0].filename, { type: 'text/csv' });

        setFileType('robinhood');
        setCsvFile(file);
        const parsedDeposits = await parseRobinhoodCSV(file);
        setDeposits(parsedDeposits);
      } else if (upload.fileType === 'chase') {
        // Restore Chase files
        setFileType('chase');
        const restoredFiles: ChaseFile[] = [];

        for (const fileData of upload.files) {
          const transactions = JSON.parse(fileData.content);
          const chaseFile: ChaseFile = {
            filename: fileData.filename,
            transactions: transactions,
            dateRange: {
              start: transactions[0]?.postingDate || '',
              end: transactions[transactions.length - 1]?.postingDate || ''
            },
            accountType: fileData.accountType || 'checking'
          };
          restoredFiles.push(chaseFile);
        }

        setChaseFiles(restoredFiles);
      }
    } catch (err) {
      setError("Failed to restore upload. " + (err as Error).message);
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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Financial Tracker
            </h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Upload your Robinhood or Chase CSV to visualize your financial data
            </p>
          </div>
          <RecentUploads onSelectUpload={handleRecentUploadSelect} />
        </div>

        <div className="space-y-8">
          <FileUpload
            onFileSelect={handleFileSelect}
            onBatchFilesSelect={handleBatchFilesSelect}
            existingFilenames={chaseFiles.map(f => f.filename)}
            currentFileType={fileType}
            onClearFiles={handleClearAllFiles}
          />

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

          {fileType === 'chase' && chaseFiles.length > 0 && (
            <ChaseDashboard
              files={chaseFiles}
              onRemoveFile={handleRemoveChaseFile}
              onClearAll={handleClearAllChaseFiles}
              onAddMore={() => document.getElementById('csv-upload')?.click()}
            />
          )}
        </div>
      </main>
    </div>
  );
}
