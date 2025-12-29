import React from 'react';
import { TokenBalance } from '../types';

interface BalancesSectionProps {
  balances: TokenBalance;
  solPrice: number;
  loading: boolean;
  priceLoading: boolean;
}

const BalancesSection: React.FC<BalancesSectionProps> = ({ balances, solPrice, loading, priceLoading }) => {
  const solUSDValue = balances.SOL.amount * solPrice;
  const totalUSDValue = solUSDValue + balances.USDC.amount;
  
  const totalUSDDisplay = totalUSDValue > 0 
    ? `$${totalUSDValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : loading || priceLoading ? 'Loading...' : '$0.00';

  return (
    <div className="balances-section">
      <div className="balances-header-card" id="balancesHeaderCard">
        <div className="balances-header-content">
          <div className="balances-title-section">
            <h2>Balance</h2>
            <div className="total-balance">
              <span className="balance-label">Total Balance</span>
              <span className="balance-amount" id="totalBalanceValue">
                {totalUSDDisplay}
              </span>
            </div>
          </div>
        </div>
        
        <div className="balances-token-list" id="balancesTokenList">
          <div className="token-list" id="tokenList">
            <div className="token-item" id="solTokenItem">
              <div className="token-icon">
                <img src="/sol.png" alt="SOL" className="token-logo" />
              </div>
              <div className="token-info">
                <div className="token-name">SOL</div>
                <div className="token-full-name">Solana</div>
              </div>
              <div className="token-balance">
                <div className="token-amount" id="solAmount">{balances.SOL.amount.toFixed(4)}</div>
                <div className="token-value" id="solValue">
                  {priceLoading ? (
                    'Loading price...'
                  ) : solPrice > 0 ? (
                    `$${(solUSDValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  ) : (
                    `${balances.SOL.amount.toFixed(4)} SOL`
                  )}
                </div>
              </div>
            </div>
            <div className="token-item" id="usdcTokenItem">
              <div className="token-icon">
                <img src="/usdc.png" alt="USDC" className="token-logo" />
              </div>
              <div className="token-info">
                <div className="token-name">USDC</div>
                <div className="token-full-name">USD Coin</div>
              </div>
              <div className="token-balance">
                <div className="token-amount" id="usdcAmount">
                  {balances.USDC.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="token-value" id="usdcValue">
                  {balances.USDC.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </div>
              </div>
            </div>
            {balances.SOL.amount === 0 && balances.USDC.amount === 0 && !loading && (
              <div className="no-tokens-message" id="noTokensMessage" style={{ display: 'block' }}>
                <p>No token balances found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalancesSection;

