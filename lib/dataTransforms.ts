import { DepositData } from "./types";

export function calculateCumulativeDeposits(
  data: DepositData[]
): DepositData[] {
  let cumulative = 0;
  return data.map((item) => {
    // Net change: deposits - withdrawals
    cumulative += (item.deposit || item.amount || 0) - (item.withdrawal || 0);
    return {
      ...item,
      cumulative,
    };
  });
}

export function calculateRangeStatistics(
  data: DepositData[],
  startTimestamp: number,
  endTimestamp: number
): {
  totalDeposited: number;
  totalWithdrawn: number;
  netChange: number;
  daysElapsed: number;
  avgPerMonth: number;
  startDate: string;
  endDate: string;
} {
  const start = Math.min(startTimestamp, endTimestamp);
  const end = Math.max(startTimestamp, endTimestamp);

  // Filter transactions within the timestamp range
  const rangeData = data.filter(
    (d) => d.timestamp >= start && d.timestamp <= end
  );

  const totalDeposited = rangeData.reduce((sum, d) => sum + (d.deposit || d.amount || 0), 0);
  const totalWithdrawn = rangeData.reduce((sum, d) => sum + (d.withdrawal || 0), 0);
  const netChange = totalDeposited - totalWithdrawn;

  const daysElapsed = Math.abs((end - start) / (1000 * 60 * 60 * 24));
  const monthsElapsed = daysElapsed / 30.44; // Average days per month

  const avgPerMonth = monthsElapsed > 0 ? netChange / monthsElapsed : 0;

  // Format dates
  const startDate = new Date(start).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
  const endDate = new Date(end).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  return {
    totalDeposited,
    totalWithdrawn,
    netChange,
    daysElapsed: Math.round(daysElapsed),
    avgPerMonth,
    startDate,
    endDate,
  };
}
