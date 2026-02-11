"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SubscriptionCandidate } from "@/lib/subscriptionDetector";

interface SubscriptionSummaryProps {
  subscriptions: SubscriptionCandidate[];
}

export default function SubscriptionSummary({ subscriptions }: SubscriptionSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (subscriptions.length === 0) {
    return null;
  }

  // Separate active and inactive subscriptions
  const activeSubscriptions = subscriptions.filter(sub => sub.isActive);
  const inactiveSubscriptions = subscriptions.filter(sub => !sub.isActive);

  // Calculate total monthly cost (convert all to monthly equivalent)
  const totalMonthlyCost = activeSubscriptions.reduce((sum, sub) => {
    let monthlyCost = sub.typicalAmount;
    if (sub.pattern.interval === 'yearly') {
      monthlyCost = sub.typicalAmount / 12;
    } else if (sub.pattern.interval === 'weekly') {
      monthlyCost = sub.typicalAmount * 4.33; // avg weeks per month
    } else if (sub.pattern.interval === 'bi-weekly') {
      monthlyCost = sub.typicalAmount * 2.17; // avg bi-weeks per month
    }
    return sum + monthlyCost;
  }, 0);

  const totalYearlyCost = totalMonthlyCost * 12;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Detected Subscriptions
            </h3>
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {subscriptions.length} total
            </span>
            {activeSubscriptions.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                {activeSubscriptions.length} active
              </span>
            )}
            {inactiveSubscriptions.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {inactiveSubscriptions.length} inactive
              </span>
            )}
          </div>
          {activeSubscriptions.length > 0 && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              ~${totalMonthlyCost.toFixed(2)}/month • ~${totalYearlyCost.toFixed(2)}/year
            </p>
          )}
        </div>
        <div className="ml-4">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-zinc-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                Active Subscriptions
              </h4>
              <div className="space-y-2">
                {activeSubscriptions.map((sub, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {sub.merchantName}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              sub.confidence === 'high'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : sub.confidence === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {sub.confidence}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                          <span className="capitalize">{sub.pattern.interval}</span>
                          <span>•</span>
                          <span>${sub.typicalAmount.toFixed(2)}</span>
                          <span>•</span>
                          <span>{sub.transactions.length} charges</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                          Last charge: {new Date(sub.lastTransactionDate).toLocaleDateString()}
                          {sub.pattern.nextExpectedDate && (
                            <>
                              {' '}• Next expected: {new Date(sub.pattern.nextExpectedDate).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Subscriptions */}
          {inactiveSubscriptions.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="inline-flex h-2 w-2 rounded-full bg-zinc-400"></span>
                Inactive Subscriptions
              </h4>
              <div className="space-y-2">
                {inactiveSubscriptions.map((sub, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 opacity-60 dark:border-zinc-700 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {sub.merchantName}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                            {sub.confidence}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                          <span className="capitalize">{sub.pattern.interval}</span>
                          <span>•</span>
                          <span>${sub.typicalAmount.toFixed(2)}</span>
                          <span>•</span>
                          <span>{sub.transactions.length} charges</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                          Last charge: {new Date(sub.lastTransactionDate).toLocaleDateString()}
                          {sub.pattern.nextExpectedDate && (
                            <>
                              {' '}• Expected: {new Date(sub.pattern.nextExpectedDate).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
