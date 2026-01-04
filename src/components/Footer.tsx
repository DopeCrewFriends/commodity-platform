import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <p>&copy; {currentYear} SETL. All rights reserved.</p>
          </div>
          <div className="footer-section">
            <div className="footer-links">
              <a href="#" className="footer-link">Terms of Service</a>
              <span className="footer-separator">|</span>
              <a href="#" className="footer-link">Privacy Policy</a>
              <span className="footer-separator">|</span>
              <a href="#" className="footer-link">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

