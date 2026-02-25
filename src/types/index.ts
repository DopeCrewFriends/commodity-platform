export interface ProfileData {
  name: string;
  email: string;
  company: string;
  location: string;
  avatarImage: string; // Optional for sign-in; can be empty string (initials used as fallback)
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

// Standardized escrow status values
export type EscrowStatus = 'waiting' | 'ongoing' | 'completed' | 'cancelled';

export interface Escrow {
  id: string;
  buyer: string;
  seller: string;
  commodity: string;
  amount: number;
  status: EscrowStatus;
  startDate: string;
  created_by?: string; // Wallet address of user who created the escrow
  paymentMethod?: 'USDT' | 'USDC'; // Payment method specified by buyer
  cancelled_by?: string; // Wallet address of user who cancelled/rejected (seller = rejected, buyer = cancelled)
  complete_signed_by?: string[]; // Wallet addresses of parties who have signed to complete (2/2 = completed)
  cancel_signed_by?: string[];   // Wallet addresses of parties who have signed to cancel (2/2 = cancelled)
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

