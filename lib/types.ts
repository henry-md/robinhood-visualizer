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

export interface DepositData {
  date: string;
  timestamp: number;
  amount: number;
  cumulative?: number;
}

export interface RangeSelection {
  startIndex: number;
  endIndex: number;
}
