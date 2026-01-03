export interface RobinhoodTransaction {
  "Activity Date": string;
  "Process Date": string;
  "Settle Date": string;
  "Instrument": string;
  "Description": string;
  "Trans Code": string;
  "Quantity": string;
  "Price": string;
  "Amount": string;
}

export interface TransactionData {
  date: string;
  timestamp: number;
  deposit: number;
  withdrawal: number;
  cumulative?: number;
}

// Keep for backwards compatibility
export interface DepositData extends TransactionData {
  amount: number;
}

export interface RangeSelection {
  startIndex: number;
  endIndex: number;
}
