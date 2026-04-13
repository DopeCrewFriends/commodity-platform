import React from 'react';
import { TokenBalance } from '../types';

const MASK = '****';

interface BalancesSectionProps {
  balances: TokenBalance;
  solPrice: number;
  loading: boolean;
  priceLoading: boolean;
  /** Hide real amounts and show blur overlay (e.g. public profile when viewer is not a contact). */
  balancesLocked?: boolean;
  /** Shown centered on the overlay when `balancesLocked` (e.g. connect / add contact). */
  lockedAction?: React.ReactNode;
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type AssetKey = 'sol' | 'usdc' | 'usdt';

interface AssetRowProps {
  asset: AssetKey;
  symbol: string;
  label: string;
  iconSrc: string;
  nativeLine: React.ReactNode;
  usdLine: React.ReactNode;
}

const AssetRow: React.FC<AssetRowProps> = ({ asset, symbol, label, iconSrc, nativeLine, usdLine }) => (
  <article className={`balance-panel__asset balance-panel__asset--${asset}`} data-asset={asset}>
    <div className="balance-panel__asset-accent" aria-hidden />
    <div className="balance-panel__asset-inner">
      <div className="balance-panel__asset-left">
        <div className="balance-panel__icon-wrap">
          <img src={iconSrc} alt="" className="balance-panel__icon" width={22} height={22} aria-hidden />
        </div>
        <div className="balance-panel__asset-titles">
          <span className="balance-panel__symbol">{symbol}</span>
          <span className="balance-panel__label">{label}</span>
        </div>
      </div>
      <div className="balance-panel__asset-right">
        <span className="balance-panel__native">{nativeLine}</span>
        <span className="balance-panel__usd">{usdLine}</span>
      </div>
    </div>
  </article>
);

const BalancesSection: React.FC<BalancesSectionProps> = ({
  balances,
  solPrice,
  loading,
  priceLoading,
  balancesLocked = false,
  lockedAction,
}) => {
  const solUSDValue = balances.SOL.amount * solPrice;
  const totalUSDValue = solUSDValue + balances.USDC.amount + balances.USDT.amount;

  const totalDisplay = balancesLocked
    ? MASK
    : totalUSDValue > 0
      ? fmtUsd(totalUSDValue)
      : loading || priceLoading
        ? '…'
        : fmtUsd(0);

  const solNative = balancesLocked ? (
    <span className="balance-panel__mask">{MASK}</span>
  ) : priceLoading && solPrice <= 0 ? (
    <span className="balance-panel__shimmer">Loading…</span>
  ) : (
    <>{balances.SOL.amount.toFixed(4)} SOL</>
  );

  const solUsd = balancesLocked ? (
    <span className="balance-panel__mask">{MASK}</span>
  ) : priceLoading && solPrice <= 0 ? (
    <span className="balance-panel__muted">—</span>
  ) : solPrice > 0 ? (
    fmtUsd(solUSDValue)
  ) : (
    <span className="balance-panel__muted">No price</span>
  );

  const body = (
    <>
      <header className="balance-panel__hero">
        <div className="balance-panel__hero-text">
          <h2 className="balance-panel__title">Balances</h2>
          <p className="balance-panel__subtitle">Estimated value (USD)</p>
        </div>
        <p className="balance-panel__total" id="totalBalanceValue">
          {totalDisplay}
        </p>
      </header>

      <div className="balance-panel__assets balances-token-list" id="balancesTokenList">
        <AssetRow
          asset="sol"
          symbol="SOL"
          label="Solana"
          iconSrc="/images/sol.png"
          nativeLine={solNative}
          usdLine={solUsd}
        />
        <AssetRow
          asset="usdc"
          symbol="USDC"
          label="USD Coin"
          iconSrc="/images/usdc.png"
          nativeLine={
            balancesLocked ? (
              <span className="balance-panel__mask">{MASK} USDC</span>
            ) : (
              <>{balances.USDC.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</>
            )
          }
          usdLine={balancesLocked ? <span className="balance-panel__mask">{MASK}</span> : fmtUsd(balances.USDC.amount)}
        />
        <AssetRow
          asset="usdt"
          symbol="USDT"
          label="Tether"
          iconSrc="/images/usdt logo.png"
          nativeLine={
            balancesLocked ? (
              <span className="balance-panel__mask">{MASK} USDT</span>
            ) : (
              <>{balances.USDT.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</>
            )
          }
          usdLine={balancesLocked ? <span className="balance-panel__mask">{MASK}</span> : fmtUsd(balances.USDT.amount)}
        />
      </div>
    </>
  );

  return (
    <div className="balances-section balance-panel">
      <div
        className={`balances-header-card balance-panel__card${balancesLocked ? ' balance-panel__card--locked' : ''}`}
        id="balancesHeaderCard"
      >
        {balancesLocked ? (
          <div className="balance-panel__locked-inner">
            {body}
            {lockedAction ? (
              <div className="balance-panel__lock-overlay">
                <div className="balance-panel__lock-overlay-inner">{lockedAction}</div>
              </div>
            ) : null}
          </div>
        ) : (
          body
        )}
      </div>
    </div>
  );
};

export default BalancesSection;
