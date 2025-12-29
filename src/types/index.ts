export interface ProfileData {
  name: string;
  email: string;
  company: string;
  location: string;
  avatarImage?: string;
  walletAddress: string;
}

export interface Contact {
  id?: string;
  name: string;
  email: string;
  walletAddress: string;
  company?: string;
  location?: string;
}

export interface TokenBalance {
  SOL: { amount: number };
  USDC: { amount: number };
}

export interface Escrow {
  id: string;
  buyer: string;
  seller: string;
  commodity: string;
  amount: number;
  status: string;
  startDate: string;
}

export interface EscrowsData {
  totalAmount: number;
  items: Escrow[];
}

export interface Trade {
  id: string;
  buyer: string;
  seller: string;
  commodity: string;
  amount: number;
  duration: string;
  date: string;
  status: 'completed' | 'ongoing' | 'unsuccessful';
}

export interface TradeHistory {
  completed: Trade[];
  ongoing: Trade[];
  unsuccessful: Trade[];
}

export interface Statistics {
  memberSince: string | null;
  completedTrades: number;
  totalVolume: number;
  successRate: number | null;
  rating: number | null;
}

