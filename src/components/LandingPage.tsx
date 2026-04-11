import React from 'react';

interface LandingPageProps {
  onConnectClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onConnectClick }) => {
  return (
    <main className="landing-page" id="landingPage">
      <div className="landing-container">
        <div className="landing-inst">
          <div className="landing-inst-main">
            <p className="landing-inst-kicker">Commercial escrow</p>
            <h1 className="landing-title">Settlement infrastructure for digital trade</h1>
            <p className="landing-subtitle">
              Document terms, hold stablecoin in escrow on Solana, and release funds when delivery and
              acceptance criteria are satisfied—aligned with your verified profile and contact network.
            </p>
            <button type="button" className="btn btn-primary landing-cta" onClick={onConnectClick}>
              Sign in with wallet
            </button>
          </div>
          <aside className="landing-inst-aside" aria-label="Platform overview">
            <h2>At a glance</h2>
            <ul className="landing-inst-list">
              <li>
                <strong>Escrow</strong>
                USDC and USDT-supported flows with on-chain program integration where configured.
              </li>
              <li>
                <strong>Governance</strong>
                Buyer and seller confirmations, status timeline, and exportable activity.
              </li>
              <li>
                <strong>Directory</strong>
                Contacts, inbound requests, and optional notifications for pending actions.
              </li>
            </ul>
            <p className="landing-inst-disclaimer">
              Digital asset services may be subject to regulation in your jurisdiction. Review terms with counsel
              before committing funds.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default LandingPage;
