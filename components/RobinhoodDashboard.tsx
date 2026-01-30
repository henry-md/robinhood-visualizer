"use client";

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from "react";
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
  ReferenceLine,
} from "recharts";
import { DepositData, PortfolioValueData } from "@/lib/types";
import {
  calculateCumulativeDeposits,
  calculateRangeStatistics,
} from "@/lib/dataTransforms";
import StatsBlock, { StatItem } from "./StatsBlock";

interface RobinhoodDashboardProps {
  data: DepositData[];
  portfolioData?: PortfolioValueData[];
  onLoadPortfolio?: () => void;
  isLoadingPortfolio?: boolean;
}

export default function RobinhoodDashboard({
  data,
  portfolioData = [],
  onLoadPortfolio,
  isLoadingPortfolio = false,
}: RobinhoodDashboardProps) {
  const [viewMode, setViewMode] = useState<"individual" | "cumulative" | "portfolio">(
    "individual"
  );
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomedRange, setZoomedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState<{
    left: number;
    right: number;
    width: number;
  } | null>(null);
  const [currentTime] = useState(() => Date.now()); // Runs once on mount

  // Calculate chart dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        // Account for chart margins (left: 20, right: 30 from LineChart margin prop)
        const leftMargin = 60; // Approximate Y-axis width
        const rightMargin = 30;
        const width = rect.width - leftMargin - rightMargin;
        setChartDimensions((prev) => {
          // Only update if dimensions actually changed
          if (
            prev &&
            prev.left === leftMargin &&
            prev.right === rect.width - rightMargin &&
            prev.width === width
          ) {
            return prev;
          }
          return {
            left: leftMargin,
            right: rect.width - rightMargin,
            width: width,
          };
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    // Also update after a short delay to ensure ResponsiveContainer has rendered
    const timeout = setTimeout(updateDimensions, 100);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      clearTimeout(timeout);
    };
  }, []);

  if (data.length === 0) {
    return null;
  }

  // Calculate data bounds first (from original data, not filtered/transformed)
  const allMinTimestamp = Math.min(...data.map((d) => d.timestamp));
  const allMaxTimestamp = Math.max(...data.map((d) => d.timestamp));

  // Cap zoomed range to current time and clamp to data bounds
  const effectiveZoomedRange = zoomedRange
    ? {
        start: Math.max(allMinTimestamp, zoomedRange.start),
        end: Math.min(allMaxTimestamp, Math.min(zoomedRange.end, currentTime))
      }
    : null;

  // Filter data based on zoom first, then apply cumulative transformation
  // This ensures cumulative view starts from 0 when zoomed
  const baseData = effectiveZoomedRange
    ? data.filter(
        (d) => d.timestamp >= effectiveZoomedRange.start && d.timestamp <= effectiveZoomedRange.end
      )
    : data;

  // Filter portfolio data based on zoom if needed
  const filteredPortfolioData = effectiveZoomedRange && portfolioData.length > 0
    ? portfolioData.filter(
        (d) => d.timestamp >= effectiveZoomedRange.start && d.timestamp <= effectiveZoomedRange.end
      )
    : portfolioData;

  // Apply view mode transformation to the filtered data
  const chartData = viewMode === "cumulative"
    ? calculateCumulativeDeposits(baseData)
    : viewMode === "portfolio"
    ? filteredPortfolioData
    : baseData;

  const displayData = chartData;

  // Don't render chart if portfolio view is selected but no data is available
  if (viewMode === "portfolio" && portfolioData.length === 0) {
    // Will show the info message instead
  }

  // Filter original data for stats based on zoom (not cumulative data)
  const displayDataForStats = effectiveZoomedRange
    ? data.filter(
        (d) => d.timestamp >= effectiveZoomedRange.start && d.timestamp <= effectiveZoomedRange.end
      )
    : data;

  const totalDeposits = displayDataForStats.reduce((sum, d) => sum + (d.deposit || d.amount || 0), 0);
  const totalWithdrawals = displayDataForStats.reduce((sum, d) => sum + (d.withdrawal || 0), 0);
  const netAmount = totalDeposits - totalWithdrawals;

  // Use effective zoomed range if available, otherwise use full range (capped to current time)
  const minTimestamp = effectiveZoomedRange ? effectiveZoomedRange.start : allMinTimestamp;
  const maxTimestamp = effectiveZoomedRange ? effectiveZoomedRange.end : Math.min(allMaxTimestamp, currentTime);

  // Calculate time range in months based on x-axis range (not just data points)
  const timeRangeMs = maxTimestamp - minTimestamp;
  const timeRangeMonths = timeRangeMs / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
  const netAmountPerMonth = timeRangeMonths > 0 ? netAmount / timeRangeMonths : netAmount;

  // Calculate domain with padding
  const range = maxTimestamp - minTimestamp;
  const padding = range * 0.05;
  const domainMin = minTimestamp - padding;
  const domainMax = maxTimestamp + padding;

  // Calculate dynamic bar size based on zoom level
  const fullTimeRange = allMaxTimestamp - allMinTimestamp;
  const currentTimeRange = maxTimestamp - minTimestamp;
  const zoomRatio = fullTimeRange / currentTimeRange;
  const dynamicBarSize = 10 + 2 * zoomRatio;
  
  // Custom bar shape with fixed width and rounded top
  interface CustomBarProps {
    fill: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }
  const CustomBar = (props: unknown) => {
    const { fill, x, y, width, height } = props as CustomBarProps;
    const barWidth = dynamicBarSize;
    const centerX = x + width / 2;
    const adjustedX = centerX - barWidth / 2;
    const strokeColor = "#18181b";
    const borderRadius = barWidth * 0.20; // As a % of bar width for proportional rounding
    const borderWidth = barWidth * 0.03; // As a % of bar width for proportional border

    return (
      <foreignObject x={adjustedX} y={y} width={barWidth} height={height}>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: fill,
            borderTopLeftRadius: `${borderRadius}px`,
            borderTopRightRadius: `${borderRadius}px`,
            border: `${borderWidth}px solid ${strokeColor}`,
          }}
        />
      </foreignObject>
    );
  };

  // Convert mouse X position to timestamp
  const getTimestampFromX = (mouseX: number): number | null => {
    if (!chartContainerRef.current || !chartDimensions) return null;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const relativeX = mouseX - rect.left - chartDimensions.left;
    const chartWidth = chartDimensions.width;

    if (relativeX < 0 || relativeX > chartWidth) return null;

    const ratio = relativeX / chartWidth;
    const timestamp = domainMin + ratio * (domainMax - domainMin);
    return timestamp;
  };

  const handleChartMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Prevent text selection
    e.preventDefault();

    const timestamp = getTimestampFromX(e.clientX);
    if (timestamp !== null) {
      setDragStart(timestamp);
      setDragEnd(timestamp);
      setIsDragging(true);
      setSelectedRange(null);
    }
  };

  const handleChartMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    // Prevent text selection during drag
    e.preventDefault();

    const timestamp = getTimestampFromX(e.clientX);
    if (timestamp !== null) {
      setDragEnd(timestamp);
    }
  };

  const handleChartMouseUp = () => {
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

  const handleChartMouseLeave = () => {
    if (isDragging) {
      handleChartMouseUp();
    }
  };


  const clearSelection = () => {
    setSelectedRange(null);
  };

  const handleZoomIn = () => {
    if (selectedRange) {
      setZoomedRange(selectedRange);
      setSelectedRange(null);
    }
  };

  const handleResetZoom = () => {
    setZoomedRange(null);
    setSelectedRange(null);
  };

  // Calculate stats for either active drag or selected range
  let rangeStats = null;
  if (selectedRange) {
    rangeStats = calculateRangeStatistics(
      data,
      selectedRange.start,
      selectedRange.end
    );
  } else if (isDragging && dragStart !== null && dragEnd !== null) {
    // Show stats in real-time while dragging
    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);
    // Only show if meaningful range (more than 1 day)
    if (Math.abs(end - start) > 1000 * 60 * 60 * 24) {
      rangeStats = calculateRangeStatistics(data, start, end);
    }
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

  // Calculate date range for display using x-axis range (capped to current date)
  const startDate = new Date(minTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const endDate = new Date(maxTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="w-full space-y-6" suppressHydrationWarning>
      <div className="text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Showing data from <span className="font-semibold text-zinc-900 dark:text-zinc-50">{startDate}</span> to <span className="font-semibold text-zinc-900 dark:text-zinc-50">{endDate}</span>
        </p>
      </div>
      <StatsBlock
        stats={[
          {
            label: "Total Deposits",
            value: `$${totalDeposits.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "green",
          },
          {
            label: "Total Withdrawals",
            value: `$${totalWithdrawals.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "red",
          },
          {
            label: "Net Amount per mo",
            value: `$${netAmountPerMonth.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
          {
            label: "Transactions",
            value: displayDataForStats.length.toString(),
          },
        ]}
      />

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {viewMode === "cumulative"
              ? "Cumulative Deposits"
              : viewMode === "portfolio"
              ? "Portfolio Value"
              : "Deposit History"}
            {zoomedRange && (
              <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                (Zoomed)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-4">
            {zoomedRange && (
              <button
                onClick={handleResetZoom}
                className="rounded-md bg-zinc-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
              >
                Reset Zoom
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setViewMode("individual");
                  clearSelection();
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "individual"
                    ? "bg-green-500 text-white"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => {
                  setViewMode("cumulative");
                  clearSelection();
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "cumulative"
                    ? "bg-green-500 text-white"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                }`}
              >
                Cumulative
              </button>
              <button
                onClick={() => {
                  if (portfolioData.length === 0 && onLoadPortfolio) {
                    onLoadPortfolio();
                  }
                  setViewMode("portfolio");
                  clearSelection();
                }}
                disabled={isLoadingPortfolio}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "portfolio"
                    ? "bg-green-500 text-white"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                } ${isLoadingPortfolio ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoadingPortfolio ? "Loading..." : "Portfolio"}
              </button>
            </div>
          </div>
        </div>

        {viewMode === "portfolio" && portfolioData.length === 0 && !isLoadingPortfolio ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Click the Portfolio button above to load portfolio value data. This will fetch historical stock prices and calculate your portfolio value over time.
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Drag across the chart to select a time range and see detailed statistics
          </p>
        )}

        {!(viewMode === "portfolio" && portfolioData.length === 0) && (
          <div
            ref={chartContainerRef}
            className="relative no-select"
            onMouseDown={handleChartMouseDown}
            onMouseMove={handleChartMouseMove}
            onMouseUp={handleChartMouseUp}
            onMouseLeave={handleChartMouseLeave}
            style={{
              cursor: "crosshair",
            }}
            suppressHydrationWarning
          >
            <ResponsiveContainer width="100%" height={400}>
            {viewMode === "cumulative" || viewMode === "portfolio" ? (
              <LineChart
                data={displayData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={[domainMin, domainMax]}
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
                  wrapperStyle={{ zIndex: 1000 }}
                  cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.85)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                  labelStyle={{
                    color: "#ffffff",
                    fontWeight: "600",
                    marginBottom: "4px",
                    fontSize: "14px",
                  }}
                  itemStyle={{
                    color: "#22c55e",
                    fontSize: "14px",
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
                {currentTime >= domainMin && currentTime <= domainMax && (
                  <ReferenceLine
                    x={currentTime}
                    stroke="#dc2626"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    label={{
                      value: "Now",
                      position: "top",
                      fill: "#dc2626",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey={viewMode === "portfolio" ? "portfolioValue" : "cumulative"}
                  stroke="#22c55e"
                  strokeWidth={2}
                  name={viewMode === "portfolio" ? "Portfolio Value" : "Cumulative Deposits"}
                  dot={{ fill: "#22c55e", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                {viewMode === "portfolio" && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="stockValue"
                      stroke="#3b82f6"
                      strokeWidth={1}
                      name="Stock Value"
                      dot={false}
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="cashValue"
                      stroke="#eab308"
                      strokeWidth={1}
                      name="Cash Value"
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </>
                )}
              </LineChart>
            ) : (
              <BarChart
                data={displayData}
                margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={[domainMin, domainMax]}
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
                  wrapperStyle={{ zIndex: 1000 }}
                  cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.85)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                  labelStyle={{
                    color: "#ffffff",
                    fontWeight: "600",
                    marginBottom: "4px",
                    fontSize: "14px",
                  }}
                  itemStyle={{
                    color: "#22c55e",
                    fontSize: "14px",
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
                {currentTime >= domainMin && currentTime <= domainMax && (
                  <ReferenceLine
                    x={currentTime}
                    stroke="#dc2626"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    label={{
                      value: "Now",
                      position: "top",
                      fill: "#dc2626",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                )}
                <Bar
                  dataKey="deposit"
                  fill="#22c55e"
                  name="Deposits"
                  shape={CustomBar}
                />
                <Bar
                  dataKey="withdrawal"
                  fill="#dc2626"
                  name="Withdrawals"
                  shape={CustomBar}
                />
              </BarChart>
            )}
          </ResponsiveContainer>

          {rangeStats && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-300 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {isDragging ? "Selecting Range" : "Selected Range"}
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
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ${rangeStats.totalDeposited.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Total Withdrawn:
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    ${rangeStats.totalWithdrawn.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Net Change:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    ${rangeStats.netChange.toLocaleString("en-US", {
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
              {!isDragging && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomIn();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex-1 rounded-md bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                  >
                    Zoom to Range
                  </button>
                  {zoomedRange && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetZoom();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="flex-1 rounded-md bg-zinc-500 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
                    >
                      Reset Zoom
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
