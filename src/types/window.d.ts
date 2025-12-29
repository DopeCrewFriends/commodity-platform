interface Window {
  solana?: {
    isPhantom?: boolean;
    isConnected: boolean;
    publicKey?: {
      toString(): string;
    };
    connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
    disconnect(): Promise<void>;
    on(event: string, callback: (args: any) => void): void;
    removeListener(event: string, callback: (args: any) => void): void;
  };
  phantom?: {
    solana?: {
      isPhantom?: boolean;
      isConnected: boolean;
      publicKey?: {
        toString(): string;
      };
      connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
      disconnect(): Promise<void>;
      on(event: string, callback: (args: any) => void): void;
      removeListener(event: string, callback: (args: any) => void): void;
    };
  };
}

