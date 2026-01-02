export interface ProfileData {
  name: string;
  email: string;
  company: string;
  location: string;
  avatarImage: string; // Required - all fields must be filled
  walletAddress: string; // Optional: for backward compatibility
  username: string; // Required - all fields must be filled
  userId?: string; // Optional: user_id from auth (for internal use)
}

// Contact is now the same as ProfileData - contacts are just profiles with relationships
export type Contact = ProfileData;

export interface TokenBalance {
  SOL: { amount: number };
  USDC: { amount: number };
  USDT: { amount: number };
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

