interface Window {
  solana?: {
    isPhantom?: boolean;
    isConnected: boolean;
    publicKey?: {
      toString(): string;
    };
    connect(): Promise<{ publicKey: { toString(): string } }>;
    disconnect(): Promise<void>;
  };
}

