# Subscription Detection Algorithm

## Overview

The subscription detection system automatically identifies recurring charges in Chase transaction data using heuristic-based pattern matching. It analyzes merchant names, transaction amounts, and date patterns to flag potential subscriptions without requiring any LLM API calls.

## High-Level Flow

```
Chase Transactions
    ↓
Group by Similar Merchant Names
    ↓
Subdivide by Similar Amounts (within $2)
    ↓
Analyze Date Patterns
    ↓
Apply Decision Gates
    ↓
Flag as Subscription (if all gates pass)
```

## Algorithm Components

### 1. Merchant Name Grouping

**Goal**: Group transactions from the same merchant despite name variations

**Challenge**: Merchant names vary in CSVs:
- `"NETFLIX.COM"` vs `"NETFLIX USA"` vs `"NETFLIX #123"`
- `"SQ *STARBUCKS #456"` vs `"STARBUCKS CORP"`
- Payment processors add prefixes: `"PAYPAL *"`, `"TST*"`

**Solution**: Three-stage pipeline

#### Stage 1: Normalization
```typescript
function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()                           // "NETFLIX.COM" → "netflix.com"
    .replace(/[^a-z0-9\s]/g, '')            // "netflix.com" → "netflix com"
    .replace(/\b(sq|tst|paypal|pos)\b/g, '') // Remove payment processors
    .replace(/\b\d+\b/g, '')                 // Remove standalone numbers
    .trim()
    .split(/\s+/)
    .slice(0, 3)                             // Take first 3 words
    .join(' ');                              // "netflix com" → "netflix com"
}
```

**Examples**:
- `"NETFLIX.COM"` → `"netflix com"`
- `"NETFLIX USA #123"` → `"netflix usa"`
- `"SQ *STARBUCKS #456"` → `"starbucks"`
- `"PAYPAL *SPOTIFY 987654"` → `"spotify"`

#### Stage 2: Exact Grouping
Group transactions by exact match of normalized name using a HashMap:
```typescript
Map {
  "netflix com" → [tx1, tx2, tx3, ...],
  "spotify" → [tx4, tx5, ...],
  "starbucks" → [tx6, tx7, tx8, ...]
}
```

**Complexity**: O(n) where n = number of transactions

#### Stage 3: Fuzzy Merging
For groups with similar normalized names, merge them using Levenshtein distance:

```typescript
if (levenshteinDistance("netflix com", "netflix usa") <= 3) {
  // Merge these two groups
}
```

**Distance threshold**: ≤3 character edits

**Examples**:
- `"netflix com"` vs `"netflix usa"` → distance = 3 → **MERGE**
- `"spotify"` vs `"sportify"` → distance = 2 → **MERGE** (typo tolerance)
- `"amazon prime"` vs `"amazon music"` → distance = 5 → **DON'T MERGE**

**Complexity**: O(g² × m) where g = number of groups (typically 100-500), m = string length

**Overall Complexity**: O(n + g² × m)

---

### 2. Amount Grouping (Sliding Window)

**Goal**: Group transactions with similar amounts (within $2 tolerance)

**Challenge**: Can't use fixed buckets
- Fixed $2 buckets would separate $1.99 and $2.01 into different buckets
- Need overlapping ranges

**Solution**: Sort + Sliding Window ✅

```typescript
function groupBySimilarAmounts(
  transactions: ChaseTransaction[],
  tolerance: number = 2.0
): AmountGroup[] {
  // Step 1: Sort by absolute amount (O(n log n))
  const sorted = [...transactions].sort((a, b) =>
    Math.abs(a.amount) - Math.abs(b.amount)
  );

  // Step 2: Sliding window (O(n))
  const groups: AmountGroup[] = [];
  let i = 0;

  while (i < sorted.length) {
    const baseAmount = Math.abs(sorted[i].amount);
    const group: ChaseTransaction[] = [sorted[i]];

    // Check consecutive transactions
    let j = i + 1;
    while (j < sorted.length) {
      const currentAmount = Math.abs(sorted[j].amount);
      if (currentAmount - baseAmount <= tolerance) {
        group.push(sorted[j]);
        j++;
      } else {
        break; // Sorted, so we can stop early
      }
    }

    if (group.length >= 2) {
      groups.push({ baseAmount, transactions: group });
    }

    i = j; // Skip to next ungrouped transaction
  }

  return groups;
}
```

**Example**:
```
Input:  [$1.99, $50.00, $2.01, $2.00, $51.50, $1.98]
Sorted: [$1.98, $1.99, $2.00, $2.01, $50.00, $51.50]

With tolerance=$2.00:
Group 1: [$1.98, $1.99, $2.00, $2.01]  (range: $1.98-$2.01)
Group 2: [$50.00, $51.50]               (range: $50.00-$51.50)
```

**Why this works**:
- Sorting ensures similar amounts are adjacent
- Single pass with early exit = efficient
- No artificial bucket boundaries
- $1.99 and $2.01 naturally group together

**Complexity**: O(n log n) for sort + O(n) for grouping = **O(n log n)**

---

### 3. Date Pattern Detection

**Goal**: Identify recurring date patterns (monthly, yearly, weekly, bi-weekly)

**Algorithm**:

```typescript
function detectRecurrence(timestamps: number[]): RecurrencePattern {
  // Step 1: Sort timestamps ascending
  const sorted = [...timestamps].sort((a, b) => a - b);

  // Step 2: Calculate day gaps between consecutive transactions
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const daysDiff = (sorted[i] - sorted[i-1]) / (1000 * 60 * 60 * 24);
    gaps.push(daysDiff);
  }

  // Step 3: Find median gap (robust to outliers)
  const medianGap = gaps.sort()[Math.floor(gaps.length / 2)];

  // Step 4: Classify interval
  let interval = 'unknown';
  let tolerance = 3; // days

  if (Math.abs(medianGap - 7) <= tolerance) {
    interval = 'weekly';
  } else if (Math.abs(medianGap - 14) <= tolerance) {
    interval = 'bi-weekly';
  } else if (medianGap >= 28 && medianGap <= 31) {
    interval = 'monthly';
    tolerance = 3;
  } else if (medianGap >= 360 && medianGap <= 370) {
    interval = 'yearly';
    tolerance = 5;
  }

  // Step 5: Calculate confidence (consistency of gaps)
  const consistentGaps = gaps.filter(g =>
    Math.abs(g - medianGap) <= tolerance
  ).length;
  const confidence = consistentGaps / gaps.length;

  // Step 6: Predict next date
  const nextExpectedDate = sorted[sorted.length - 1] +
    (medianGap * 24 * 60 * 60 * 1000);

  return { interval, confidence, nextExpectedDate };
}
```

**Pattern Classification**:
| Pattern | Median Gap Range | Tolerance | Example |
|---------|-----------------|-----------|---------|
| Weekly | 7 days ± 3 | ±3 days | Every Monday |
| Bi-weekly | 14 days ± 3 | ±3 days | Every other Friday |
| Monthly | 28-31 days | ±3 days | 5th of each month |
| Yearly | 360-370 days | ±5 days | January 15th annually |

**Why use median instead of mean?**
- Robust to outliers (e.g., one late payment doesn't ruin detection)
- Better handles irregular months (28 vs 31 days)

**Example**:
```
Netflix charges: [Jan 5, Feb 5, Mar 5, Apr 5, May 8]
Gaps: [31, 28, 31, 33]  days
Median: 31 days
Classification: Monthly (28-31 range)
Consistency: 4/4 gaps within ±3 days of 31 = 100% confidence
```

**Complexity**: O(m log m) per merchant-amount group, where m = transactions in group

---

### 4. Decision Gates

For a (merchant, amount) group to be flagged as a subscription, it must pass **ALL FOUR GATES**:

#### Gate 1: Minimum Occurrences
```typescript
if (transactions.length < 2) continue;
```
**Rationale**: Need at least 2 occurrences to establish a pattern

#### Gate 2: Minimum Time Span
```typescript
const timeSpanDays = (maxTimestamp - minTimestamp) / (1000 * 60 * 60 * 24);
if (timeSpanDays < 60) continue;
```
**Rationale**: Subscriptions span months/years, not days. Prevents flagging:
- Two coffee purchases in one week
- Multiple Amazon orders in a month

#### Gate 3: Pattern Identifiable
```typescript
if (pattern.interval === 'unknown') continue;
```
**Rationale**: Must match a known recurrence pattern (weekly/bi-weekly/monthly/yearly)

#### Gate 4: Pattern Consistent
```typescript
if (pattern.confidence < 0.75) continue;
```
**Rationale**: At least 75% of date gaps must match the pattern (±tolerance)
- Allows for occasional late/early charges
- Filters out irregular purchases

**Examples**:

✅ **PASSES ALL GATES** (Netflix):
```
Merchant: "netflix com"
Amounts: [$15.99, $15.99, $15.99, $15.99]
Dates: [Jan 5, Feb 5, Mar 5, Apr 5]
Gaps: [31, 29, 31] days
Median: 31 days → Monthly
Consistency: 3/3 gaps within ±3 = 100%
Time span: 90 days

Gate 1: ✓ 4 transactions
Gate 2: ✓ 90 days > 60
Gate 3: ✓ Monthly pattern
Gate 4: ✓ 100% > 75%
→ FLAGGED AS SUBSCRIPTION
```

❌ **FAILS GATE 2** (Starbucks):
```
Merchant: "starbucks"
Amounts: [$5.50, $5.75, $5.50, $5.50]
Dates: [Jan 3, Jan 10, Jan 17, Jan 24]
Time span: 21 days

Gate 1: ✓ 4 transactions
Gate 2: ✗ 21 days < 60
→ NOT A SUBSCRIPTION (random coffee purchases)
```

❌ **FAILS GATE 4** (Amazon):
```
Merchant: "amazon"
Amounts: [$12.99, $13.99, $12.50, $14.00]
Dates: [Jan 15, Feb 3, Mar 20, Apr 8]
Gaps: [19, 46, 19] days
Median: 19 days
Pattern: Unknown (not weekly/monthly/yearly)
Consistency: Low

Gate 1: ✓ 4 transactions
Gate 2: ✓ 84 days > 60
Gate 3: ✗ Unknown pattern
→ NOT A SUBSCRIPTION (irregular purchases)
```

---

## Confidence Levels

After passing all gates, subscriptions are assigned a confidence level:

### High Confidence
```typescript
if (pattern.confidence >= 0.9 && amountVariance < 0.1)
```
- 90%+ date consistency
- Amount variance < $0.10
- **Example**: Netflix $15.99 every month on the 5th

### Medium Confidence
```typescript
if (pattern.confidence >= 0.75 && amountVariance < 1.0)
```
- 75-89% date consistency
- Amount variance < $1.00
- **Example**: Utility bill varying slightly ($120-$125)

### Low Confidence
```typescript
else // Meets minimum thresholds
```
- Meets 75% consistency minimum
- Higher amount variance
- **Example**: Subscription with occasional price changes

---

## Complete Algorithm

```typescript
function detectSubscriptions(transactions: ChaseTransaction[]): SubscriptionCandidate[] {
  const subscriptions: SubscriptionCandidate[] = [];

  // Step 1: Group by similar merchant names
  const merchantGroups = groupBySimilarMerchants(transactions);

  // Step 2: For each merchant, subdivide by similar amounts
  for (const [merchantName, merchantTxs] of merchantGroups) {
    const amountGroups = groupBySimilarAmounts(merchantTxs, 2.0);

    // Step 3: For each (merchant, amount) pair, analyze dates
    for (const amountGroup of amountGroups) {

      // Gate 1: Minimum occurrences
      if (amountGroup.transactions.length < 2) continue;

      // Gate 2: Minimum time span
      const timestamps = amountGroup.transactions.map(t => t.timestamp);
      const timeSpanDays = (Math.max(...timestamps) - Math.min(...timestamps))
        / (1000 * 60 * 60 * 24);
      if (timeSpanDays < 60) continue;

      // Gate 3 & 4: Pattern detection and consistency
      const pattern = detectRecurrence(timestamps);
      if (pattern.interval === 'unknown') continue;
      if (pattern.confidence < 0.75) continue;

      // Calculate amount statistics
      const amounts = amountGroup.transactions.map(t => Math.abs(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b) / amounts.length;
      const variance = amounts.reduce((sum, amt) =>
        sum + Math.pow(amt - avgAmount, 2), 0
      ) / amounts.length;

      // Assign confidence level
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (pattern.confidence >= 0.9 && variance < 0.1) {
        confidence = 'high';
      } else if (pattern.confidence >= 0.75 && variance < 1.0) {
        confidence = 'medium';
      }

      // Flag as subscription!
      subscriptions.push({
        merchantName,
        transactions: amountGroup.transactions,
        pattern,
        typicalAmount: avgAmount,
        amountVariance: variance,
        confidence
      });
    }
  }

  return subscriptions;
}
```

---

## Performance Analysis

### Complexity

For n = total transactions, g = merchant groups, m = string length:

1. **Merchant grouping**: O(n + g² × m)
   - Normalization: O(n)
   - Exact grouping: O(n)
   - Fuzzy merging: O(g² × m)

2. **Amount grouping**: O(n log n)
   - Sort: O(n log n)
   - Sliding window: O(n)

3. **Date analysis**: O(k log k) per group, where k = group size
   - Typically k << n
   - Total: O(n log n) worst case

**Overall**: O(n log n + g² × m)

### Real-World Performance

Typical dataset: 10,000 transactions
- Unique merchants: ~500 (g = 500)
- Average merchant name: 20 chars (m = 20)

Complexity:
- Merchant grouping: O(10,000 + 500² × 20) = O(5,010,000) operations
- Amount grouping: O(10,000 log 10,000) = O(133,000) operations
- Date analysis: O(10,000 log 10,000) = O(133,000) operations

**Expected runtime**: < 100ms on modern hardware

### Optimization: Memoization

```typescript
const transactionsWithSubscriptions = useMemo(() => {
  const subscriptions = detectSubscriptions(activeTransactions);
  return annotateTransactions(activeTransactions, subscriptions);
}, [activeTransactions]);
```

Subscriptions are computed once per transaction set load, then cached in React state.

---

## Tunable Thresholds

The algorithm uses configurable thresholds defined in `lib/subscriptionDetector.ts`:

```typescript
const THRESHOLDS = {
  minOccurrences: 2,           // Minimum transactions to consider
  minTimeSpanDays: 60,         // Minimum days between first and last
  minDateConsistency: 0.75,    // Minimum % of gaps matching pattern
  monthlyTolerance: 3,         // ±3 days for monthly subscriptions
  yearlyTolerance: 5,          // ±5 days for yearly subscriptions
  highConfidenceThreshold: 0.9,
  mediumConfidenceThreshold: 0.75,
  amountVarianceHigh: 0.1,     // $0.10 for high confidence
  amountVarianceMedium: 1.0    // $1.00 for medium confidence
};
```

**To adjust sensitivity**:
- Increase `minTimeSpanDays` to reduce false positives (fewer short-term patterns)
- Decrease `minDateConsistency` to catch irregular subscriptions (more false positives)
- Adjust tolerance values to handle different billing schedules

---

## UI Integration

### Transaction Table
- **Column**: "Sub" added between Account and Date
- **Indicator**: 🔄 icon for detected subscriptions
- **Tooltip**: Shows on hover:
  - Recurrence frequency (monthly/yearly/etc)
  - Typical amount
  - Confidence level
  - Next expected date

### Filters Panel
- **Checkbox**: "Show subscriptions only"
- **Behavior**: Filters transaction list to only show flagged subscriptions
- **Clear**: Resets subscription filter along with other filters

---

## Data Flow

```
CSV Upload
    ↓
Parse Transactions
    ↓
[activeTransactions] → detectSubscriptions() → [subscriptions]
    ↓                                                ↓
    └────────────── annotateTransactions() ──────────┘
                            ↓
                [transactionsWithSubscriptions]
                            ↓
                    Apply Filters
                            ↓
                    Render Table
```

---

## Edge Cases Handled

### 1. Month-End Subscriptions
```
Problem: Bills on "31st" → Feb bills on 28th
Solution: Pattern detection uses 28-31 day range for monthly
```

### 2. Price Changes
```
Problem: Netflix raises price $15.99 → $17.99
Solution: $2 amount tolerance groups both prices together
```

### 3. Skipped Months
```
Problem: User cancels for 2 months, then resumes
Solution: Median gap ignores outliers, still detects pattern
```

### 4. Payment Processors
```
Problem: "PAYPAL *SPOTIFY" vs "SQ *SPOTIFY"
Solution: Normalization strips payment processor prefixes
```

### 5. Combined View
```
Problem: Same subscription across multiple CSV files
Solution: Detection runs on combined transactions, finds patterns across files
```

---

## Future Enhancements

### 1. LLM Enhancement (Optional)
- Add "Analyze Subscriptions" button
- Use GPT-4o to:
  - Normalize merchant names more accurately
  - Identify service names ("Spotify" vs "Music streaming")
  - Detect unusual patterns not caught by heuristics

### 2. User Training
- Allow manual marking/unmarking subscriptions
- Store overrides in localStorage
- Use overrides to improve future detection

### 3. Subscription Summary
- Total monthly/yearly subscription cost
- Subscription calendar view
- Alerts for upcoming charges

### 4. Multi-Tier Detection
```
Problem: Hulu has ad-free ($17.99) and ad-supported ($7.99) tiers
Current: Detects as 2 separate subscriptions
Future: LLM could identify as same service, different tiers
```

---

## Testing

### Unit Tests (Recommended)
```typescript
// Test amount grouping edge cases
test('groupBySimilarAmounts handles boundary cases', () => {
  const txs = [
    { amount: 1.99 },
    { amount: 2.00 },
    { amount: 2.01 },
    { amount: 4.50 }
  ];
  const groups = groupBySimilarAmounts(txs, 2.0);
  expect(groups).toHaveLength(1);
  expect(groups[0].transactions).toHaveLength(3);
});

// Test merchant normalization
test('normalizeDescription strips payment processors', () => {
  expect(normalizeDescription('PAYPAL *SPOTIFY')).toBe('spotify');
  expect(normalizeDescription('SQ *STARBUCKS #123')).toBe('starbucks');
});

// Test pattern detection
test('detectRecurrence identifies monthly pattern', () => {
  const timestamps = [
    new Date('2024-01-05').getTime(),
    new Date('2024-02-05').getTime(),
    new Date('2024-03-05').getTime(),
    new Date('2024-04-05').getTime(),
  ];
  const pattern = detectRecurrence(timestamps);
  expect(pattern.interval).toBe('monthly');
  expect(pattern.confidence).toBeGreaterThan(0.9);
});
```

### Integration Test
```typescript
test('detects Netflix subscription from real CSV data', () => {
  const transactions = loadSampleCSV('netflix-subscription.csv');
  const subscriptions = detectSubscriptions(transactions);

  const netflix = subscriptions.find(s =>
    s.merchantName.toLowerCase().includes('netflix')
  );

  expect(netflix).toBeDefined();
  expect(netflix.pattern.interval).toBe('monthly');
  expect(netflix.confidence).toBe('high');
});
```

---

## Conclusion

The subscription detection system uses a hierarchical grouping approach (merchant → amount → dates) with four decision gates to identify recurring charges. By using efficient algorithms (sort + sliding window for amounts, Levenshtein distance for names) and robust statistics (median for date gaps), it achieves high accuracy without requiring expensive LLM calls.

**Key takeaways**:
- No bucketing artifacts in amount grouping
- Robust to merchant name variations
- Handles irregular patterns gracefully
- O(n log n) complexity for 10k+ transactions
- Fully client-side, no API costs
