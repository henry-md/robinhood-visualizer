import Papa from 'papaparse';
import {
  RobinhoodTransaction,
  StockTransaction,
  CashTransaction,
  Portfolio
} from './types';

export interface ParsedTransactions {
  stockTransactions: StockTransaction[];
  cashTransactions: CashTransaction[];
}

// Helper to adjust stock transactions for splits
function adjustForSplits(transactions: StockTransaction[]): StockTransaction[] {
  // Group transactions by ticker
  const byTicker = new Map<string, StockTransaction[]>();
  transactions.forEach(t => {
    if (!byTicker.has(t.ticker)) {
      byTicker.set(t.ticker, []);
    }
    byTicker.get(t.ticker)!.push(t);
  });

  const adjusted: StockTransaction[] = [];

  // Process each ticker separately
  byTicker.forEach((tickerTransactions, ticker) => {
    // Sort by timestamp
    const sorted = [...tickerTransactions].sort((a, b) => a.timestamp - b.timestamp);

    // Find all split transactions and calculate ratios
    const splits: Array<{ timestamp: number; ratio: number }> = [];
    let holdings = 0;

    sorted.forEach(t => {
      if (t.type === 'buy') {
        holdings += t.quantity;
      } else {
        holdings -= t.quantity;
      }

      // If this is a split transaction (SPL), calculate the ratio
      if (t.transCode === 'SPL') {
        const holdingsBeforeSplit = holdings - t.quantity;
        if (holdingsBeforeSplit > 0) {
          const splitRatio = holdings / holdingsBeforeSplit;
          splits.push({ timestamp: t.timestamp, ratio: splitRatio });
          console.log(`📊 ${ticker} split detected: ${splitRatio.toFixed(2)}x ratio at ${t.date}`);
        }
      }
    });

    // Apply split adjustments to all transactions
    sorted.forEach(t => {
      let adjustmentFactor = 1;

      // If this IS a split transaction, set quantity to 0 to avoid double-counting
      // (Pre-split quantities are already adjusted, so the split delta shouldn't be added)
      if (t.transCode === 'SPL') {
        adjusted.push({
          ...t,
          quantity: 0,
          price: 0,
        });
        console.log(`  🔧 ${ticker} SPL transaction: quantity set to 0 (split already applied to historical quantities)`);
        return;
      }

      // Calculate cumulative split adjustment for transactions before each split
      splits.forEach(split => {
        if (t.timestamp < split.timestamp) {
          adjustmentFactor *= split.ratio;
        }
      });

      // Create adjusted transaction
      adjusted.push({
        ...t,
        quantity: t.quantity * adjustmentFactor,
        // Also adjust price inversely if it's a real transaction (not a split/transfer)
        price: t.price > 0 ? t.price / adjustmentFactor : t.price,
      });

      if (adjustmentFactor !== 1 && t.price > 0) {
        console.log(`  🔧 Adjusted ${t.ticker} ${t.date}: ${t.quantity.toFixed(4)} → ${(t.quantity * adjustmentFactor).toFixed(4)} shares`);
      }
    });
  });

  return adjusted.sort((a, b) => a.timestamp - b.timestamp);
}

export function parseAllTransactions(file: File): Promise<ParsedTransactions> {
  return new Promise((resolve, reject) => {
    Papa.parse<RobinhoodTransaction>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const stockTransactions: StockTransaction[] = [];
          const cashTransactions: CashTransaction[] = [];

          const processedTransCodes = new Set<string>();

          results.data.forEach((row) => {
            const transCode = row["Trans Code"];
            const date = row["Activity Date"];
            const ticker = row["Instrument"];

            // Track which transaction codes we've seen
            if (transCode) {
              processedTransCodes.add(transCode);
            }

            // Parse amount correctly - parentheses mean negative in accounting
            const amountStr = row.Amount?.replace(/[$,]/g, "")?.trim() || "0";
            const isNegative = amountStr.includes("(") || amountStr.includes(")");
            const amount = parseFloat(amountStr.replace(/[()]/g, "")) * (isNegative ? -1 : 1);

            if (!date || isNaN(amount)) return;

            const timestamp = new Date(date).getTime();

            // Stock buys and sells
            if (transCode === "Buy" || transCode === "Sell") {
              const quantity = parseFloat(row.Quantity);
              const priceStr = row.Price?.replace(/[$,]/g, "")?.trim() || "0";
              const isPriceNegative = priceStr.includes("(") || priceStr.includes(")");
              const price = parseFloat(priceStr.replace(/[()]/g, "")) * (isPriceNegative ? -1 : 1);

              if (!ticker || isNaN(quantity) || isNaN(price)) {
                console.log('🔴 SKIPPING Buy/Sell - Missing data:', { transCode, ticker, quantity, price, date });
                return;
              }

              console.log(`${transCode === 'Buy' ? '📈' : '📉'} ${transCode} ${quantity} ${ticker} @ $${price} (Total: $${Math.abs(amount).toFixed(2)}) on ${date}`);

              stockTransactions.push({
                date,
                timestamp,
                ticker,
                type: transCode.toLowerCase() as 'buy' | 'sell',
                quantity,
                price,
                amount: Math.abs(amount),
                transCode
              });

              // Stock transactions affect cash (amount already has correct sign from CSV)
              cashTransactions.push({
                date,
                timestamp,
                type: amount < 0 ? 'fee' : 'dividend',
                amount: amount, // Use the amount as-is (already has correct sign)
                ticker
              });
            }

            // Stock splits (SPL) - adds shares without cash impact
            else if (transCode === "SPL") {
              const quantity = parseFloat(row.Quantity);

              if (!ticker || isNaN(quantity)) {
                console.log('🔴 SKIPPING SPL - Missing data:', { ticker, quantity, date });
                return;
              }

              console.log(`🔀 Stock Split: ${quantity} ${ticker} shares added on ${date}`);

              // Record as a buy transaction with price = 0 (no cost basis for splits)
              stockTransactions.push({
                date,
                timestamp,
                ticker,
                type: 'buy',
                quantity,
                price: 0,
                amount: 0,
                transCode: 'SPL'
              });
            }

            // Received/transferred shares (REC) - adds shares without cash impact
            else if (transCode === "REC") {
              const quantity = parseFloat(row.Quantity);

              if (!ticker || isNaN(quantity)) {
                console.log('🔴 SKIPPING REC - Missing data:', { ticker, quantity, date });
                return;
              }

              console.log(`📥 Received: ${quantity} ${ticker} shares transferred in on ${date}`);

              // Record as a buy transaction with price = 0 (cost basis may need manual adjustment)
              stockTransactions.push({
                date,
                timestamp,
                ticker,
                type: 'buy',
                quantity,
                price: 0,
                amount: 0,
                transCode: 'REC'
              });
            }

            // Deposits and withdrawals (ACH transfers, instant transfers, etc.)
            else if (transCode === "ACH" || transCode === "RTP") {
              const description = row.Description?.toLowerCase() || "";

              // Determine transaction type based on amount sign and description
              // The CSV already has correct signs: positive for deposits, negative for withdrawals
              let type: 'deposit' | 'withdrawal' | 'fee';

              if (amount > 0) {
                // Positive amount = money coming in (deposit, reversal credit, etc.)
                type = 'deposit';
                console.log(`💵 Deposit: $${amount.toFixed(2)} on ${date} (${row.Description})`);
              } else if (description.includes("fee")) {
                // Explicit fee
                type = 'fee';
                console.log(`💸 Fee: $${amount.toFixed(2)} on ${date} (${row.Description})`);
              } else {
                // Negative amount = money going out (withdrawal, transfer, reversal, etc.)
                type = 'withdrawal';
                console.log(`💸 Withdrawal: $${amount.toFixed(2)} on ${date} (${row.Description})`);
              }

              cashTransactions.push({
                date,
                timestamp,
                type,
                amount: amount // Amount already has correct sign from CSV
              });
            }

            // Dividends
            else if (transCode === "CDIV") {
              console.log(`💰 Dividend (${ticker}): $${amount.toFixed(2)} on ${date}`);
              cashTransactions.push({
                date,
                timestamp,
                type: 'dividend',
                amount: amount, // Should be positive
                ticker
              });
            }

            // Interest
            else if (transCode === "INT" || transCode === "SLIP") {
              console.log(`🏦 Interest: $${amount.toFixed(2)} on ${date}`);
              cashTransactions.push({
                date,
                timestamp,
                type: 'interest',
                amount: amount // Should be positive
              });
            }

            // Fees (Robinhood Gold, Margin Interest, etc.)
            else if (transCode === "GOLD" || transCode === "MINT") {
              console.log(`💳 Fee (${transCode}): $${amount.toFixed(2)} on ${date}`);
              cashTransactions.push({
                date,
                timestamp,
                type: 'fee',
                amount: amount // Should be negative
              });
            }

            // Other misc transactions
            else if (transCode === "MISC" || transCode === "FUTSWP") {
              console.log(`🔄 Misc (${transCode}): $${amount.toFixed(2)} on ${date}`);
              cashTransactions.push({
                date,
                timestamp,
                type: amount > 0 ? 'interest' : 'fee',
                amount: amount
              });
            }

            // Unknown transaction type
            else if (transCode) {
              console.log(`🔴 UNKNOWN transaction code: "${transCode}" with amount $${amount.toFixed(2)} on ${date}`);
            }
          });

          // Sort by timestamp
          stockTransactions.sort((a, b) => a.timestamp - b.timestamp);
          cashTransactions.sort((a, b) => a.timestamp - b.timestamp);

          // Adjust stock transactions for splits
          console.log('\n🔄 Adjusting for stock splits...');
          const adjustedStockTransactions = adjustForSplits(stockTransactions);

          // Log summary
          console.log('\n📊 PARSING SUMMARY:');
          console.log(`   Stock transactions: ${adjustedStockTransactions.length}`);
          console.log(`   Cash transactions: ${cashTransactions.length}`);
          console.log(`   Transaction codes seen: ${Array.from(processedTransCodes).join(', ')}`);

          if (adjustedStockTransactions.length > 0) {
            const uniqueTickers = new Set(adjustedStockTransactions.map(t => t.ticker));
            console.log(`   Unique tickers: ${Array.from(uniqueTickers).join(', ')}`);
          }

          resolve({ stockTransactions: adjustedStockTransactions, cashTransactions });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function calculatePortfolioAtDate(
  stockTransactions: StockTransaction[],
  cashTransactions: CashTransaction[],
  targetDate: Date
): Portfolio {
  const targetTimestamp = targetDate.getTime();

  // Calculate holdings up to target date
  const holdings = new Map<string, number>();

  stockTransactions
    .filter(t => t.timestamp <= targetTimestamp)
    .forEach(t => {
      const current = holdings.get(t.ticker) || 0;
      if (t.type === 'buy') {
        holdings.set(t.ticker, current + t.quantity);
      } else {
        holdings.set(t.ticker, current - t.quantity);
      }
    });

  // Remove holdings with zero or negative quantity
  for (const [ticker, qty] of holdings.entries()) {
    if (qty <= 0.0001) {
      holdings.delete(ticker);
    }
  }

  // Calculate cash up to target date
  const cash = cashTransactions
    .filter(t => t.timestamp <= targetTimestamp)
    .reduce((sum, t) => sum + t.amount, 0);

  return { cash, holdings };
}

export function getAllUniqueTickers(stockTransactions: StockTransaction[]): string[] {
  const tickers = new Set<string>();
  stockTransactions.forEach(t => tickers.add(t.ticker));
  return Array.from(tickers);
}
