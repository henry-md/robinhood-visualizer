import {
  StockTransaction,
  CashTransaction,
  PortfolioValueData,
} from './types';
import { calculatePortfolioAtDate } from './portfolioCalculations';

export async function fetchStockPrices(
  tickers: string[],
  startDate: Date,
  endDate: Date
): Promise<Record<string, Record<string, number>>> {
  console.log('🌐 Calling stock prices API...');
  console.log(`   Tickers: ${tickers.join(', ')}`);
  console.log(`   Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const response = await fetch('/api/stock-prices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tickers,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
  });

  console.log(`   Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🔴 API call failed:', errorText);
    throw new Error('Failed to fetch stock prices');
  }

  const data = await response.json();
  const priceCount = Object.values(data.priceData as Record<string, Record<string, number>>)
    .reduce((sum, ticker) => sum + Object.keys(ticker).length, 0);
  console.log(`✅ Received ${priceCount} price points from API`);

  return data.priceData;
}

export function calculatePortfolioValues(
  stockTransactions: StockTransaction[],
  cashTransactions: CashTransaction[],
  priceData: Record<string, Record<string, number>>,
  startDate: Date,
  endDate: Date
): PortfolioValueData[] {
  const portfolioValues: PortfolioValueData[] = [];

  // Get all unique transaction dates
  const allTransactions = [
    ...stockTransactions.map(t => t.timestamp),
    ...cashTransactions.map(t => t.timestamp)
  ];
  const uniqueTimestamps = Array.from(new Set(allTransactions)).sort((a, b) => a - b);

  // Add end date (today) if not already included
  const endTimestamp = endDate.getTime();
  if (uniqueTimestamps.length === 0 || uniqueTimestamps[uniqueTimestamps.length - 1] < endTimestamp) {
    uniqueTimestamps.push(endTimestamp);
  }

  // Calculate portfolio value only on transaction dates
  uniqueTimestamps.forEach(timestamp => {
    const currentDate = new Date(timestamp);
    const dateStr = currentDate.toISOString().split('T')[0];

    const portfolio = calculatePortfolioAtDate(
      stockTransactions,
      cashTransactions,
      currentDate
    );

    let stockValue = 0;
    const holdingsDebug: string[] = [];
    portfolio.holdings.forEach((quantity, ticker) => {
      // Find the price for this date (or the most recent previous date)
      const tickerPrices = priceData[ticker] || {};
      let price = tickerPrices[dateStr];

      // If no price for this exact date, find the most recent previous price
      if (price === undefined) {
        const dates = Object.keys(tickerPrices).sort();
        for (let i = dates.length - 1; i >= 0; i--) {
          if (dates[i] <= dateStr) {
            price = tickerPrices[dates[i]];
            break;
          }
        }
      }

      if (price !== undefined) {
        const value = quantity * price;
        stockValue += value;
        holdingsDebug.push(`${quantity.toFixed(4)} ${ticker} @ $${price.toFixed(2)} = $${value.toFixed(2)}`);
      } else {
        holdingsDebug.push(`${quantity.toFixed(4)} ${ticker} @ NO PRICE`);
      }
    });

    const portfolioValue = portfolio.cash + stockValue;

    console.log(`📅 ${dateStr}: Cash=$${portfolio.cash.toFixed(2)}, Stock=$${stockValue.toFixed(2)}, Total=$${portfolioValue.toFixed(2)}`);
    if (holdingsDebug.length > 0 && holdingsDebug.length <= 5) {
      holdingsDebug.forEach(h => console.log(`   ${h}`));
    } else if (holdingsDebug.length > 5) {
      console.log(`   Holdings: ${holdingsDebug.length} positions`);
    }

    portfolioValues.push({
      date: dateStr,
      timestamp: currentDate.getTime(),
      portfolioValue,
      cashValue: portfolio.cash,
      stockValue,
    });
  });

  return portfolioValues;
}
