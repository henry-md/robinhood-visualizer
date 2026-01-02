"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DepositData } from "@/lib/types";

interface DepositChartProps {
  data: DepositData[];
}

export default function DepositChart({ data }: DepositChartProps) {
  if (data.length === 0) {
    return null;
  }

  const totalDeposits = data.reduce((sum, d) => sum + d.amount, 0);
  const avgDeposit = totalDeposits / data.length;

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
        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Deposit History
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
            <XAxis
              dataKey="date"
              className="text-xs text-zinc-500 dark:text-zinc-400"
              angle={-45}
              textAnchor="end"
              height={80}
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
              formatter={(value: number) =>
                `$${value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              }
            />
            <Legend />
            <Bar
              dataKey="amount"
              fill="#22c55e"
              name="Deposit Amount"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
