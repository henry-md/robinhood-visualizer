"use client";

import { ChaseTransaction } from "@/lib/types";
import ChaseTransactions from "./ChaseTransactions";

interface ChaseDashboardProps {
  transactions: ChaseTransaction[];
}

export default function ChaseDashboard({ transactions }: ChaseDashboardProps) {
  return (
    <div className="space-y-8">
      <ChaseTransactions transactions={transactions} />
    </div>
  );
}
