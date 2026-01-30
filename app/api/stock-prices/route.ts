import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function POST(request: NextRequest) {
  try {
    const { tickers, startDate, endDate } = await request.json();

    console.log('📊 Stock price API called');
    console.log(`   Tickers (${tickers.length}):`, tickers.join(', '));
    console.log(`   Date range: ${startDate} to ${endDate}`);

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json(
        { error: 'Tickers array is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch historical data for all tickers
    const priceData: Record<string, Record<string, number>> = {};

    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          console.log(`🔍 Fetching prices for ${ticker}...`);
          const result: any = await yahooFinance.historical(ticker, {
            period1: start,
            period2: end,
            interval: '1d',
          });

          priceData[ticker] = {};
          if (result && Array.isArray(result)) {
            let count = 0;
            result.forEach((quote: any) => {
              const dateStr = quote.date.toISOString().split('T')[0];
              // Use adjusted close if available, otherwise close
              priceData[ticker][dateStr] = quote.adjClose ?? quote.close;
              count++;
            });
            console.log(`✅ ${ticker}: fetched ${count} price points`);
          } else {
            console.log(`⚠️ ${ticker}: result is not an array or is null`);
          }
        } catch (error) {
          console.error(`🔴 Error fetching data for ${ticker}:`, error);
          // Return empty data for this ticker if fetch fails
          priceData[ticker] = {};
        }
      })
    );

    const totalPrices = Object.values(priceData).reduce((sum, ticker) => sum + Object.keys(ticker).length, 0);
    console.log(`📈 Total price points fetched: ${totalPrices}`);

    return NextResponse.json({ priceData });
  } catch (error) {
    console.error('🔴 Error fetching stock prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock prices' },
      { status: 500 }
    );
  }
}
