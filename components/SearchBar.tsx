"use client";

import { useState } from "react";

export type SearchMode = 'fuzzy' | 'regex';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, mode, onModeChange, placeholder = "Search transactions..." }: SearchBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
          />
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <button
            onClick={() => onModeChange('fuzzy')}
            className={`rounded-l-lg px-3 py-2 text-xs font-medium transition-colors ${
              mode === 'fuzzy'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
            type="button"
          >
            Fuzzy
          </button>
          <button
            onClick={() => onModeChange('regex')}
            className={`rounded-r-lg px-3 py-2 text-xs font-medium transition-colors ${
              mode === 'regex'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
            type="button"
          >
            Regex
          </button>
        </div>

        {/* Help Button */}
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            type="button"
          >
            <span className="text-sm font-semibold">?</span>
          </button>

          {showTooltip && mode === 'fuzzy' && (
            <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Fuzzy Search
              </h3>
              <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
                Forgiving search that finds partial matches and tolerates typos. Case-insensitive.
              </p>

              <div className="mb-3 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">Will Find:</span>
                  <ul className="mt-1 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <li>✓ Partial matches: "star" finds "Starbucks"</li>
                    <li>✓ Multiple words: "apple store" finds transactions with both</li>
                    <li>✓ Minor typos: "netflx" might find "Netflix"</li>
                    <li>✓ Any order: "york new" finds "New York"</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">Won't Find:</span>
                  <ul className="mt-1 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <li>✗ Very different spellings</li>
                    <li>✗ Completely unrelated terms</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-800">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">Examples:</p>
                <div>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    starbucks
                  </code>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    Finds "STARBUCKS #1234", "Starbucks Corp"
                  </span>
                </div>
                <div>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    apple store
                  </code>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    Finds transactions with both words
                  </span>
                </div>
                <div>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    uber
                  </code>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    Finds "UBR* PENDING.UBER.CO"
                  </span>
                </div>
              </div>
            </div>
          )}

          {showTooltip && mode === 'regex' && (
            <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Regex Search (JavaScript)
              </h3>
              <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
                Advanced pattern matching using regular expressions. Case-insensitive by default.
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    netflix
                  </code>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    Exact match "Netflix"
                  </span>
                </div>
                <div>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    ^APPLE
                  </code>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    Starts with "APPLE"
                  </span>
                </div>
                <div>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    uber|lyft
                  </code>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    Match "Uber" OR "Lyft"
                  </span>
                </div>
                <div>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    \d{"{3}"}-\d{"{4}"}
                  </code>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    Phone pattern (###-####)
                  </span>
                </div>
                <div>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    ^(?!.*apple)
                  </code>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    Does NOT contain "apple"
                  </span>
                </div>
              </div>
              <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  Common Patterns:
                </p>
                <ul className="mt-1 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <li><code className="font-mono">.</code> - Any character</li>
                  <li><code className="font-mono">*</code> - Zero or more</li>
                  <li><code className="font-mono">+</code> - One or more</li>
                  <li><code className="font-mono">?</code> - Optional</li>
                  <li><code className="font-mono">[abc]</code> - Any of a, b, c</li>
                  <li><code className="font-mono">\d</code> - Any digit</li>
                  <li><code className="font-mono">\s</code> - Whitespace</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
