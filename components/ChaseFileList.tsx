"use client";

import { ChaseFile } from "@/lib/types";

interface ChaseFileListProps {
  files: ChaseFile[];
  onRemoveFile: (filename: string) => void;
  onClearAll: () => void;
  onAddMore: () => void;
}

export default function ChaseFileList({ files, onRemoveFile, onClearAll, onAddMore }: ChaseFileListProps) {
  const totalTransactions = files.reduce((sum, file) => sum + file.transactions.length, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Uploaded Files ({files.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddMore}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + Add More
          </button>
          {files.length > 1 && (
            <button
              onClick={onClearAll}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.filename}
            className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {file.filename}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {file.transactions.length} transactions • {file.dateRange.start} to {file.dateRange.end}
                </p>
              </div>
            </div>
            <button
              onClick={() => onRemoveFile(file.filename)}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              title="Remove file"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Total: {totalTransactions} transactions across {files.length} file{files.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
