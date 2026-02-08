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
  timestamp?: number; // Added for sorting/filtering
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

// Subscription detection types
export interface SubscriptionInfo {
  isSubscription: boolean;
  merchantGroup: string;
  recurrence: 'monthly' | 'yearly' | 'weekly' | 'bi-weekly' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  nextExpectedDate?: number;
  relatedTransactions: number[]; // indices of related transactions
  typicalAmount: number;
}

// Chase transaction types
export interface ChaseTransaction {
  details?: 'CREDIT' | 'DEBIT'; // Only for checking accounts
  postingDate: string;
  transactionDate?: string; // Only for credit cards
  description: string;
  amount: number;
  type: string;
  balance: number | null; // Only for checking accounts
  checkOrSlip?: string; // Only for checking accounts
  category?: string; // Only for credit cards
  memo?: string; // Only for credit cards
  timestamp: number;
  accountType: 'checking' | 'credit'; // Track which type of account
  filename?: string; // Track source file for combined view
  subscriptionInfo?: SubscriptionInfo; // Subscription detection metadata
}

export interface ChaseFile {
  filename: string;
  transactions: ChaseTransaction[];
  dateRange: {
    start: string;
    end: string;
  };
  accountType: 'checking' | 'credit';
}

export type FileType = 'robinhood' | 'chase' | 'unknown';
