"use client";

import { X } from "lucide-react";

interface AINotificationProps {
  message: string;
  onDismiss: () => void;
}

export default function AINotification({ message, onDismiss }: AINotificationProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              AI Insight
            </span>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="rounded p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
