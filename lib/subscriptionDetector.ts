import { ChaseTransaction } from './types';

// Decision thresholds (tunable based on testing)
const THRESHOLDS = {
  minOccurrences: 2,           // Need at least 2 transactions
  minTimeSpanDays: 60,         // Must span at least 60 days
  minDateConsistency: 0.75,    // 75% of gaps must match pattern
  monthlyTolerance: 3,         // ±3 days for monthly
  yearlyTolerance: 5,          // ±5 days for yearly
  highConfidenceThreshold: 0.9,
  mediumConfidenceThreshold: 0.75,
  amountVarianceHigh: 0.1,     // $0.10 variance for high confidence
  amountVarianceMedium: 1.0    // $1.00 variance for medium confidence
};

export interface RecurrencePattern {
  interval: 'monthly' | 'yearly' | 'bi-weekly' | 'weekly' | 'unknown';
  confidence: number;
  nextExpectedDate: number; // timestamp
}

export interface SubscriptionCandidate {
  merchantName: string;
  normalizedName: string;
  transactions: ChaseTransaction[];
  pattern: RecurrencePattern;
  typicalAmount: number;
  amountVariance: number;
  confidence: 'high' | 'medium' | 'low';
  isActive: boolean;
  lastTransactionDate: number; // timestamp
}

interface AmountGroup {
  baseAmount: number;
  transactions: ChaseTransaction[];
}

// Stage 1: Normalize descriptions
export function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\b(sq|tst|paypal|pos)\b/g, '') // Remove payment processors
    .replace(/\b\d+\b/g, '') // Remove standalone numbers
    .trim()
    .split(/\s+/)
    .slice(0, 3) // Take first 3 words
    .join(' ');
}

// Determine if a subscription is still active based on last transaction date
export function isSubscriptionActive(
  lastTransactionTimestamp: number,
  interval: RecurrencePattern['interval'],
  now: number = Date.now()
): boolean {
  const daysSinceLastTransaction = (now - lastTransactionTimestamp) / (1000 * 60 * 60 * 24);

  // Buffer thresholds for each interval type
  const thresholds = {
    'weekly': 21,        // 3 weeks
    'bi-weekly': 35,     // 2.5 cycles
    'monthly': 60,       // 2 months
    'yearly': 400,       // 1 year + buffer
    'unknown': 60        // Default to monthly threshold
  };

  return daysSinceLastTransaction <= thresholds[interval];
}

// Levenshtein distance for string similarity
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// Group transactions by similar merchant names
export function groupBySimilarMerchants(
  transactions: ChaseTransaction[]
): Map<string, ChaseTransaction[]> {
  // Stage 2: Exact grouping by normalized name
  const exactGroups = new Map<string, ChaseTransaction[]>();

  for (const tx of transactions) {
    const key = normalizeDescription(tx.description);
    if (!exactGroups.has(key)) {
      exactGroups.set(key, []);
    }
    exactGroups.get(key)!.push(tx);
  }

  // Stage 3: Fuzzy merge small groups (only if they're similar)
  const groupKeys = Array.from(exactGroups.keys());
  const merged = new Set<string>();

  for (let i = 0; i < groupKeys.length; i++) {
    if (merged.has(groupKeys[i])) continue;

    for (let j = i + 1; j < groupKeys.length; j++) {
      if (merged.has(groupKeys[j])) continue;

      // Only merge if strings are very similar (edit distance <= 3)
      if (levenshteinDistance(groupKeys[i], groupKeys[j]) <= 3) {
        exactGroups.get(groupKeys[i])!.push(...exactGroups.get(groupKeys[j])!);
        exactGroups.delete(groupKeys[j]);
        merged.add(groupKeys[j]);
      }
    }
  }

  return exactGroups;
}

// Sort + Sliding Window approach to group by similar amounts
export function groupBySimilarAmounts(
  transactions: ChaseTransaction[],
  tolerance: number = 2.0
): AmountGroup[] {
  // Step 1: Sort by absolute amount
  const sorted = [...transactions].sort((a, b) =>
    Math.abs(a.amount) - Math.abs(b.amount)
  );

  const groups: AmountGroup[] = [];
  let i = 0;

  while (i < sorted.length) {
    const baseAmount = Math.abs(sorted[i].amount);
    const group: ChaseTransaction[] = [sorted[i]];

    // Step 2: Sliding window - check all consecutive transactions
    let j = i + 1;
    while (j < sorted.length) {
      const currentAmount = Math.abs(sorted[j].amount);
      if (currentAmount - baseAmount <= tolerance) {
        group.push(sorted[j]);
        j++;
      } else {
        break; // Amounts are sorted, so we can stop
      }
    }

    if (group.length >= 2) { // Only keep groups with 2+ transactions
      groups.push({
        baseAmount,
        transactions: group
      });
    }

    i = j; // Skip to next ungrouped transaction
  }

  return groups;
}

// Detect recurrence pattern from timestamps
export function detectRecurrence(timestamps: number[]): RecurrencePattern {
  if (timestamps.length < 2) {
    return { interval: 'unknown', confidence: 0, nextExpectedDate: 0 };
  }

  // Sort timestamps ascending
  const sorted = [...timestamps].sort((a, b) => a - b);

  // Calculate day gaps between consecutive transactions
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const daysDiff = (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24);
    gaps.push(daysDiff);
  }

  // Find median gap (robust to outliers)
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];

  // Classify interval
  let interval: RecurrencePattern['interval'] = 'unknown';
  let tolerance = 3; // days

  if (Math.abs(medianGap - 7) <= tolerance) {
    interval = 'weekly';
  } else if (Math.abs(medianGap - 14) <= tolerance) {
    interval = 'bi-weekly';
  } else if (medianGap >= 28 && medianGap <= 31) {
    interval = 'monthly';
    tolerance = 3; // ±3 days for monthly
  } else if (medianGap >= 360 && medianGap <= 370) {
    interval = 'yearly';
    tolerance = 5; // ±5 days for yearly
  }

  // Calculate confidence based on gap consistency
  const consistentGaps = gaps.filter(g =>
    Math.abs(g - medianGap) <= tolerance
  ).length;
  const confidence = consistentGaps / gaps.length;

  // Predict next date
  const nextExpectedDate = sorted[sorted.length - 1] + (medianGap * 24 * 60 * 60 * 1000);

  return { interval, confidence, nextExpectedDate };
}

// Main subscription detection function
export function detectSubscriptions(
  transactions: ChaseTransaction[]
): SubscriptionCandidate[] {
  const subscriptions: SubscriptionCandidate[] = [];

  // Step 1: Group by similar merchant names
  const merchantGroups = groupBySimilarMerchants(transactions);

  // Step 2: For each merchant group, subdivide by similar amounts
  for (const [normalizedName, merchantTxs] of merchantGroups) {
    const amountGroups = groupBySimilarAmounts(merchantTxs, 2.0);

    // Step 3: For each (merchant, amount) subgroup, check date patterns
    for (const amountGroup of amountGroups) {
      const txCount = amountGroup.transactions.length;

      // Decision point 1: Minimum occurrences
      if (txCount < THRESHOLDS.minOccurrences) continue;

      const timestamps = amountGroup.transactions.map(t => t.timestamp);

      // Decision point 2: Minimum time span
      const timeSpanDays = (Math.max(...timestamps) - Math.min(...timestamps))
        / (1000 * 60 * 60 * 24);
      if (timeSpanDays < THRESHOLDS.minTimeSpanDays) continue;

      // Analyze recurrence pattern
      const pattern = detectRecurrence(timestamps);

      // Decision point 3: Pattern must be identifiable AND consistent
      if (pattern.interval === 'unknown') continue;
      if (pattern.confidence < THRESHOLDS.minDateConsistency) continue;

      // Calculate amount statistics
      const amounts = amountGroup.transactions.map(t => Math.abs(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, amt) =>
        sum + Math.pow(amt - avgAmount, 2), 0
      ) / amounts.length;

      // Decision point 4: Assign confidence level based on consistency
      let overallConfidence: 'high' | 'medium' | 'low' = 'low';
      if (pattern.confidence >= THRESHOLDS.highConfidenceThreshold
          && variance < THRESHOLDS.amountVarianceHigh) {
        overallConfidence = 'high';
      } else if (pattern.confidence >= THRESHOLDS.mediumConfidenceThreshold
                 && variance < THRESHOLDS.amountVarianceMedium) {
        overallConfidence = 'medium';
      }

      // Get most common merchant name for display
      const descriptionCounts = new Map<string, number>();
      for (const tx of amountGroup.transactions) {
        const desc = tx.description;
        descriptionCounts.set(desc, (descriptionCounts.get(desc) || 0) + 1);
      }
      let merchantName = '';
      let maxCount = 0;
      descriptionCounts.forEach((count, desc) => {
        if (count > maxCount) {
          maxCount = count;
          merchantName = desc;
        }
      });

      // Determine if subscription is active
      const lastTransactionDate = Math.max(...timestamps);
      const isActive = isSubscriptionActive(lastTransactionDate, pattern.interval);

      // Flag as subscription!
      subscriptions.push({
        merchantName,
        normalizedName,
        transactions: amountGroup.transactions,
        pattern,
        typicalAmount: avgAmount,
        amountVariance: variance,
        confidence: overallConfidence,
        isActive,
        lastTransactionDate
      });
    }
  }

  return subscriptions;
}
