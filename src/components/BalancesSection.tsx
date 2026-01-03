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
  const totalUSDValue = solUSDValue + balances.USDC.amount + balances.USDT.amount;
  
  const totalUSDDisplay = totalUSDValue > 0 
    ? `$${totalUSDValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : loading || priceLoading ? 'Loading...' : '$0.00';

  return (
    <div className="balances-section">
      <div className="balances-header-card" id="balancesHeaderCard">
        <div className="balances-header-content">
          <div className="balances-title-section">
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
                <img src="/images/sol.png" alt="SOL" className="token-logo" />
              </div>
              <div className="token-info">
                <div className="token-name">SOL</div>
              </div>
              <div className="token-balance">
                <div className="token-amount" id="solAmount">
                  {priceLoading ? (
                    'Loading...'
                  ) : (
                    <>
                      <div className="token-amount-value">{balances.SOL.amount.toFixed(4)} SOL</div>
                      {solPrice > 0 && (
                        <div className="token-amount-usd">${(solUSDValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="token-item" id="usdcTokenItem">
              <div className="token-icon">
                <img src="/images/usdc.png" alt="USDC" className="token-logo" />
              </div>
              <div className="token-info">
                <div className="token-name">USDC</div>
              </div>
              <div className="token-balance">
                <div className="token-amount" id="usdcAmount">
                  <div className="token-amount-value">{balances.USDC.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</div>
                  <div className="token-amount-usd">${balances.USDC.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
            <div className="token-item" id="usdtTokenItem">
              <div className="token-icon">
                <img src="/images/usdt logo.png" alt="USDT" className="token-logo" />
              </div>
              <div className="token-info">
                <div className="token-name">USDT</div>
              </div>
              <div className="token-balance">
                <div className="token-amount" id="usdtAmount">
                  <div className="token-amount-value">{balances.USDT.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</div>
                  <div className="token-amount-usd">${balances.USDT.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalancesSection;



