"use client";

import { ChaseTransaction } from "@/lib/types";
import ChaseTransactions from "./ChaseTransactions";
import StatsBlock from "./StatsBlock";
import { calculateChaseStats } from "@/lib/chaseStats";

interface ChaseDashboardProps {
  transactions: ChaseTransaction[];
}

export default function ChaseDashboard({ transactions }: ChaseDashboardProps) {
  const stats = calculateChaseStats(transactions);

  return (
    <div className="space-y-8">
      <StatsBlock
        stats={[
          {
            label: "Current Balance",
            value: `$${stats.currentBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
          {
            label: "Deposits This Month",
            value: `$${stats.depositsThisMonth.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "green",
          },
          {
            label: "Withdrawals This Month",
            value: `$${stats.withdrawalsThisMonth.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "red",
          },
        ]}
      />
      <ChaseTransactions transactions={transactions} />
    </div>
  );
}
