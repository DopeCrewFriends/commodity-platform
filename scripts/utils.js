// ==================== UTILITY FUNCTIONS ====================
// Theme, Navigation, and UI Utilities

// Theme Toggle - Load immediately to prevent flash - default to dark for homepage
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Navigate to homepage function
function navigateToHomepage() {
    const landingPage = document.getElementById('landingPage');
    const profilePage = document.getElementById('profile');
    const navMenu = document.getElementById('navMenu');
    const themeToggle = document.getElementById('themeToggle');
    
    if (landingPage && profilePage) {
        landingPage.style.display = 'flex';
        profilePage.style.display = 'none';
    }
    
    if (navMenu) {
        navMenu.style.display = 'none';
    }
    
    if (themeToggle) {
        themeToggle.style.display = 'none';
    }
    
    document.documentElement.setAttribute('data-theme', 'dark');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigate to profile page function
function navigateToProfile() {
    const landingPage = document.getElementById('landingPage');
    const profilePage = document.getElementById('profile');
    const navMenu = document.getElementById('navMenu');
    const themeToggle = document.getElementById('themeToggle');
    
    if (landingPage && profilePage) {
        landingPage.style.display = 'none';
        profilePage.style.display = 'block';
    }
    
    if (navMenu) {
        navMenu.style.display = 'flex';
    }
    
    if (themeToggle) {
        themeToggle.style.display = 'flex';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format wallet address for display
function formatAddress(address) {
    if (!address) return '';
    if (address.length <= 20) return address;
    return address.slice(0, 8) + '...' + address.slice(-8);
}

// Copy wallet address to clipboard
async function copyWalletAddress(fullAddress) {
    try {
        await navigator.clipboard.writeText(fullAddress);
        return true;
    } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = fullAddress;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (e) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

// Theme Toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');

    function updateThemeIcon() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        if (themeIcon) {
            const moonIcon = themeIcon.querySelector('.theme-icon-moon');
            const sunIcon = themeIcon.querySelector('.theme-icon-sun');
            
            if (currentTheme === 'dark') {
                if (moonIcon) moonIcon.style.display = 'none';
                if (sunIcon) sunIcon.style.display = 'block';
            } else {
                if (moonIcon) moonIcon.style.display = 'block';
                if (sunIcon) sunIcon.style.display = 'none';
            }
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon();
    }

    updateThemeIcon();

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

// Navigation handlers
document.addEventListener('DOMContentLoaded', () => {
    const navBrand = document.getElementById('navBrand');
    if (navBrand) {
        navBrand.addEventListener('click', function() {
            const isConnected = localStorage.getItem('walletConnected') === 'true';
            
            if (isConnected) {
                // Always navigate to own profile when clicking logo
                if (typeof viewMyProfile === 'function') {
                    viewMyProfile();
                } else if (typeof navigateToProfile === 'function') {
                    navigateToProfile();
                }
            } else {
                navigateToHomepage();
            }
        });
    }
});

// Mobile Navigation
const navToggle = document.getElementById('navToggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

