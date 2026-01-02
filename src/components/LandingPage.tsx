import React from 'react';

interface LandingPageProps {
  onConnectClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onConnectClick }) => {
  return (
    <main className="landing-page" id="landingPage">
      <div className="landing-container">
        <div className="landing-content">
          <h1 className="landing-title">
            Frictionless Global Transfers
          </h1>
          <p className="landing-subtitle">
            Digital escrow service designed to guarantee trade settlement & minimize the risk of monetary fraud or non-delivery of goods
          </p>
          <button className="btn btn-primary landing-cta" onClick={onConnectClick}>
            Connect Wallet to Start
          </button>
        </div>
      </div>
    </main>
  );
};

export default LandingPage;
