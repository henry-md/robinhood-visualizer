"use client";

import { useState } from "react";
import { Filter } from "lucide-react";

export type SearchMode = 'fuzzy' | 'regex' | 'ai';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  placeholder?: string;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export default function SearchBar({ value, onChange, mode, onModeChange, placeholder = "Search transactions...", showFilters = false, onToggleFilters }: SearchBarProps) {
  const [showFuzzyTooltip, setShowFuzzyTooltip] = useState(false);
  const [showRegexTooltip, setShowRegexTooltip] = useState(false);
  const [showAiTooltip, setShowAiTooltip] = useState(false);

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

        {/* Mode Toggle with Tooltips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0">
            {/* Fuzzy Button with Tooltip */}
            <div className="relative">
              <button
                onClick={() => onModeChange('fuzzy')}
                onMouseEnter={() => setShowFuzzyTooltip(true)}
                onMouseLeave={() => setShowFuzzyTooltip(false)}
                className={`rounded-l-lg border border-zinc-300 px-3 py-2 text-xs font-medium transition-colors dark:border-zinc-700 ${
                  mode === 'fuzzy'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
                type="button"
              >
                Fuzzy
              </button>

            {showFuzzyTooltip && (
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
                      <li>✓ Partial matches: &quot;star&quot; finds &quot;Starbucks&quot;</li>
                      <li>✓ Multiple words: &quot;apple store&quot; finds transactions with both</li>
                      <li>✓ Minor typos: &quot;netflx&quot; might find &quot;Netflix&quot;</li>
                      <li>✓ Any order: &quot;york new&quot; finds &quot;New York&quot;</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">Won&apos;t Find:</span>
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
                      Finds &quot;STARBUCKS #1234&quot;, &quot;Starbucks Corp&quot;
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
                      Finds &quot;UBR* PENDING.UBER.CO&quot;
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Regex Button with Tooltip */}
          <div className="relative">
            <button
              onClick={() => onModeChange('regex')}
              onMouseEnter={() => setShowRegexTooltip(true)}
              onMouseLeave={() => setShowRegexTooltip(false)}
              className={`-ml-px border border-zinc-300 px-3 py-2 text-xs font-medium transition-colors dark:border-zinc-700 ${
                mode === 'regex'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
              type="button"
            >
              Regex
            </button>

            {showRegexTooltip && (
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
                      Exact match &quot;Netflix&quot;
                    </span>
                  </div>
                  <div>
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                      ^APPLE
                    </code>
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      Starts with &quot;APPLE&quot;
                    </span>
                  </div>
                  <div>
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                      uber|lyft
                    </code>
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      Match &quot;Uber&quot; OR &quot;Lyft&quot;
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
                      Does NOT contain &quot;apple&quot;
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

          {/* AI Button with Tooltip */}
          <div className="relative">
            <button
              onClick={() => onModeChange('ai')}
              onMouseEnter={() => setShowAiTooltip(true)}
              onMouseLeave={() => setShowAiTooltip(false)}
              className={`-ml-px rounded-r-lg border border-zinc-300 px-3 py-2 text-xs font-medium transition-colors dark:border-zinc-700 ${
                mode === 'ai'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
              type="button"
            >
              AI
            </button>

            {showAiTooltip && (
              <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  AI Search
                </h3>
                <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
                  Natural language search powered by AI. Ask questions about your transactions in plain English.
                </p>

                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">Examples:</p>
                  <div>
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                      coffee shops last month
                    </code>
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      Find all coffee-related purchases
                    </span>
                  </div>
                  <div>
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                      large purchases over $500
                    </code>
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      Filter by amount with natural language
                    </span>
                  </div>
                  <div>
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                      subscriptions
                    </code>
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      Identify recurring charges
                    </span>
                  </div>
                  <div>
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                      dining expenses in December
                    </code>
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      Combine category and date filters
                    </span>
                  </div>
                </div>

                <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    The AI analyzes your query and returns matching transactions with optional insights.
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Filter Toggle Button */}
          {onToggleFilters && (
            <button
              onClick={onToggleFilters}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                showFilters
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
              type="button"
              title="Toggle filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
