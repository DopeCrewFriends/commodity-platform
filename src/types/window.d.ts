interface Window {
  solana?: {
    isPhantom?: boolean;
    isConnected: boolean;
    publicKey?: {
      toString(): string;
      toBytes?(): Uint8Array;
    };
    signTransaction?(tx: unknown): Promise<unknown>;
    /** Phantom: sign + broadcast in one step (recommended; often fixes misleading pre-sign simulation vs app RPC). */
    signAndSendTransaction?(
      tx: unknown,
      options?: { skipPreflight?: boolean; preflightCommitment?: string; maxRetries?: number }
    ): Promise<{ signature: string } | string>;
    signAllTransactions?(txs: unknown[]): Promise<unknown[]>;
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
        toBytes?(): Uint8Array;
      };
      signTransaction?(tx: unknown): Promise<unknown>;
      signAndSendTransaction?(
        tx: unknown,
        options?: { skipPreflight?: boolean; preflightCommitment?: string; maxRetries?: number }
      ): Promise<{ signature: string } | string>;
      signAllTransactions?(txs: unknown[]): Promise<unknown[]>;
      connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
      disconnect(): Promise<void>;
      on(event: string, callback: (args: any) => void): void;
      removeListener(event: string, callback: (args: any) => void): void;
    };
  };
}

