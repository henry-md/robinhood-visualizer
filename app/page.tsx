"use client";

import { useState, useEffect } from "react";
import FileUpload from "@/components/FileUpload";
import DepositChart from "@/components/DepositChart";
import { parseRobinhoodCSV } from "@/lib/csvParser";
import { DepositData } from "@/lib/types";

export default function Home() {
  const [deposits, setDeposits] = useState<DepositData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const parsedDeposits = await parseRobinhoodCSV(file);
      setDeposits(parsedDeposits);
    } catch (err) {
      setError("Failed to parse CSV file. Please check the file format.");
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
            Robinhood Deposit Tracker
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Upload your Robinhood CSV to visualize your deposit history
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

          {deposits.length > 0 && <DepositChart data={deposits} />}
        </div>
      </main>
    </div>
  );
}
