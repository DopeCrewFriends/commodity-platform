import React from 'react';

interface LandingPageProps {
  onConnectClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onConnectClick }) => {
  return (
    <main className="landing-page" id="landingPage">
      <div className="landing-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>
      <div className="landing-container">
        <div className="landing-content">
          <h1 className="landing-title">
            <span className="gradient-text">FRICTIONLESS GLOBAL TRANSFERS</span>
          </h1>
          <p className="landing-subtitle">
            Digital escrow service designed to guarantee trade settlement & minimize the risk of monetary fraud or non-delivery of goods
          </p>
          <button className="btn btn-primary btn-large landing-cta" onClick={onConnectClick}>
            <span className="btn-text">CONNECT WALLET TO START</span>
          </button>
        </div>
      </div>
    </main>
  );
};

export default LandingPage;
