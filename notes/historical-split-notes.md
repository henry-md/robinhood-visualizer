# Historical Stock Split Handling

This document explains how the Robinhood Visualizer handles stock splits and maintains consistency between historical transaction data and market prices.

## The Stock Split Problem

Stock splits create a fundamental challenge when calculating historical portfolio values:

1. **Robinhood's CSV uses actual historical units** - transactions are recorded with the share quantities and prices that existed at the time
2. **Yahoo Finance returns split-adjusted prices** - all historical prices are retroactively adjusted to reflect all subsequent splits

This mismatch requires careful handling to avoid incorrect valuations.

## Example: NVIDIA 10-for-1 Split (June 10, 2024)

### Without Split Adjustment (WRONG ❌)

```
Transaction: March 12, 2024
  Robinhood CSV: Buy 1.56 shares @ $929.78
  Yahoo Finance: $93.00 (split-adjusted price for March 2024)
  Calculation: 1.56 × $93 = $145.08

  ❌ This is wrong! The actual value was ~$1,450
```

### With Split Adjustment (CORRECT ✅)

```
Transaction: March 12, 2024
  Robinhood CSV: Buy 1.56 shares @ $929.78 (pre-split)
  Adjusted to: 15.6 shares @ $92.98 (post-split equivalent)
  Yahoo Finance: $93.00 (split-adjusted price)
  Calculation: 15.6 × $93 = $1,450.80

  ✅ Correct valuation
```

## How Robinhood Represents Splits

Robinhood's CSV includes `SPL` (stock split) transactions that show the additional shares received:

```csv
Date,Trans Code,Instrument,Quantity,Price,Amount
6/10/2024,SPL,NVDA,14.0356,,
```

This means:
- Before split: 1.56 shares
- Split transaction: +14.04 shares
- After split: 15.6 shares (1.56 × 10)
- Split ratio: 15.6 / 1.56 = 10-for-1

## Our Solution: Split-Adjusted Quantities

Since Yahoo Finance provides split-adjusted prices, we adjust our historical quantities to match:

### Step 1: Detect Splits

Parse `SPL` transactions from the CSV and calculate the split ratio:

```typescript
const holdingsBeforeSplit = 1.56;
const holdingsAfterSplit = 15.6;
const splitRatio = 15.6 / 1.56 = 10.0;
```

### Step 2: Adjust Pre-Split Transactions

For all transactions **before** the split, multiply quantities by the split ratio and divide prices by the ratio:

```typescript
// Original transaction
{ date: '2024-03-12', quantity: 1.56, price: 929.78 }

// After adjustment
{ date: '2024-03-12', quantity: 15.6, price: 92.98 }
```

### Step 3: Zero Out SPL Transactions

Set the SPL transaction quantity to 0 to avoid double-counting:

```typescript
// Original SPL transaction
{ date: '2024-06-10', transCode: 'SPL', quantity: 14.04 }

// After adjustment
{ date: '2024-06-10', transCode: 'SPL', quantity: 0 }
```

This is critical because the split is already implicit in the adjusted pre-split quantities.

### Step 4: Keep Post-Split Transactions Unchanged

Transactions after the split are already in post-split units:

```typescript
// No adjustment needed
{ date: '2024-07-19', quantity: 56.08, price: 120.31 }
```

## Units Used Throughout the System

### In `portfolioCalculations.ts`

| Stage | Unit Type | Description |
|-------|-----------|-------------|
| **CSV Parsing** | Mixed (actual historical) | Raw data from Robinhood, uses actual units at transaction time |
| **After `adjustForSplits()`** | Post-split equivalent | All quantities adjusted to latest split state |
| **Stock Holdings** | Post-split equivalent | Current holdings in post-split units |

### In Yahoo Finance API Calls

| Data | Unit Type | Description |
|------|-----------|-------------|
| **Historical Prices** | Split-adjusted | All prices retroactively adjusted for splits |
| **Current Prices** | Current units | Latest post-split prices |

### In Portfolio Valuation

| Component | Quantity Units | Price Units | Result |
|-----------|---------------|-------------|---------|
| **Pre-split period** | Adjusted to post-split | Split-adjusted | Correct historical value |
| **Post-split period** | Already post-split | Split-adjusted | Correct current value |

## Complete Example: NVDA Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│ March 12, 2024 - Pre-split Buy                                  │
├─────────────────────────────────────────────────────────────────┤
│ Robinhood CSV:    1.56 shares @ $929.78                         │
│ Adjusted to:     15.60 shares @ $92.98                          │
│ Yahoo Finance:   $93.00 (split-adjusted)                        │
│ Valuation:       15.6 × $93 = $1,450.80 ✓                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ June 10, 2024 - Stock Split (10-for-1)                          │
├─────────────────────────────────────────────────────────────────┤
│ Robinhood CSV:    SPL +14.04 shares                             │
│ Adjusted to:      0 shares (implicit in pre-split adjustment)   │
│ Holdings:         15.6 shares (no change from adjustment)        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ July 19, 2024 - Post-split Buy                                  │
├─────────────────────────────────────────────────────────────────┤
│ Robinhood CSV:    56.08 shares @ $120.31                        │
│ Adjusted to:      56.08 shares @ $120.31 (no change)            │
│ Yahoo Finance:    $120.00 (already post-split)                  │
│ Holdings:         15.6 + 56.08 = 71.68 shares                   │
│ Valuation:        71.68 × $120 = $8,601.60 ✓                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ December 31, 2025 - Post-split Sell                             │
├─────────────────────────────────────────────────────────────────┤
│ Robinhood CSV:    Sell 14.775 shares @ $188.64                  │
│ Adjusted to:      14.775 shares (no change)                     │
│ Holdings:         71.68 - 14.775 = 56.905 shares                │
│ Current price:    $188.64                                       │
│ Valuation:        56.905 × $188.64 = $10,733.40 ✓               │
└─────────────────────────────────────────────────────────────────┘
```

## Multiple Splits

For stocks with multiple splits, adjustments are applied cumulatively:

```typescript
// Example: Stock with 2 splits
// Split 1: 2-for-1 on 2023-01-01
// Split 2: 3-for-1 on 2024-01-01

// Transaction from 2022
Original: 10 shares @ $300
After Split 1: 10 × 2 = 20 shares @ $150
After Split 2: 20 × 3 = 60 shares @ $50
Final: 60 shares @ $50 (matches Yahoo's split-adjusted price)
```

## Other Stocks With Splits in CSV

Based on the Robinhood CSV data:

| Stock | Split Date | Shares Added | Calculated Ratio |
|-------|------------|--------------|------------------|
| NVDA  | 6/10/2024  | +14.04       | 10-for-1         |
| PANW  | 12/16/2024 | +6.5         | ~7.5-for-1       |
| TSLA  | 8/25/2022  | +13.29       | ~14-for-1        |

## Special Cases

### REC (Received/Transfer) Transactions

`REC` transactions add shares but are **not splits**. These are handled differently:

```typescript
// REC transactions are NOT adjusted for splits
{ transCode: 'REC', quantity: 1.0, price: 0 }
// Stays as 1.0 share (not multiplied by split ratio)
```

### Zero-Price Transactions

Split transactions (SPL) always have `price: 0` since they don't involve cash:

```typescript
{ transCode: 'SPL', quantity: 14.04, price: 0, amount: 0 }
```

After adjustment, these become:

```typescript
{ transCode: 'SPL', quantity: 0, price: 0, amount: 0 }
```

## Implementation Details

### Code Location

Split adjustment logic is in `lib/portfolioCalculations.ts`:

```typescript
function adjustForSplits(transactions: StockTransaction[]): StockTransaction[]
```

### Key Functions

1. **Split Detection**: Identifies `SPL` transactions and calculates ratios
2. **Cumulative Adjustment**: Applies all relevant split ratios to pre-split transactions
3. **Zero SPL Quantities**: Sets split transaction quantities to 0
4. **Preserve Post-Split**: Keeps transactions after splits unchanged

### Logging

The console shows adjustment details:

```
📊 NVDA split detected: 10.00x ratio at 2024-06-10
🔧 Adjusted NVDA 2024-03-12: 1.5595 → 15.5950 shares
🔧 NVDA SPL transaction: quantity set to 0 (split already applied)
```

## Testing and Verification

To verify split adjustments are working correctly:

1. Check console logs for split detection and adjustments
2. Verify pre-split transactions show adjusted quantities
3. Confirm SPL transactions have quantity = 0
4. Compare portfolio values against brokerage account

## Why This Approach?

**Alternative 1: Use unadjusted prices**
- Yahoo Finance doesn't easily provide unadjusted historical prices
- Would require maintaining our own split history database

**Alternative 2: Convert prices to unadjusted**
- Complex and error-prone
- Requires accurate split ratio data for every stock

**Our approach (adjust quantities):**
- ✅ Works with Yahoo Finance's default split-adjusted prices
- ✅ Simpler logic: one adjustment pass at parse time
- ✅ All subsequent calculations use consistent units
- ✅ No need to track split state during valuation

## Summary

- **Yahoo Finance prices**: Always split-adjusted
- **Robinhood CSV quantities**: Actual historical (mixed pre/post split)
- **Our internal quantities**: All adjusted to post-split equivalent
- **SPL transactions**: Detected and used to calculate ratios, then zeroed out
- **Result**: Consistent units for accurate historical valuations
