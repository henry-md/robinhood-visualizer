"use client";

import { useState, useRef, MouseEvent } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
} from "recharts";
import { DepositData } from "@/lib/types";
import {
  calculateCumulativeDeposits,
  calculateRangeStatistics,
} from "@/lib/dataTransforms";

interface DepositChartProps {
  data: DepositData[];
}

export default function DepositChart({ data }: DepositChartProps) {
  const [viewMode, setViewMode] = useState<"individual" | "cumulative">(
    "individual"
  );
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (data.length === 0) {
    return null;
  }

  const cumulativeData = calculateCumulativeDeposits(data);
  const chartData = viewMode === "cumulative" ? cumulativeData : data;

  const totalDeposits = data.reduce((sum, d) => sum + d.amount, 0);
  const avgDeposit = totalDeposits / data.length;

  const handleMouseDown = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const timestamp = e.activePayload[0].payload.timestamp;
      setDragStart(timestamp);
      setDragEnd(timestamp);
      setIsDragging(true);
      setSelectedRange(null);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isDragging && e && e.activePayload && e.activePayload.length > 0) {
      const timestamp = e.activePayload[0].payload.timestamp;
      setDragEnd(timestamp);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      // Only set selection if there's a meaningful range (more than 1 day)
      if (Math.abs(end - start) > 1000 * 60 * 60 * 24) {
        setSelectedRange({ start, end });
      }
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const clearSelection = () => {
    setSelectedRange(null);
  };

  let rangeStats = null;
  if (selectedRange) {
    rangeStats = calculateRangeStatistics(
      data,
      selectedRange.start,
      selectedRange.end
    );
  }

  const getRefAreaProps = () => {
    if (dragStart === null || dragEnd === null) return null;
    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);
    return {
      x1: start,
      x2: end,
    };
  };

  const refAreaProps = getRefAreaProps();

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Total Deposits
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            ${totalDeposits.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Average Deposit
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            ${avgDeposit.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Number of Deposits
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.length}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {viewMode === "cumulative"
              ? "Cumulative Deposits"
              : "Deposit History"}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Individual
            </span>
            <button
              onClick={() => {
                setViewMode(
                  viewMode === "individual" ? "cumulative" : "individual"
                );
                clearSelection();
              }}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              style={{
                backgroundColor:
                  viewMode === "cumulative" ? "#22c55e" : "#d4d4d8",
              }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{
                  transform:
                    viewMode === "cumulative"
                      ? "translateX(24px)"
                      : "translateX(4px)",
                }}
              />
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Cumulative
            </span>
          </div>
        </div>

        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {viewMode === "cumulative"
            ? "Drag across the chart to select a time range and see detailed statistics"
            : "Individual deposit amounts by date"}
        </p>

        <div className="relative">
          <ResponsiveContainer width="100%" height={400}>
            {viewMode === "cumulative" ? (
              <LineChart
                data={chartData}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                    })
                  }
                />
                <YAxis
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e4e4e7",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                  formatter={(value) => {
                    if (value === undefined) return '$0.00';
                    const numValue = typeof value === 'string' ? parseFloat(value) : value;
                    return `$${numValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;
                  }}
                />
                <Legend />
                {refAreaProps && (
                  <ReferenceArea
                    x1={refAreaProps.x1}
                    x2={refAreaProps.x2}
                    strokeOpacity={0.3}
                    fill="#22c55e"
                    fillOpacity={0.3}
                  />
                )}
                {selectedRange && (
                  <ReferenceArea
                    x1={selectedRange.start}
                    x2={selectedRange.end}
                    strokeOpacity={0.3}
                    fill="#22c55e"
                    fillOpacity={0.2}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Cumulative Deposits"
                  dot={{ fill: "#22c55e", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                    })
                  }
                />
                <YAxis
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e4e4e7",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                  formatter={(value) => {
                    if (value === undefined) return '$0.00';
                    const numValue = typeof value === 'string' ? parseFloat(value) : value;
                    return `$${numValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="amount"
                  fill="#22c55e"
                  name="Deposit Amount"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>

          {rangeStats && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-300 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Selected Range
                </h3>
                <button
                  onClick={clearSelection}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-8">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Period:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {rangeStats.startDate} - {rangeStats.endDate}
                  </span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Total Deposited:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    ${rangeStats.totalDeposited.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Time Elapsed:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {rangeStats.daysElapsed} days
                  </span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Avg per Month:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    ${rangeStats.avgPerMonth.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
