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

export interface StockTransaction {
  date: string;
  timestamp: number;
  ticker: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  transCode?: string; // Original transaction code (SPL, REC, Buy, Sell, etc.)
}

export interface CashTransaction {
  date: string;
  timestamp: number;
  type: 'deposit' | 'withdrawal' | 'dividend' | 'interest' | 'fee';
  amount: number;
  ticker?: string;
}

export interface Portfolio {
  cash: number;
  holdings: Map<string, number>;
}

export interface PortfolioValueData {
  date: string;
  timestamp: number;
  portfolioValue: number;
  cashValue: number;
  stockValue: number;
}

// Chase transaction types
export interface ChaseTransaction {
  details: 'CREDIT' | 'DEBIT';
  postingDate: string;
  description: string;
  amount: number;
  type: string;
  balance: number | null;
  checkOrSlip: string;
  timestamp: number;
}

export interface ChaseFile {
  filename: string;
  transactions: ChaseTransaction[];
  dateRange: {
    start: string;
    end: string;
  };
}

export type FileType = 'robinhood' | 'chase' | 'unknown';
