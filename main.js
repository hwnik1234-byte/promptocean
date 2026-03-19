// DOM Elements
let trendingGrid, latestGrid, searchInput, headerSearchInput, headerSearchToggle, headerSearchContainer;
let playgroundInput, playgroundBtn, playgroundResult, heroSearchBtn, themeToggle;
let modalOverlay, loginModal, signupModal, uploadModal, loginBtn, signupBtn, sellPromptBtn, closeButtons, switchToSignup, switchToLogin;
let categoryFilters, filterButtons, favFilterBtn;

// --- SUPABASE & RAZORPAY CONFIGURATION ---
const SUPABASE_URL = 'https://kzcoqpmmytqkipntrerc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_y6M0kkVki3wQXBjIoOYR0w_GVCVuU7K';
const RAZORPAY_KEY_ID = 'rzp_test_YourKeyHere'; // Replace with actual Razorpay Key ID

let supabaseClient = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let userSubscription = { plan_name: 'Free', status: 'inactive' };
let userPurchases = []; // Array of prompt IDs purchased
// ------------------------------

// Data for Prompts
const trendingPrompts = [
    { id: 1, title: "YouTube Script Generator", preview: "Write a YouTube script about [topic]. Start with a strong hook and end with a call to action.", category: "Content Creation", saves: 1205, rating: 4.8 },
    { id: 2, title: "Code Debugging Pro", preview: "I have a bug in my [language] code. [Code snippet]. Explain the error and provide a fixed version.", category: "Coding", saves: 840, rating: 4.9 },
    { id: 3, title: "Full Blog Post Writer", preview: "Create a blog post outline on [topic] with SEO keywords, then write a 500-word introduction.", category: "Marketing", saves: 2100, rating: 4.7 },
    { id: 4, title: "SaaS Idea Validator", preview: "Validate this SaaS idea: [Idea]. Analyze target market, potential competitors, and monetization.", category: "Brainstorming", saves: 650, rating: 4.6 },
    { id: 5, title: "Logo Design Prompt", preview: "Modern logo for a [company type] using [color palette]. Minimalist style, vector graphics.", category: "Design", saves: 980, rating: 4.5 },
    { id: 6, title: "LinkedIn Post Optimizer", preview: "Rewrite this draft for LinkedIn. Make it engaging, add bullet points, and include relevant hashtags.", category: "Content Creation", saves: 1540, rating: 4.8 }
];

const latestPrompts = [
    { id: 7, title: "Email Marketing Sequence", preview: "Write a 3-part email sequence for a product launch in the [industry] niche.", category: "Marketing", saves: 120, rating: 4.4 },
    { id: 8, title: "Python Unit Test Bot", preview: "Generate comprehensive unit tests for the following Python function: [code].", category: "Coding", saves: 45, rating: 4.9, is_premium: true },
    { id: 9, title: "Interior Design Moodboard", preview: "Describe an interior design style for a [room type] with [style name] elements.", category: "Design", saves: 88, rating: 4.7, is_premium: true }
];

let allPrompts = [...trendingPrompts, ...latestPrompts];
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let collections = JSON.parse(localStorage.getItem('collections') || '["Favorites", "Work", "Personal"]');

// Render Collections Sidebar
function renderCollections() {
    const list = document.getElementById('collections-list');
    if (!list) return;
    list.innerHTML = '';
    collections.forEach(name => {
        const div = document.createElement('div');
        div.className = 'collection-item';
        div.innerHTML = `<i data-lucide="folder"></i> <span>${name}</span>`;
        list.appendChild(div);
    });
    if (window.lucide) lucide.createIcons();
}

// Function to create prompt card
function createPromptCard(prompt) {
    const isFav = favorites.includes(prompt.id);
    const hasPurchased = userPurchases.includes(prompt.id);
    const isAuthor = false; // We can check this later if user is logged in
    
    // Locked if: Premium AND (Not Pro AND Not Purchased AND Not Author)
    const isLocked = prompt.is_premium && 
                     userSubscription.plan_name !== 'Pro' && 
                     !hasPurchased;

    const card = document.createElement('div');
    card.className = `prompt-card ${prompt.is_premium ? 'premium' : ''}`;
    card.setAttribute('data-id', prompt.id);
    card.innerHTML = `
        <div class="prompt-card-header">
            <div class="tag-group">
                <span class="prompt-tag">${prompt.category}</span>
                ${prompt.is_premium ? '<span class="pro-badge">PRO</span>' : ''}
            </div>
            <div class="card-actions">
                <button class="icon-btn share-btn" data-title="${prompt.title}" data-text="Copy this prompt: ${prompt.preview}"><i data-lucide="share-2"></i></button>
                <button class="icon-btn heart-btn ${isFav ? 'active' : ''}" data-id="${prompt.id}"><i data-lucide="heart"></i></button>
            </div>
        </div>
        <h3>${prompt.title}</h3>
        <div class="prompt-preview">
            <p>${prompt.preview}</p>
            ${isLocked ? `
                <div class="premium-overlay">
                    <i data-lucide="lock"></i>
                    <span>Premium Prompt (₹${prompt.price || 99})</span>
                    <div class="overlay-btns">
                        <button class="btn btn-primary btn-sm" onclick="document.getElementById('pricing').scrollIntoView({behavior:'smooth'})">Get Pro</button>
                        <button class="btn btn-outline btn-sm buy-now-btn" data-id="${prompt.id}" data-price="${prompt.price || 99}">Buy This</button>
                    </div>
                </div>
            ` : ''}
        </div>
        <div class="prompt-card-footer">
            <div class="prompt-stats">
                <div class="rating-stars" data-id="${prompt.id}">
                    ${[1, 2, 3, 4, 5].map(i => `<i data-lucide="star" class="${i <= Math.floor(prompt.rating) ? 'filled' : (i - 0.5 <= prompt.rating ? 'half-filled' : '')}" data-star="${i}"></i>`).join('')}
                    <span>${prompt.rating || 'New'}</span>
                </div>
                <span><i data-lucide="save"></i> ${prompt.saves || 0}</span>
            </div>
            <button class="btn btn-outline btn-sm copy-btn" data-prompt="${prompt.preview}" ${isLocked ? 'disabled' : ''}>
                <i data-lucide="copy"></i> ${isLocked ? 'Locked' : 'Copy'}
            </button>
        </div>
    `;
    return card;
}

// Render Prompts
async function renderPrompts(filterData = null) {
    if (!trendingGrid || !latestGrid) return;

    // Show Skeletons first
    showSkeletons();

    // If no filterData provided and supabase active, try fetching
    let displayData = filterData;
    if (!displayData && supabaseClient) {
        const { data, error } = await supabaseClient.from('prompts').select('*');
        if (!error && data.length > 0) {
            displayData = data;
            allPrompts = data; // Update local cache
        }
    }

    if (!displayData) displayData = allPrompts;

    setTimeout(() => {
        // Sort logic
        const sortVal = document.getElementById('sort-select')?.value || 'trending';
        let sortedData = [...displayData];

        if (sortVal === 'recent') {
            sortedData.sort((a, b) => b.id - a.id);
        } else if (sortVal === 'saves') {
            sortedData.sort((a, b) => (b.saves || 0) - (a.saves || 0));
        } else if (sortVal === 'rating') {
            sortedData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortVal === 'trending') {
            // Trending: Combination of saves and rating
            sortedData.sort((a, b) => ((b.saves || 0) * (b.rating || 1)) - ((a.saves || 0) * (a.rating || 1)));
        }

        // Define what counts as "Trending" vs "Latest" for the grid sections
        // In a real DB, we might have a 'is_trending' flag or just use the top 6 by saves
        const trending = sortedData.slice(0, 6);
        const latest = sortedData.slice(6);

        trendingGrid.innerHTML = '';
        latestGrid.innerHTML = '';

        if (trending.length === 0 && latest.length === 0) {
            trendingGrid.innerHTML = '<div class="no-results">No prompts found matching your criteria.</div>';
        }

        trending.forEach(p => trendingGrid.appendChild(createPromptCard(p)));
        latest.forEach(p => latestGrid.appendChild(createPromptCard(p)));

        if (window.lucide) lucide.createIcons();

        // Re-attach listeners
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => copyToClipboard(btn.getAttribute('data-prompt'), btn));
        });

        document.querySelectorAll('.heart-btn').forEach(btn => {
            btn.addEventListener('click', () => toggleFavorite(parseInt(btn.getAttribute('data-id')), btn));
        });

        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const title = btn.getAttribute('data-title');
                const text = btn.getAttribute('data-text');
                sharePrompt(title, text);
            });
        });

        document.querySelectorAll('.rating-stars i').forEach(star => {
            star.addEventListener('click', (e) => {
                const container = e.target.closest('.rating-stars');
                const id = parseInt(container.getAttribute('data-id'));
                const rating = parseInt(star.getAttribute('data-star'));
                updateRating(id, rating, container);
            });
        });

        document.querySelectorAll('.buy-now-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const price = parseFloat(btn.getAttribute('data-price'));
                initiatePromptPurchase(id, price);
            });
        });
    }, 600); // Shimmer for 600ms
}

function sharePrompt(title, text) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: window.location.href
        }).catch(() => { });
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(`${title}: ${text}`).then(() => {
            alert('Share link copied to clipboard!');
        });
    }
}

function showSkeletons() {
    const skeletonHTML = `
        <div class="skeleton-card">
            <div class="skeleton-content">
                <div class="skeleton-line tag"></div>
                <div class="skeleton-line title"></div>
                <div class="skeleton-line preview"></div>
                <div class="skeleton-line footer"></div>
            </div>
        </div>
    `;

    trendingGrid.innerHTML = skeletonHTML.repeat(3);
    latestGrid.innerHTML = skeletonHTML.repeat(3);
}

function updateRating(id, rating, container) {
    const prompt = allPrompts.find(p => p.id === id);
    if (prompt) {
        prompt.rating = rating;
        renderPrompts();
    }
}

async function toggleFavorite(id, btn) {
    const isFav = favorites.includes(id);

    if (supabaseClient) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            if (isFav) {
                await supabaseClient.from('favorites').delete().eq('user_id', user.id).eq('prompt_id', id);
                favorites = favorites.filter(favId => favId !== id);
                btn.classList.remove('active');
            } else {
                await supabaseClient.from('favorites').insert([{ user_id: user.id, prompt_id: id }]);
                favorites.push(id);
                btn.classList.add('active');
            }
        } else {
            // Unauthenticated fallback
            handleLocalFavorite(id, btn);
        }
    } else {
        handleLocalFavorite(id, btn);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function handleLocalFavorite(id, btn) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(favId => favId !== id);
        btn.classList.remove('active');
    } else {
        favorites.push(id);
        btn.classList.add('active');
    }
}

async function fetchFavorites() {
    if (!supabaseClient) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data, error } = await supabaseClient.from('favorites').select('prompt_id').eq('user_id', user.id);
        if (!error && data) {
            favorites = data.map(f => f.prompt_id);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            renderPrompts(); // Refresh UI with new fav icons
        }
    }
}

async function fetchPurchases() {
    if (!supabaseClient) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data, error } = await supabaseClient.from('purchases').select('prompt_id').eq('user_id', user.id);
        if (!error && data) {
            userPurchases = data.map(p => p.prompt_id);
            renderPrompts();
        }
    }
}
async function fetchSubscription() {
    if (!supabaseClient) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data, error } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

        if (data) {
            userSubscription = data;
        } else {
            userSubscription = { plan_name: 'Free', status: 'inactive' };
        }
        renderPrompts();
    }
}

function initiateRazorpayPayment() {
    if (!supabaseClient) return alert('Please log in first.');
    const options = {
        key: RAZORPAY_KEY_ID,
        amount: 49900,
        currency: 'INR',
        name: 'PromptOcean Pro',
        description: 'Monthly Subscription to Pro Ocean Plan',
        handler: async function (response) {
            alert('Payment Successful! Transaction ID: ' + response.razorpay_payment_id);
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                await supabaseClient.from('subscriptions').upsert({
                    user_id: user.id,
                    plan_name: 'Pro',
                    status: 'active',
                    razorpay_subscription_id: 'sub_mock_' + Date.now(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });
                fetchSubscription();
            }
        },
        theme: { color: '#7c3aed' }
    };
    const rzp = new Razorpay(options);
    rzp.open();
}

async function handlePromptUpload(e) {
    e.preventDefault();
    if (!supabaseClient) return alert('Supabase not configured');
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return openModal('login');

    const title = document.getElementById('up-title').value;
    const category = document.getElementById('up-category').value;
    const description = document.getElementById('up-description').value;
    const promptText = document.getElementById('up-text').value;
    const price = document.getElementById('up-price').value;
    const isPremium = document.getElementById('up-premium').checked;

    const { error } = await supabaseClient.from('prompts').insert({
        title, category, description, prompt_text: promptText,
        user_id: user.id, is_premium: isPremium, price: parseFloat(price), is_public: true
    });

    if (error) alert('Error: ' + error.message);
    else { alert('Listed successfully! 🚀'); closeModal(); renderPrompts(); }
}

function initiatePromptPurchase(promptId, price) {
    if (!supabaseClient) return alert('Please log in first.');
    const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(price * 100),
        currency: 'INR',
        name: 'PromptOcean Marketplace',
        description: `Purchase prompt #${promptId}`,
        handler: async function (response) {
            alert('Purchase Successful!');
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                await supabaseClient.from('purchases').insert({
                    user_id: user.id, prompt_id: promptId, amount: price, status: 'completed'
                });
                renderPrompts();
            }
        },
        theme: { color: '#7c3aed' }
    };
    new Razorpay(options).open();
}

// Copy Logic
function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check"></i> Copied!';
        btn.style.color = '#10b981';

        // Celebration!
        if (window.confetti) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00F5FF', '#0066FF', '#00D1FF', '#0033FF']
            });
        }

        // Mock Sound
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3');
        audio.volume = 0.2;
        audio.play().catch(() => { });

        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.color = '';
            if (window.lucide) lucide.createIcons();
        }, 2000);
    });
}

// Sync and Filter Logic
function syncSearch(query) {
    if (searchInput) searchInput.value = query;
    if (headerSearchInput) headerSearchInput.value = query;

    const filtered = allPrompts.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
    );
    renderPrompts(filtered);
}

// Modal Logic
function openModal(type) {
    if (!modalOverlay) return;

    // Auto-close mobile menu if open
    const navLinks = document.querySelector('.nav-links');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (navLinks?.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileMenuBtn?.classList.remove('active');
        document.body.style.overflow = 'auto'; // Reset scroll
    }

    modalOverlay.classList.add('active');
    loginModal?.classList.remove('active');
    signupModal?.classList.remove('active');
    uploadModal?.classList.remove('active');
    document.getElementById('submit-prompt-modal')?.classList.remove('active');

    if (type === 'login') {
        loginModal?.classList.add('active');
    } else if (type === 'signup') {
        signupModal?.classList.add('active');
    } else if (type === 'upload') {
        uploadModal?.classList.add('active');
    } else if (type === 'submit') {
        document.getElementById('submit-prompt-modal')?.classList.add('active');
    }
}

function closeModal() {
    modalOverlay?.classList.remove('active');
    loginModal?.classList.remove('active');
    signupModal?.classList.remove('active');
    uploadModal?.classList.remove('active');
    document.getElementById('submit-prompt-modal')?.classList.remove('active');
}

// --- NEW SUPABASE AUTH LOGIC ---
async function handleSignUp(email, password, fullName) {
    if (!supabaseClient) return alert('Supabase not initialized. Please add your API keys.');
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { 
                full_name: fullName,
                user_name: fullName.toLowerCase().replace(/\s+/g, '_') + Math.floor(Math.random() * 1000)
            }
        }
    });

    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('Verification email sent! Please check your inbox.');
        closeModal();
    }
}

async function signInWithGoogle() {
    if (!supabaseClient) return alert('Supabase not initialized.');
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        alert('Error logging in with Google: ' + error.message);
    }
}

async function handleLogin(email, password) {
    if (!supabaseClient) return alert('Supabase not initialized. Please add your API keys.');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert('Error: ' + error.message);
    } else {
        updateAuthUI(data.user);
        closeModal();
    }
}

async function handleForgotPassword() {
    const email = prompt("Please enter your email address to reset your password:");
    if (!email) return;
    
    if (!supabaseClient) return alert('Supabase not initialized.');
    
    // Supabase will send a reset link to this email
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    });
    
    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Password reset link sent! Please check your email inbox.");
    }
}

async function handleLogout() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    favorites = [];
    localStorage.removeItem('favorites');
    updateAuthUI(null);
    renderPrompts(allPrompts); // Reset to default view
}

function updateAuthUI(user) {
    const loginHeaderBtn = document.getElementById('login-btn');
    const signupHeaderBtn = document.getElementById('signup-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileSignupBtn = document.getElementById('mobile-signup-btn');

    if (user) {
        const displayName = user.user_metadata?.full_name || 'Profile';
        
        // Update Header
        if (loginHeaderBtn) loginHeaderBtn.textContent = displayName;
        if (signupHeaderBtn) {
            signupHeaderBtn.textContent = 'Logout';
            signupHeaderBtn.onclick = handleLogout;
        }

        // Update Mobile Menu
        if (mobileLoginBtn) {
            mobileLoginBtn.textContent = displayName;
            mobileLoginBtn.onclick = null; // Maybe link to profile later
        }
        if (mobileSignupBtn) {
            mobileSignupBtn.textContent = 'Logout';
            mobileSignupBtn.onclick = handleLogout;
        }
    } else {
        // Reset Header
        if (loginHeaderBtn) loginHeaderBtn.textContent = 'Login';
        if (signupHeaderBtn) {
            signupHeaderBtn.textContent = 'Sign Up';
            signupHeaderBtn.onclick = () => openModal('signup');
        }

        // Reset Mobile Menu
        if (mobileLoginBtn) {
            mobileLoginBtn.textContent = 'Login';
            mobileLoginBtn.onclick = () => openModal('login');
        }
        if (mobileSignupBtn) {
            mobileSignupBtn.textContent = 'Sign Up';
            mobileSignupBtn.onclick = () => openModal('signup');
        }
    }
}

// Check session on load
async function checkUserSession() {
    if (!supabaseClient) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    updateAuthUI(user);
    if (user) {
        fetchFavorites();
        fetchSubscription();
        fetchPurchases();
    }
}
// -----------------------------

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Elements
    trendingGrid = document.getElementById('trending-grid');
    latestGrid = document.getElementById('latest-grid');
    searchInput = document.getElementById('main-search');
    headerSearchInput = document.getElementById('header-search-input');
    headerSearchToggle = document.getElementById('header-search-toggle');
    headerSearchContainer = document.getElementById('header-search-container');
    heroSearchBtn = document.getElementById('hero-search-btn');

    playgroundInput = document.getElementById('playground-input-field');
    playgroundBtn = document.getElementById('playground-generate');
    playgroundResult = document.getElementById('playground-result');

    modalOverlay = document.getElementById('modal-overlay');
    loginModal = document.getElementById('login-modal');
    signupModal = document.getElementById('signup-modal');
    uploadModal = document.getElementById('upload-modal');
    loginBtn = document.getElementById('login-btn');
    signupBtn = document.getElementById('signup-btn');
    sellPromptBtn = document.getElementById('sell-prompt-btn');
    closeButtons = document.querySelectorAll('.modal-close');
    switchToSignup = document.getElementById('switch-to-signup');
    switchToLogin = document.getElementById('switch-to-login');
    themeToggle = document.getElementById('theme-toggle');
    categoryFilters = document.getElementById('category-filters');
    filterButtons = document.querySelectorAll('.filter-btn');
    favFilterBtn = document.getElementById('fav-filter-btn');

    // Theme Initialization
    const savedTheme = localStorage.getItem('theme') || 'dark-theme';
    document.body.className = savedTheme;

    themeToggle?.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        const newTheme = isDark ? 'light-theme' : 'dark-theme';
        document.body.className = newTheme;
        localStorage.setItem('theme', newTheme);
    });

    // AOS Initialization
    const aosObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-aos]').forEach(el => aosObserver.observe(el));

    // Category Filter Logic
    filterButtons.forEach(btn => {
        if (btn.id === 'fav-filter-btn') return;
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (category === 'all') {
                renderPrompts(allPrompts);
            } else {
                const filtered = allPrompts.filter(p => p.category.toLowerCase() === category.toLowerCase());
                renderPrompts(filtered);
            }
        });
    });

    // Favorites Filter
    favFilterBtn?.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        favFilterBtn.classList.add('active');
        const favPrompts = allPrompts.filter(p => favorites.includes(p.id));
        renderPrompts(favPrompts);
        
        // Scroll to trending section to show results
        document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Search Suggestions Logic
    function handleAutocomplete(input, suggestionBox) {
        if (!input || !suggestionBox) return;
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            if (val.length < 2) {
                suggestionBox.classList.remove('active');
                return;
            }
            const matches = allPrompts.filter(p => p.title.toLowerCase().includes(val)).slice(0, 5);
            if (matches.length > 0) {
                suggestionBox.innerHTML = matches.map(m => `
                    <div class="suggestion-item" data-title="${m.title}">
                        <h4>${m.title}</h4>
                        <span>${m.category}</span>
                    </div>
                `).join('');
                suggestionBox.classList.add('active');

                suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const title = item.getAttribute('data-title');
                        input.value = title;
                        syncSearch(title);
                        suggestionBox.classList.remove('active');
                    });
                });
            } else {
                suggestionBox.classList.remove('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestionBox.contains(e.target)) {
                suggestionBox.classList.remove('active');
            }
        });
    }

    handleAutocomplete(searchInput, document.getElementById('main-search-suggestions'));
    handleAutocomplete(headerSearchInput, document.getElementById('header-search-suggestions'));

    // Submit Prompt Modal
    const openSubmitBtn = document.getElementById('open-submit-modal');
    const newPromptForm = document.getElementById('new-prompt-form');

    openSubmitBtn?.addEventListener('click', () => openModal('submit'));

    newPromptForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('new-prompt-title').value;
        const category = document.getElementById('new-prompt-category').value;
        const preview = document.getElementById('new-prompt-text').value;

        const newPrompt = {
            title,
            category,
            preview,
            saves: 0,
            rating: 5.0
        };

        if (supabaseClient) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            const { data, error } = await supabaseClient.from('prompts').insert([
                { ...newPrompt, user_id: user?.id }
            ]).select();

            if (error) {
                alert('Error submitting prompt: ' + error.message);
                return;
            }
            allPrompts.unshift(data[0]);
        } else {
            newPrompt.id = Date.now();
            allPrompts.unshift(newPrompt);
        }

        renderPrompts(allPrompts);
        closeModal();
        newPromptForm.reset();
        alert('Prompt submitted and added to the list!');
    });

    // Playground Logic
    const playgroundPromptDisplay = document.querySelector('.playground-prompt-text');
    const varInputContainer = document.createElement('div');
    varInputContainer.className = 'variable-inputs';
    playgroundPromptDisplay?.after(varInputContainer);

    function updatePlaygroundVariables() {
        if (!playgroundInput || !playgroundPromptDisplay) return;
        const text = playgroundInput.value || playgroundPromptDisplay.textContent;
        const regex = /\[(.*?)\]/g;
        const matches = [...text.matchAll(regex)];
        const vars = [...new Set(matches.map(m => m[1]))];

        if (vars.length > 0) {
            varInputContainer.innerHTML = vars.map(v => `
                <div class="variable-field">
                    <label>${v}</label>
                    <input type="text" placeholder="Enter ${v}..." class="var-input" data-var="${v}">
                </div>
            `).join('');
            varInputContainer.classList.add('active');
        } else {
            varInputContainer.classList.remove('active');
            varInputContainer.innerHTML = '';
        }
    }

    playgroundInput?.addEventListener('input', updatePlaygroundVariables);

    function renderPlaygroundHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        const history = JSON.parse(localStorage.getItem('playgroundHistory') || '[]');
        if (history.length === 0) {
            historyList.innerHTML = '<p class="placeholder-text">No history yet.</p>';
            return;
        }

        historyList.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-item-info">
                    <strong>${item.topic.substring(0, 30)}${item.topic.length > 30 ? '...' : ''}</strong>
                    <span>${item.tone} • ${item.format}</span>
                </div>
                <button class="icon-btn small-btn copy-btn" data-prompt="${item.topic}"><i data-lucide="copy"></i></button>
            </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
    }

    playgroundBtn?.addEventListener('click', () => {
        let topic = playgroundInput.value.trim() || (playgroundPromptDisplay ? playgroundPromptDisplay.textContent : '');
        if (!topic) return alert('Please enter a topic!');

        const toneSelect = document.getElementById('playground-tone');
        const formatSelect = document.getElementById('playground-format');
        const tone = toneSelect ? toneSelect.value : 'Default';
        const format = formatSelect ? formatSelect.value : 'Default';

        const varInputs = varInputContainer.querySelectorAll('.var-input');
        varInputs.forEach(input => {
            const varName = input.getAttribute('data-var');
            const varValue = input.value.trim();
            if (varValue) {
                topic = topic.replace(new RegExp(`\\[${varName}\\]`, 'g'), varValue);
            }
        });

        playgroundBtn.innerHTML = '<i class="loader"></i> Generating...';
        playgroundBtn.disabled = true;

        setTimeout(() => {
            const resultHtml = `
                <div class="result-card">
                    <div class="result-header">
                        <h4><i data-lucide="sparkles"></i> Optimized Prompt</h4>
                        <span class="badge badge-outline">${tone}</span>
                    </div>
                    <div class="result-text">
                        "${topic}. Please write this in a ${tone.toLowerCase()} tone and present the information as a ${format.toLowerCase()}."
                    </div>
                    <div class="result-footer">
                        <button class="btn btn-primary btn-sm copy-btn" data-prompt="${topic}">
                            <i data-lucide="copy"></i> Copy Optimized Prompt
                        </button>
                    </div>
                </div>
            `;
            playgroundResult.innerHTML = resultHtml;
            playgroundBtn.innerHTML = '⚡ Generate Result';
            playgroundBtn.disabled = false;

            // Save to history
            const history = JSON.parse(localStorage.getItem('playgroundHistory') || '[]');
            history.unshift({ topic, tone, format, date: new Date().toISOString() });
            localStorage.setItem('playgroundHistory', JSON.stringify(history.slice(0, 5))); // Keep last 5
            renderPlaygroundHistory();

            if (window.confetti) {
                confetti({
                    particleCount: 40,
                    spread: 70,
                    origin: { y: 0.8 }
                });
            }
            if (window.lucide) lucide.createIcons();
        }, 1200);
    });

    // Initial Render Actions
    renderCollections();
    renderPlaygroundHistory();
    const collectionsSidebar = document.getElementById('collections-sidebar');
    const openCollectionsBtn = document.createElement('button');
    openCollectionsBtn.className = 'icon-btn';
    openCollectionsBtn.innerHTML = '<i data-lucide="folder"></i>';
    document.querySelector('.nav-actions')?.prepend(openCollectionsBtn);
    if (window.lucide) lucide.createIcons();

    openCollectionsBtn.addEventListener('click', () => collectionsSidebar?.classList.add('active'));
    document.getElementById('close-collections')?.addEventListener('click', () => collectionsSidebar?.classList.remove('active'));

    document.getElementById('add-collection-btn')?.addEventListener('click', () => {
        const name = prompt('Enter Collection Name:');
        if (name && !collections.includes(name)) {
            collections.push(name);
            localStorage.setItem('collections', JSON.stringify(collections));
            renderCollections();
        }
    });

    // Initial Render
    renderPrompts();
    updatePlaygroundVariables();

    // Standard Events
    searchInput?.addEventListener('input', (e) => syncSearch(e.target.value));
    headerSearchInput?.addEventListener('input', (e) => syncSearch(e.target.value));

    heroSearchBtn?.addEventListener('click', () => {
        if (searchInput) {
            syncSearch(searchInput.value);
            document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' });
        }
    });

    headerSearchToggle?.addEventListener('click', () => {
        headerSearchContainer?.classList.toggle('active');
        if (headerSearchContainer?.classList.contains('active')) headerSearchInput?.focus();
    });

    document.getElementById('sort-select')?.addEventListener('change', () => {
        // Find the currently active category button
        const activeBtn = document.querySelector('.filter-btn.active');
        const category = activeBtn ? activeBtn.getAttribute('data-category') : 'all';

        if (category === 'all') {
            renderPrompts(allPrompts);
        } else if (category === 'favorite') {
            const favs = allPrompts.filter(p => favorites.includes(p.id));
            renderPrompts(favs);
        } else {
            const filtered = allPrompts.filter(p => p.category === category);
            renderPrompts(filtered);
        }
    });

    // Horizontal Scroll with Mouse Wheel for Filter Bar
    const filterBar = document.querySelector('.filter-bar');
    if (filterBar) {
        filterBar.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                filterBar.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    // Export JSON logic
    document.getElementById('export-json-btn')?.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allPrompts, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "prompthive-export.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        alert('Prompt library exported as JSON!');
    });

    // Login Form Submit
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        handleLogin(email, password);
    });

    // Signup Form Submit
    document.getElementById('signup-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullNameInput = e.target.querySelector('input[placeholder="John Doe"]');
        const fullName = fullNameInput ? fullNameInput.value : '';
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        handleSignUp(email, password, fullName);
    });

    // Social Login buttons
    document.getElementById('google-login-btn')?.addEventListener('click', signInWithGoogle);
    document.getElementById('google-signup-btn')?.addEventListener('click', signInWithGoogle);

    // Subscription buttons
    document.getElementById('buy-pro-btn')?.addEventListener('click', initiateRazorpayPayment);

    // Modal Triggers
    loginBtn?.addEventListener('click', () => openModal('login'));
    signupBtn?.addEventListener('click', () => openModal('signup'));
    sellPromptBtn?.addEventListener('click', () => {
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) openModal('upload');
            else openModal('login');
        });
    });

    // Form Submits
    document.getElementById('upload-form')?.addEventListener('submit', handlePromptUpload);

    // Mobile specific triggers
    document.getElementById('mobile-login-btn')?.addEventListener('click', () => openModal('login'));
    document.getElementById('mobile-signup-btn')?.addEventListener('click', () => openModal('signup'));

    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
    modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    switchToSignup?.addEventListener('click', (e) => { e.preventDefault(); openModal('signup'); });
    switchToLogin?.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });

    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPassword();
    });

    // Initial session check
    checkUserSession();
});
