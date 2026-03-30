// DOM Elements
let trendingGrid, latestGrid, searchInput, headerSearchInput, filterSearchInput, headerSearchToggle, headerSearchContainer;
let playgroundInput, playgroundBtn, playgroundResult, heroSearchBtn, themeToggle;
let modalOverlay, loginModal, signupModal, uploadModal, loginBtn, signupBtn, sellPromptBtn, closeButtons, switchToSignup, switchToLogin;
let categoryFilters, filterButtons, favFilterBtn;
let currentPage = 1;
const itemsPerPage = 6;
let isLoadingMore = false;
let hasMorePrompts = true;

// --- SUPABASE & RAZORPAY CONFIGURATION ---
const SUPABASE_URL = 'https://kzcoqpmmytqkipntrerc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_y6M0kkVki3wQXBjIoOYR0w_GVCVuU7K';
const RAZORPAY_KEY_ID = 'rzp_test_YourKeyHere'; // Replace with actual Razorpay Key ID

let supabaseClient = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (!window.supabase) {
    console.warn('Supabase library not detected. Some features may be limited.');
}
window.supabaseClient = supabaseClient; // Make it global for other pages to access

let userSubscription = { plan_name: 'Free', status: 'inactive' };
let userPurchases = []; // Array of prompt IDs purchased

// Connection Test
if (supabaseClient) {
    supabaseClient.from('categories').select('count', { count: 'exact', head: true })
        .then(({ count, error }) => {
            if (error) {
                console.error('%c[Supabase Connection Test] FAILED:', 'color: #ff4444; font-weight: bold;', error.message);
                console.warn('%c[Advice] Your local API Key is likely WRONG.', 'color: #ffa500; font-weight: bold;');
                console.warn('The live site works, so you should copy the "anon" key from your live site or Supabase dashboard.');
            } else {
                console.log('%c[Supabase Connection Test] SUCCESS:', 'color: #00ff88; font-weight: bold;', 'Connected to Project.');
            }
        });
}
// ------------------------------

// Global helper to fetch prompts with their metadata
window.getPromptsWithMeta = async (options = {}) => {
    if (!supabaseClient) return null;
    const { userId, promptId, status, limit, orderBy = 'created_at', ascending = false } = options;
    
    try {
        // We try to get everything in one go. If RLS or columns are missing, we'll catch the error.
        let query = supabaseClient.from('prompts').select(`
            *, 
            categories!category_id(id, name), 
            profiles!created_by(id, full_name, username, avatar_url)
        `);
        
        if (promptId) query = query.eq('id', promptId);
        if (userId) query = query.eq('created_by', userId);
        if (status) query = query.in('status', Array.isArray(status) ? status : [status]);
        if (limit) query = query.limit(limit);
        query = query.order(orderBy, { ascending });
        
        const { data, error } = await (promptId ? query.maybeSingle() : query);
        
        const normalize = (p) => {
            if (!p) return null;
            const catObj = Array.isArray(p.categories) ? p.categories[0] : p.categories;
            const profObj = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
            
            if (!profObj && p.created_by) {
                console.warn(`[Supabase] No profile found for user ID: ${p.created_by}. Check if a row exists in the 'profiles' table for this ID.`);
            }

            const rawName = profObj?.full_name || profObj?.username || profObj?.display_name || 'Community';
            // If name is an email, strip the @ part for a cleaner look
            const friendlyName = (rawName.includes('@')) ? rawName.split('@')[0] : rawName;

            return {
                ...p,
                category: catObj?.name || p.category || 'Uncategorized',
                profiles: profObj || { full_name: 'Community' },
                creator_name: friendlyName
            };
        };

        if (!error && data) {
            return promptId ? normalize(data) : data.map(normalize);
        } else if (error) {
            console.warn("[Supabase] Join failed (Permissions or Schema), using simple fallback...", error.message);
        }

        // Fallback: This always works if prompts table is accessible
        let fQuery = supabaseClient.from('prompts').select('*');
        if (promptId) fQuery = fQuery.eq('id', promptId);
        if (userId) fQuery = fQuery.eq('created_by', userId); 
        if (status) fQuery = fQuery.in('status', Array.isArray(status) ? status : [status]);
        fQuery = fQuery.order(orderBy, { ascending }); 
        if (limit) fQuery = fQuery.limit(limit);
        
        const { data: fallbackData } = await (promptId ? fQuery.maybeSingle() : fQuery);
        if (!fallbackData) return promptId ? null : [];

        return promptId ? normalize(fallbackData) : fallbackData.map(normalize);
    } catch (e) {
        console.error("Critical Fetch Error:", e);
        return promptId ? null : [];
    }
};

// Data for Prompts
// Data for Prompts (Fallback/Demo Data)
const trendingPrompts = [
    {
        id: "static-1",
        title: "YouTube Script Generator",
        description: "Generate a viral video script with a high-retention hook.",
        content: "Write a professional YouTube script about [topic]. Include a strong hook, three main points, and a [CTA] call-to-action.",
        category: "Content Creation",
        saves_count: 1205,
        rating: 4.8,
        is_free: true,
        created_by: "system-1"
    },
    {
        id: "static-2",
        title: "Master Code Debugger",
        description: "Find and fix bugs in your code with detailed explanations.",
        content: "I have a bug in my [language] code snippet: [code]. Please explain the error and provide a optimized solution.",
        category: "Coding",
        saves_count: 840,
        rating: 4.9,
        is_free: true,
        created_by: "system-1"
    },
    {
        id: "static-3",
        title: "SEO Blog Post Writer",
        description: "Write long-form articles optimized for search engines.",
        content: "Create a 1000-word blog post on [topic] targeting the keyword '[keyword]'. Use a [tone] tone.",
        category: "Marketing",
        saves_count: 2100,
        rating: 4.7,
        is_free: true,
        created_by: "system-2"
    },
    {
        id: "static-4",
        title: "SaaS Idea Validator",
        description: "Validate your startup ideas before building them.",
        content: "Act as a venture capitalist. Validate this SaaS idea: [Idea]. Analyze market fit, potential competitors, and [monetization] strategies.",
        category: "Brainstorming",
        saves_count: 650,
        rating: 4.6,
        is_free: false,
        price: 499,
        created_by: "system-2"
    },
    {
        id: "static-5",
        title: "Modern Logo Designer",
        description: "Generate high-quality DALL-E/Midjourney logo prompts.",
        content: "A professional, minimalist logo for a [industry] company. Style: [style], Palette: [colors]. High detail, vector style.",
        category: "Design",
        saves_count: 980,
        rating: 4.5,
        is_free: false,
        price: 299,
        created_by: "system-3"
    },
    {
        id: "static-6",
        title: "LinkedIn Post Hook",
        description: "Turn your thoughts into engaging LinkedIn content.",
        content: "Write a high-engagement LinkedIn post based on this insight: [Knowledge]. Format: [Format]. Target audience: [Persona].",
        category: "Content Creation",
        saves_count: 1540,
        rating: 4.8,
        is_free: true,
        created_by: "system-1"
    }
];

const latestPrompts = [
    {
        id: "static-7",
        title: "Email Outreach Master",
        description: "High-conversion cold email templates for any industry.",
        content: "Write a cold email sequence for a product launch in the [industry] niche. Include [number] follow-ups.",
        category: "Marketing",
        saves_count: 120,
        rating: 4.4,
        is_free: true,
        created_by: "system-3"
    },
    {
        id: "static-8",
        title: "React Unit Test Bot",
        description: "Generate comprehensive Jest/Vitest tests for React components.",
        content: "Generate unit tests for the following React component using [library]: [code]. Consider edge cases for [feature].",
        category: "Coding",
        saves_count: 45,
        rating: 4.9,
        is_free: false,
        price: 599,
        created_by: "system-1"
    },
    {
        id: "static-9",
        title: "Interior Moodboard",
        description: "Describe detailed interior design concepts.",
        content: "Create a professional moodboard description for a [room] in [style] style. Highlight [material] and [color] as key elements.",
        category: "Design",
        saves_count: 88,
        rating: 4.7,
        is_free: false,
        price: 199,
        created_by: "system-3"
    }
];

let allPrompts = [...trendingPrompts, ...latestPrompts];
window.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let collections = JSON.parse(localStorage.getItem('collections') || '["Favorites", "Work", "Personal"]');
let aiSettings = JSON.parse(localStorage.getItem('aiSettings') || '{"openai": "", "gemini": ""}');

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
    const isFav = window.favorites.includes(prompt.id);
    const hasPurchased = (userPurchases || []).includes(prompt.id);

    // Locked if: NOT Free AND (Not Purchased AND Not Pro)
    const isPro = userSubscription && userSubscription.plan_name === 'Pro' && userSubscription.status === 'active';
    const isLocked = !prompt.is_free && !hasPurchased && !isPro;

    const card = document.createElement('div');
    card.className = `prompt-card ${!prompt.is_free ? 'premium' : ''}`;
    card.setAttribute('data-id', prompt.id);

    card.innerHTML = `
        <div class="prompt-card-header">
            <div class="tag-group" style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="prompt-tag">${prompt.categories ? prompt.categories.name : prompt.category || 'Uncategorized'}</span>
                    ${!prompt.is_free ? '<span class="pro-badge">PAID</span>' : ''}
                </div>
                <a href="creator-profile.html?id=${prompt.created_by}" class="creator-link-sm">
                    <img src="${prompt.profiles?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${prompt.created_by}`}" class="creator-avatar-sm" alt="Creator">
                    <span>by ${prompt.creator_name || 'Community'}</span>
                </a>
            </div>
            <div class="card-actions">
                <button class="icon-btn share-btn" data-title="${prompt.title}" data-text="Copy this prompt: ${prompt.description}"><i data-lucide="share-2"></i></button>
                <button class="icon-btn heart-btn ${isFav ? 'active' : ''}" data-id="${prompt.id}"><i data-lucide="heart"></i></button>
            </div>
        </div>
        <h3>${prompt.title}</h3>
        <div class="prompt-preview">
            <p>${prompt.description || 'No description provided.'}</p>
            ${isLocked ? `
                <div class="premium-overlay">
                    <i data-lucide="lock"></i>
                    <span>Premium Prompt (₹${prompt.price || 0})</span>
                    <div class="overlay-btns">
                        <button class="btn btn-outline btn-sm unlock-demo-btn" data-id="${prompt.id}">Unlock (Demo)</button>
                    </div>
                </div>
            ` : ''}
        </div>
        <div class="prompt-card-footer" style="flex-direction: column; align-items: stretch; gap: 1rem;">
            <div class="prompt-stats" style="width: 100%; display: flex; justify-content: space-between;">
                <div class="rating-stars" data-id="${prompt.id}">
                    ${[1, 2, 3, 4, 5].map(i => `<i data-lucide="star" class="${i <= Math.floor(prompt.rating || 5) ? 'filled' : ''}" data-star="${i}"></i>`).join('')}
                    <span>${prompt.rating || 'New'}</span>
                </div>
                <span><i data-lucide="save"></i> ${prompt.saves_count || 0}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; width: 100%;">
                <button class="btn btn-outline btn-sm copy-btn" data-prompt="${prompt.content}" ${isLocked ? 'disabled' : ''} style="display: flex; justify-content: center; align-items: center; gap: 0.5rem;">
                    <i data-lucide="copy"></i> ${isLocked ? 'Locked' : 'Copy'}
                </button>
                <a href="prompt-detail.html?id=${prompt.id}" class="btn btn-primary btn-sm" style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; text-decoration: none;">
                    <i data-lucide="eye"></i> View
                </a>
            </div>
        </div>
    `;
    return card;
}

let renderTimeout = null;

// Render Prompts
async function renderPrompts(filterData = null, isAppending = false) {
    if (!trendingGrid || !latestGrid) return;

    if (renderTimeout) clearTimeout(renderTimeout);

    const isMarketplace = document.getElementById('marketplace-grid') !== null;
    
    // If not appending, show skeletons or clear grid
    if (!isAppending) {
        showSkeletons();
        currentPage = 1; // Reset page on new filter/search
        hasMorePrompts = true;
    } else {
        // Show loading indicator
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.style.display = 'block';
    }

    let displayData = filterData;
    if (!displayData && supabaseClient) {
        displayData = await window.getPromptsWithMeta({ status: ['approved', 'APPROVED', 'Approved'] });
        
        // Re-merge with static for marketplace
        const dbIds = (displayData || []).map(p => p.id);
        const staticPrompts = [...trendingPrompts, ...latestPrompts].map(p => ({
            ...p,
            category: p.category || 'Uncategorized'
        }));
        const uniqueStatic = staticPrompts.filter(p => !dbIds.includes(p.id));
        displayData = [...(displayData || []), ...uniqueStatic];
        allPrompts = displayData;
    }

    if (!displayData) displayData = allPrompts;

    renderTimeout = setTimeout(() => {
        try {
            const sortSelect = document.getElementById('sort-select');
            const sortVal = sortSelect ? sortSelect.value : (isMarketplace ? 'recent' : 'trending');
            
            console.log(`[Render] Sorting ${displayData.length} prompts by: ${sortVal}`);
            let sortedData = [...displayData];

            if (sortVal === 'recent') {
                sortedData.sort((a, b) => {
                    const valA = a.created_at ? new Date(a.created_at).getTime() : (parseInt(a.id) || 0);
                    const valB = b.created_at ? new Date(b.created_at).getTime() : (parseInt(b.id) || 0);
                    return valB - valA;
                });
            } else if (sortVal === 'saves') {
                sortedData.sort((a, b) => (b.saves_count || 0) - (a.saves_count || 0));
            } else if (sortVal === 'rating') {
                sortedData.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
            } else if (sortVal === 'trending') {
                sortedData.sort((a, b) => ((b.saves_count || 0) * (parseFloat(b.rating) || 1)) - ((a.saves_count || 0) * (parseFloat(a.rating) || 1)));
            }

            let finalDisplayData = sortedData;
            if (isMarketplace) {
                const totalItems = sortedData.length;
                const start = (currentPage - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                finalDisplayData = sortedData.slice(start, end);
                hasMorePrompts = end < totalItems;
                
                const loader = document.getElementById('loading-indicator');
                if (loader) {
                    loader.classList.add('fade-out');
                    setTimeout(() => {
                        loader.style.display = 'none';
                        loader.classList.remove('fade-out');
                    }, 400);
                }
                isLoadingMore = false;
            }

            let trending, latest;
            if (isMarketplace) {
                trending = finalDisplayData;
                latest = [];
            } else {
                trending = sortedData.slice(0, 6);
                latest = sortedData.slice(6);
            }

            const latestSection = document.querySelector('.latest.container');
            if (latestSection) latestSection.style.display = latest.length > 0 ? 'block' : 'none';

            if (trendingGrid && !isAppending) trendingGrid.innerHTML = '';
            if (latestGrid && latestGrid !== trendingGrid && !isAppending) latestGrid.innerHTML = '';

            if (!isAppending && displayData.length === 0) {
                const target = trendingGrid || latestGrid;
                if (target) target.innerHTML = '<div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No prompts found matching your criteria.</div>';
                return;
            }

            if (trendingGrid) {
                trending.forEach((p, i) => {
                    const card = createPromptCard(p);
                    card.classList.add('animate-entrance');
                    card.style.animationDelay = `${i * 0.08}s`;
                    trendingGrid.appendChild(card);
                    setTimeout(() => card.classList.remove('animate-entrance'), 1000 + (i * 80));
                });
            }
            if (latestGrid && latestGrid !== trendingGrid) {
                latest.forEach((p, i) => {
                    const card = createPromptCard(p);
                    card.classList.add('animate-entrance');
                    card.style.animationDelay = `${(trending.length + i) * 0.08}s`;
                    latestGrid.appendChild(card);
                    setTimeout(() => card.classList.remove('animate-entrance'), 1000 + ((trending.length + i) * 80));
                });
            }

            if (window.lucide) lucide.createIcons();

            // (Listeners managed by event delegation)
        } catch (err) {
            console.error('Render error:', err);
        }
    }, 300);
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
            <div class="skeleton-line tag"></div>
            <div class="skeleton-line title"></div>
            <div class="skeleton-line preview"></div>
            <div class="skeleton-line footer"></div>
        </div>
    `;

    // Fill grid with 6 skeletons for a better initial layout look
    if (trendingGrid) trendingGrid.innerHTML = skeletonHTML.repeat(6);
    if (latestGrid && latestGrid !== trendingGrid) latestGrid.innerHTML = skeletonHTML.repeat(6);
}

function updateRating(id, rating, container) {
    const prompt = allPrompts.find(p => p.id === id);
    if (prompt) {
        prompt.rating = rating;
        renderPrompts();
    }
}

window.toggleFavorite = async function (id, btn) {
    let favorites = window.favorites;
    const isFav = favorites.includes(id);

    const client = window.supabaseClient;
    if (client) {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
            if (isFav) {
                await client.from('favorites').delete().eq('user_id', user.id).eq('prompt_id', id);
                window.favorites = favorites.filter(favId => favId !== id);
                btn?.classList.remove('active');
            } else {
                await client.from('favorites').insert([{ user_id: user.id, prompt_id: id }]);
                window.favorites.push(id);
                btn?.classList.add('active');
            }

            // Update local storage
            localStorage.setItem('favorites', JSON.stringify(window.favorites));

            // Dynamically update UI count on main page if elements exist
            const card = document.querySelector(`.prompt-card[data-id="${id}"]`);
            if (card) {
                const countSpan = card.querySelector('.prompt-stats > span:last-child');
                if (countSpan) {
                    let currentCount = parseInt(countSpan.textContent.replace(/[^0-9]/g, '')) || 0;
                    currentCount = isFav ? Math.max(0, currentCount - 1) : currentCount + 1;
                    countSpan.innerHTML = `<i data-lucide="save"></i> ${currentCount}`;
                    if (window.lucide) lucide.createIcons();
                }
            }
        } else {
            handleLocalFavorite(id, btn);
        }
    } else {
        handleLocalFavorite(id, btn);
    }
}

async function toggleFavorite(id, btn) {
    return window.toggleFavorite(id, btn);
}

window.handleLocalFavorite = function (id, btn) {
    if (window.favorites.includes(id)) {
        window.favorites = window.favorites.filter(favId => favId !== id);
        btn?.classList.remove('active');
    } else {
        window.favorites.push(id);
        btn?.classList.add('active');
    }
    localStorage.setItem('favorites', JSON.stringify(window.favorites));
}

function handleLocalFavorite(id, btn) {
    return window.handleLocalFavorite(id, btn);
}

async function fetchFavorites() {
    if (!supabaseClient) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data, error } = await supabaseClient.from('favorites').select('prompt_id').eq('user_id', user.id);
        if (!error && data) {
            window.favorites = data.map(f => f.prompt_id);
            localStorage.setItem('favorites', JSON.stringify(window.favorites));
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

// --- TEST / DEBUG UTILITIES ---

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
        title,
        category,
        description,
        content: promptText, // 'content' is the new column
        created_by: user.id, // 'created_by' is the new column
        is_free: !isPremium, // 'is_free' is the logic
        price: parseFloat(price),
        is_public: true,
        status: 'pending' // Initial status is pending admin approval
    });

    if (error) alert('Error: ' + error.message);
    else { alert('Prompt saved successfully! It is now pending approval by an admin.'); closeModal(); renderPrompts(); }
}

async function handleDemoUnlock(promptId) {
    if (!supabaseClient) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return openModal('login');

    try {
        // Dummy Purchase Insert
        const { error } = await supabaseClient.from('purchases').insert({
            user_id: user.id,
            prompt_id: promptId,
            amount: 0,
            payment_status: 'demo'
        });

        if (error) throw error;

        // Fetch prompt author for earnings record
        const { data: promptData } = await supabaseClient
            .from('prompts')
            .select('created_by')
            .eq('id', promptId)
            .single();

        if (promptData) {
            await supabaseClient.from('creator_earnings').insert({
                creator_id: promptData.created_by,
                prompt_id: promptId,
                amount: 0,
                commission: 0
            });
        }

        alert('Prompt Unlocked (Demo)!');
        fetchPurchases(); // Refresh local purchase state
        renderPrompts();
    } catch (err) {
        alert('Unlock Error: ' + err.message);
    }
}

// Copy Logic
function copyToClipboard(text, btn) {
    if (!btn) return;
    const promptToCopy = text || btn.getAttribute('data-prompt');
    if (!promptToCopy) return;

    // Resolve variables if inside a card
    let processedText = promptToCopy;
    const parentCard = btn.closest('.prompt-card, .potd-card, .playground-input, .ai-generated-card');
    
    if (parentCard) {
        let selector = '.prompt-card';
        if (parentCard.classList.contains('potd-card')) selector = '.potd-card';
        else if (parentCard.classList.contains('playground-input')) selector = '.playground-input';
        else if (parentCard.classList.contains('ai-generated-card')) selector = '.ai-generated-card';
        
        if (typeof getFilledPrompt === 'function') {
            processedText = getFilledPrompt(promptToCopy, selector);
        }
    }

    navigator.clipboard.writeText(processedText).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check"></i> Copied!';
        btn.classList.add('btn-copy-success');

        // Celebration & Visual Feedback!
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#10b981', '#00F5FF', '#0066FF', '#ffffff']
            });
        }

        // Professional Feedback Sound
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3');
        audio.volume = 0.15;
        audio.play().catch(() => { });

        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('btn-copy-success');
            if (window.lucide) lucide.createIcons();
        }, 2000);
    });
}

// Sync and Filter Logic
function syncSearch(query) {
    // If we're on index.html and the user types/clicks search, optionally redirect to prompts.html
    // But for "live" sync, we keep it as is if they are already on the page.
    if (searchInput) searchInput.value = query;
    if (headerSearchInput) headerSearchInput.value = query;
    if (filterSearchInput) filterSearchInput.value = query;

    currentPage = 1; // Reset to page 1 for search
    const filtered = allPrompts.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
    );
    renderPrompts(filtered);
}

// Modal Logic
function openModal(type) {
    // Check for mobile menu and close it if open
    const navLinks = document.querySelector('.nav-links');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (navLinks?.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileMenuBtn?.classList.remove('active');
        document.body.style.overflow = 'auto'; // Reset scroll
    }

    // Dynamic lookup if not initialized
    if (!modalOverlay) modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return console.error('Modal overlay not found');

    modalOverlay.classList.add('active');

    // Ensure modal variables are mapped
    const mLogin = loginModal || document.getElementById('login-modal');
    const mSignup = signupModal || document.getElementById('signup-modal');
    const mUpload = uploadModal || document.getElementById('upload-modal');
    const mSubmit = document.getElementById('submit-prompt-modal');
    const mSettings = document.getElementById('ai-settings-modal');

    // Deactivate all
    [mLogin, mSignup, mUpload, mSubmit, mSettings].forEach(m => m?.classList.remove('active'));

    const targetModal = {
        'login': mLogin,
        'signup': mSignup,
        'upload': mUpload,
        'submit': mSubmit,
        'ai-settings': mSettings
    }[type];

    if (targetModal) {
        targetModal.classList.add('active');

        // Populate AI settings if needed
        if (type === 'ai-settings') {
            const openaiInput = document.getElementById('openai-key');
            const geminiInput = document.getElementById('gemini-key');
            if (openaiInput) openaiInput.value = aiSettings?.openai || '';
            if (geminiInput) geminiInput.value = aiSettings?.gemini || '';
        }
    }
}

function closeModal() {
    if (!modalOverlay) modalOverlay = document.getElementById('modal-overlay');
    modalOverlay?.classList.remove('active');

    const modals = [
        loginModal || document.getElementById('login-modal'),
        signupModal || document.getElementById('signup-modal'),
        uploadModal || document.getElementById('upload-modal'),
        document.getElementById('submit-prompt-modal'),
        document.getElementById('ai-settings-modal')
    ];
    modals.forEach(m => m?.classList.remove('active'));
}

// --- NEW SUPABASE AUTH LOGIC ---
async function handleSignUp(email, password, fullName) {
    if (!supabaseClient) return alert('Supabase not initialized.');
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) throw error;
        alert('Verification email sent! Please check your inbox.');
        closeModal();
    } catch (err) {
        alert("Signup Error: " + err.message);
    }
}

async function signInWithGoogle() {
    if (!supabaseClient) return alert('Supabase not initialized.');
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    } catch (err) {
        alert('Google Login Error: ' + err.message);
    }
}

async function handleLogin(email, password) {
    if (!supabaseClient) return alert('Supabase not initialized.');
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        updateAuthUI(data.user);
        closeModal();
    } catch (err) {
        alert("Login Error: " + err.message);
    }
}

async function handleLogout() {
    if (!supabaseClient) return;
    try {
        await supabaseClient.auth.signOut();
        favorites = [];
        userPurchases = [];
        localStorage.removeItem('favorites');
        updateAuthUI(null);
        window.location.reload(); // Hard refresh to clear all states
    } catch (err) {
        alert("Logout Error: " + err.message);
    }
}

function updateAuthUI(user) {
    const loginHeaderBtn = document.getElementById('login-btn');
    const signupHeaderBtn = document.getElementById('signup-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileSignupBtn = document.getElementById('mobile-signup-btn');

    if (user) {
        const displayName = user.user_metadata?.full_name || 'Profile';

        // Update Header
        if (loginHeaderBtn) {
            loginHeaderBtn.textContent = 'Dashboard';
            loginHeaderBtn.onclick = () => window.location.href = 'creator-dashboard.html';
        }
        if (signupHeaderBtn) {
            signupHeaderBtn.textContent = 'Logout';
            signupHeaderBtn.onclick = handleLogout;
        }

        // Update Mobile Menu
        if (mobileLoginBtn) {
            mobileLoginBtn.textContent = 'Dashboard';
            mobileLoginBtn.onclick = () => window.location.href = 'creator-dashboard.html';
        }
        if (mobileSignupBtn) {
            mobileSignupBtn.textContent = 'Logout';
            mobileSignupBtn.onclick = handleLogout;
        }
    } else {
        // Reset Header
        if (loginHeaderBtn) {
            loginHeaderBtn.textContent = 'Login';
            loginHeaderBtn.onclick = () => openModal('login');
        }
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
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (session?.user) {
            updateAuthUI(session.user);
            ensureUserProfile(session.user); // Auto-create profile if missing
            fetchFavorites();
            fetchSubscription();
            fetchPurchases();
        } else {
            updateAuthUI(null);

            // Redirect away from protected creator pages if not logged in
            const currentPath = window.location.pathname;
            if (currentPath.endsWith('create-prompt.html') || currentPath.endsWith('creator-dashboard.html')) {
                window.location.href = 'index.html';
            }
        }
    } catch (err) {
        console.error("Session Check Error:", err.message);
    }
}

async function ensureUserProfile(user) {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (!data && !error) {
            // Profile missing, create it
            await supabaseClient.from('profiles').insert({
                id: user.id,
                full_name: user.user_metadata?.full_name || 'Creator',
                avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`
            });
        }
    } catch (e) {
        console.error('Profile creation error:', e);
    }
}
// -----------------------------

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initCustomSelects();
    // Initialize Elements
    trendingGrid = document.getElementById('trending-grid') || document.getElementById('marketplace-grid');
    latestGrid = document.getElementById('latest-grid') || document.getElementById('marketplace-grid');
    searchInput = document.getElementById('main-search');
    headerSearchInput = document.getElementById('header-search-input');
    headerSearchToggle = document.getElementById('header-search-toggle');
    headerSearchContainer = document.getElementById('header-search-container');
    filterSearchInput = document.getElementById('filter-search-input');
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
            currentPage = 1; // Reset to page 1 on category change

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
        const favPrompts = allPrompts.filter(p => window.favorites.includes(p.id));
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

    // Initialize Autocomplete for different pages
    handleAutocomplete(searchInput, document.getElementById('main-search-suggestions'));
    handleAutocomplete(filterSearchInput, document.getElementById('filter-search-suggestions'));
    handleAutocomplete(headerSearchInput, document.getElementById('header-search-suggestions'));

    // Submit Prompt Modal
    const openSubmitBtn = document.getElementById('open-submit-modal');
    const newPromptForm = document.getElementById('new-prompt-form');

    openSubmitBtn?.addEventListener('click', () => openModal('submit'));

    newPromptForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('new-prompt-title').value;
        const categoryName = document.getElementById('new-prompt-category').value;
        const promptText = document.getElementById('new-prompt-text').value;

        const newPromptLocal = {
            id: Date.now(),
            title: title,
            category: categoryName,
            description: promptText.substring(0, 100) + (promptText.length > 100 ? '...' : ''),
            content: promptText,
            saves: 0,
            rating: 5.0
        };

        if (supabaseClient) {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();

                // Fetch category ID to avoid schema errors
                const { data: catData } = await supabaseClient
                    .from('categories')
                    .select('id')
                    .eq('name', categoryName)
                    .single();

                const dbInsertPayload = {
                    title: title,
                    description: promptText.substring(0, 100) + (promptText.length > 100 ? '...' : ''),
                    content: promptText,
                    status: 'approved',
                    is_free: true,
                    created_by: user.id // Fix: Add missing author ID
                };

                if (catData && catData.id) {
                    dbInsertPayload.category_id = catData.id;
                }

                const { data, error } = await supabaseClient.from('prompts').insert([dbInsertPayload]).select('*, categories(name)');

                if (error) {
                    console.error('Database Error:', error);
                    alert('Submission failed or schema mismatch: ' + error.message + '\n\nSaved locally instead.');
                    allPrompts.unshift(newPromptLocal);
                } else if (data && data.length > 0) {
                    allPrompts.unshift(data[0]);
                }
            } catch (err) {
                console.error(err);
                allPrompts.unshift(newPromptLocal);
            }
        } else {
            allPrompts.unshift(newPromptLocal);
        }

        renderPrompts(allPrompts);
        closeModal();
        newPromptForm.reset();
        alert('Prompt successfully added to the library!');
    });

    // --- Consolidated Playground & AI Logic ---
    const compareToggle = document.getElementById('playground-compare-toggle');
    const model2Group = document.getElementById('playground-model-2-group');
    const resultContainer = document.getElementById('playground-result-container');

    compareToggle?.addEventListener('change', (e) => {
        if (e.target.checked) {
            model2Group?.classList.add('active');
            resultContainer?.classList.add('comparing');
            const res2 = document.getElementById('playground-result-2');
            if (res2) res2.style.display = 'block';
            const header1 = document.getElementById('output-header-1');
            if (header1) header1.textContent = 'Comparison Mode';
        } else {
            model2Group?.classList.remove('active');
            resultContainer?.classList.remove('comparing');
            const res2 = document.getElementById('playground-result-2');
            if (res2) res2.style.display = 'none';
            const header1 = document.getElementById('output-header-1');
            if (header1) header1.textContent = 'Result';
        }
    });

    playgroundBtn?.addEventListener('click', async () => {
        let topic = playgroundInput.value.trim() || (playgroundPromptDisplay ? playgroundPromptDisplay.textContent : '');
        if (!topic) return alert('Please enter a topic!');

        const tone = document.getElementById('playground-tone')?.value || 'Default';
        const format = document.getElementById('playground-format')?.value || 'Default';

        // Fill variables from inputs
        topic = getFilledPrompt(topic, '.playground-input');

        playgroundBtn.innerHTML = '<i class="loader spin"></i> Generating...';
        playgroundBtn.disabled = true;

        const model1 = document.getElementById('playground-model')?.value || 'optimized';
        const isComparing = compareToggle?.checked;

        try {
            if (isComparing) {
                const model2 = document.getElementById('playground-model-2')?.value || 'gemini-pro';
                await Promise.all([
                    generateTask(topic, tone, format, model1, 'playground-result'),
                    generateTask(topic, tone, format, model2, 'playground-result-2')
                ]);
            } else {
                await generateTask(topic, tone, format, model1, 'playground-result');
            }
        } catch (err) {
            console.error(err);
        } finally {
            playgroundBtn.innerHTML = '⚡ Generate Result';
            playgroundBtn.disabled = false;
            if (window.lucide) lucide.createIcons();
        }
    });

    async function generateTask(topic, tone, format, model, targetId) {
        if (model === 'optimized') {
            await generateOptimizedPrompt(topic, tone, format, targetId);
        } else {
            await handleRealAIGeneration(topic, tone, format, model, targetId);
        }
    }

    async function handleRealAIGeneration(topic, tone, format, model, targetId) {
        const apiKey = model.startsWith('gpt') ? aiSettings.openai : aiSettings.gemini;
        if (!apiKey) {
            showNoKeyAlert(model, topic, tone, format, targetId);
            return;
        }

        try {
            let resultText = "";
            if (model.startsWith('gpt')) {
                resultText = await fetchOpenAI(topic, tone, format, apiKey);
            } else {
                resultText = await fetchGemini(topic, tone, format, apiKey);
            }
            renderAIResult(resultText, model, topic, targetId);
        } catch (err) {
            const container = document.getElementById(targetId);
            if (container) container.innerHTML = `<div class="error-msg">Error: ${err.message}</div>`;
        }
    }

    function showNoKeyAlert(model, topic, tone, format, targetId) {
        const platform = model.startsWith('gpt') ? 'ChatGPT' : 'Gemini';
        const url = model.startsWith('gpt')
            ? `https://chatgpt.com/?q=${encodeURIComponent(topic)}`
            : `https://gemini.google.com/app?q=${encodeURIComponent(topic)}`;

        const container = document.getElementById(targetId);
        if (container) {
            container.innerHTML = `
                <div class="ai-generated-card alert-card">
                    <div class="ai-card-header">
                        <div class="ai-card-title"><i data-lucide="info"></i> API Key Required</div>
                    </div>
                    <div class="ai-card-body" style="text-align: center; padding: 20px;">
                        <p style="font-size: 0.85rem; margin-bottom: 16px;">Add <strong>${platform}</strong> key in settings.</p>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-primary btn-sm" onclick="window.openModal('ai-settings')">Setup Key</button>
                            <a href="${url}" target="_blank" class="btn btn-outline btn-sm">Try on ${platform}</a>
                        </div>
                    </div>
                </div>
            `;
        }
        if (window.lucide) lucide.createIcons();
    }

    async function fetchOpenAI(topic, tone, format, key) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{
                    role: "system",
                    content: `You are a professional assistant. Tone: ${tone}. Format: ${format}.`
                }, {
                    role: "user",
                    content: topic
                }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    }

    async function fetchGemini(topic, tone, format, key) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Tone: ${tone}. Format: ${format}. Topic: ${topic}` }] }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    }

    function renderAIResult(text, model, originalTopic, targetId) {
        const platform = model.startsWith('gpt') ? 'ChatGPT' : 'Gemini';
        const container = document.getElementById(targetId);
        if (container) {
            container.innerHTML = `
                <div class="ai-generated-card">
                    <div class="ai-card-header">
                        <div class="mac-dots"><span></span><span></span><span></span></div>
                        <div class="ai-card-title"><i data-lucide="sparkles"></i> ${platform}</div>
                        <button class="icon-btn small-btn copy-btn" data-prompt="${text.replace(/"/g, '&quot;')}">
                            <i data-lucide="copy"></i>
                        </button>
                    </div>
                    <div class="ai-card-body">
                        <div class="markdown-content" style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5;">${text}</div>
                    </div>
                </div>
            `;
        }
        if (window.lucide) lucide.createIcons();

        // Save to history (only if 1st result or main result)
        if (targetId === 'playground-result') {
            const history = JSON.parse(localStorage.getItem('playgroundHistory') || '[]');
            history.unshift({ topic: originalTopic, result: text, date: new Date().toISOString(), model: platform });
            localStorage.setItem('playgroundHistory', JSON.stringify(history.slice(0, 10)));
            renderPlaygroundHistory();
        }
    }

    async function generateOptimizedPrompt(topic, tone, format, targetId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const rawPrompt = `Act as an elite expert and absolute authority in this field.\n\n**Your Objective:**\n${topic}\n\n**Instructions & Guidelines:**\n- Adopt a strictly ${tone.toLowerCase()} tone of voice throughout your entire response.\n- Ensure your output is highly actionable, logically structured, and easy to understand.\n- Anticipate edge-cases, provide comprehensive details, and do not use generic filler words.\n\n**Format Requirements:**\n- Present the final output precisely as a ${format.toLowerCase()}.\n- Use markdown (headings, bold text, bullet points) where appropriate to dramatically enhance readability.`;

                const container = document.getElementById(targetId);
                if (container) {
                    container.innerHTML = `
                        <div class="ai-generated-card">
                            <div class="ai-card-header">
                                <div class="mac-dots"><span></span><span></span><span></span></div>
                                <div class="ai-card-title"><i data-lucide="wand-2"></i> Optimizer</div>
                                <button class="icon-btn small-btn copy-btn" data-prompt="${rawPrompt.replace(/"/g, '&quot;')}">
                                    <i data-lucide="copy"></i>
                                </button>
                            </div>
                            <div class="ai-card-body">
                                <p style="font-size: 0.9rem; margin-bottom: 8px; color: var(--accent-primary); font-weight: 600;">OBJECTIVE:</p>
                                <p style="font-size: 0.95rem; margin-bottom: 16px;">${topic}</p>
                                <p style="font-size: 0.9rem; margin-bottom: 8px; color: var(--accent-primary); font-weight: 600;">MODEL INSTRUCTIONS:</p>
                                <ul style="font-size: 0.85rem; color: var(--text-muted);">
                                    <li>Tone: ${tone}</li>
                                    <li>Format: ${format}</li>
                                    <li>Actionable & Structured</li>
                                </ul>
                            </div>
                        </div>
                    `;
                }

                if (targetId === 'playground-result') {
                    // Save to history
                    const history = JSON.parse(localStorage.getItem('playgroundHistory') || '[]');
                    history.unshift({ topic, tone, format, date: new Date().toISOString() });
                    localStorage.setItem('playgroundHistory', JSON.stringify(history.slice(0, 5)));
                    renderPlaygroundHistory();
                }

                if (window.lucide) lucide.createIcons();
                resolve();
            }, 800);
        });
    }

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
                    <strong>${(item.topic || '').substring(0, 30)}${(item.topic || '').length > 30 ? '...' : ''}</strong>
                    <span>${item.tone || 'Default'} • ${item.format || 'Default'}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="icon-btn small-btn copy-btn" data-prompt="${(item.topic || '').replace(/"/g, '&quot;')}"><i data-lucide="copy"></i></button>
                    <button class="icon-btn small-btn delete-history-btn" data-index="${index}" style="color: var(--text-muted);"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `).join('');

        const deleteBtns = historyList.querySelectorAll('.delete-history-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.currentTarget.dataset.index);
                const currentHistory = JSON.parse(localStorage.getItem('playgroundHistory') || '[]');
                currentHistory.splice(index, 1);
                localStorage.setItem('playgroundHistory', JSON.stringify(currentHistory));
                renderPlaygroundHistory();
            });
        });
        if (window.lucide) lucide.createIcons();
    }

    function extractVariables(text) {
        const regex = /\[([a-zA-Z0-9_\s]+)\]/g;
        const matches = new Set();
        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.add(match[1]);
        }
        return Array.from(matches);
    }

    function updatePlaygroundVariables() {
        if (!playgroundInput) return;
        const text = playgroundInput.value;
        const variables = extractVariables(text);

        let varContainer = document.getElementById('playground-vars');
        if (!varContainer) {
            varContainer = document.createElement('div');
            varContainer.id = 'playground-vars';
            varContainer.className = 'playground-variables-section';
            playgroundInput.parentNode.insertBefore(varContainer, playgroundInput.nextSibling);
        }

        if (variables.length === 0) {
            varContainer.innerHTML = '';
            varContainer.style.display = 'none';
            return;
        }

        varContainer.style.display = 'block';
        varContainer.innerHTML = `
            <div class="var-header">Fill in variables:</div>
            <div class="var-grid">
                ${variables.map(v => `
                    <div class="var-input-group">
                        <label>${v}</label>
                        <input type="text" class="var-field" data-var="${v}" placeholder="Enter ${v.toLowerCase()}...">
                    </div>
                `).join('')}
            </div>
        `;
    }

    function initPOTDVariables() {
        const potdText = "Generate 5 startup ideas in the [industry] industry. Include problem, solution, and target audience.";
        const variables = extractVariables(potdText);
        const varContainer = document.getElementById('potd-vars');
        if (varContainer && variables.length > 0) {
            varContainer.style.display = 'block';
            varContainer.innerHTML = `
                <div class="var-header">Customize Prompt:</div>
                <div class="var-grid">
                    ${variables.map(v => `
                        <div class="var-input-group">
                            <label>${v}</label>
                            <input type="text" class="var-field" data-var="${v}" placeholder="Enter ${v}...">
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    function getFilledPrompt(text, containerSelector) {
        let filledText = text;
        const variables = extractVariables(text);
        const container = document.querySelector(containerSelector);

        if (container) {
            variables.forEach(v => {
                const input = container.querySelector(`.var-field[data-var="${v}"]`);
                if (input && input.value.trim() !== '') {
                    filledText = filledText.split(`[${v}]`).join(input.value.trim());
                }
            });
        }
        return filledText;
    }

    // --- Standard Initializations & Events ---
    renderCollections();
    renderPlaygroundHistory();
    initPOTDVariables();
    renderPrompts();
    initInfiniteScroll();

    playgroundInput?.addEventListener('input', updatePlaygroundVariables);

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
    updatePlaygroundVariables();

    // Standard Events
    searchInput?.addEventListener('input', (e) => syncSearch(e.target.value));
    headerSearchInput?.addEventListener('input', (e) => syncSearch(e.target.value));
    filterSearchInput?.addEventListener('input', (e) => syncSearch(e.target.value));

    heroSearchBtn?.addEventListener('click', () => {
        if (searchInput && searchInput.value.trim() !== '') {
            // Redirect to marketplace with search query
            window.location.href = `prompts.html?search=${encodeURIComponent(searchInput.value)}`;
        } else {
            // If empty, just go to marketplace
            window.location.href = 'prompts.html';
        }
    });

    headerSearchToggle?.addEventListener('click', () => {
        headerSearchContainer?.classList.toggle('active');
        if (headerSearchContainer?.classList.contains('active')) headerSearchInput?.focus();
    });

    // (Pagination Listeners removed)

    document.getElementById('sort-select')?.addEventListener('change', () => {
        // Find the currently active category button
        const activeBtn = document.querySelector('.filter-btn.active');
        const category = activeBtn ? activeBtn.getAttribute('data-category') : 'all';
        currentPage = 1; // Reset to page 1 on sort change

        if (category === 'all') {
            renderPrompts(allPrompts);
        } else if (category === 'favorite') {
            const favs = allPrompts.filter(p => window.favorites.includes(p.id));
            renderPrompts(favs);
        } else {
            const filtered = allPrompts.filter(p =>
                p.category && p.category.toLowerCase() === category.toLowerCase()
            );
            renderPrompts(filtered);
        }
    });

/* --- Infinite Scroll Logic --- */
function initInfiniteScroll() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMorePrompts) {
            isLoadingMore = true;
            currentPage++;
            
            // Re-render with currently active filter
            const activeBtn = document.querySelector('.filter-btn.active');
            const category = activeBtn ? activeBtn.getAttribute('data-category') : 'all';
            const searchQuery = searchInput ? searchInput.value : '';

            let dataToRender = allPrompts;
            if (searchQuery) {
                dataToRender = allPrompts.filter(p =>
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
                );
            } else if (category !== 'all') {
                dataToRender = allPrompts.filter(p => p.category.toLowerCase() === category.toLowerCase());
            }

            renderPrompts(dataToRender, true);
        }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
}

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
        const fullName = document.getElementById('signup-fullname')?.value || '';
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        handleSignUp(email, password, fullName);
    });

    // Social Login buttons
    document.getElementById('google-login-btn')?.addEventListener('click', signInWithGoogle);
    document.getElementById('google-signup-btn')?.addEventListener('click', signInWithGoogle);

    // Subscription buttons
    document.getElementById('buy-pro-btn')?.addEventListener('click', initiateRazorpayPayment);

    // Global click listener for Prompt Card Actions (Event Delegation)
    document.addEventListener('click', (e) => {
        // Unlock Demo Button
        const unlockBtn = e.target.closest('.unlock-demo-btn');
        if (unlockBtn) {
            const promptId = unlockBtn.getAttribute('data-id');
            handleDemoUnlock(promptId);
            return;
        }

        // Heart (Favorite) Button
        const heartBtn = e.target.closest('.heart-btn');
        if (heartBtn) {
            const promptId = heartBtn.getAttribute('data-id');
            toggleFavorite(promptId, heartBtn);
            return;
        }

        // Share Button
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            const title = shareBtn.getAttribute('data-title');
            const text = shareBtn.getAttribute('data-text');
            sharePrompt(title, text);
            return;
        }

        // Copy Button
        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
            const content = copyBtn.getAttribute('data-prompt');
            copyToClipboard(content, copyBtn);
            return;
        }
        // Rating Star
        const star = e.target.closest('.rating-stars i');
        if (star) {
            const container = star.closest('.rating-stars');
            const promptId = container.getAttribute('data-id');
            const rating = parseInt(star.getAttribute('data-star'));
            updateRating(promptId, rating, container);
            return;
        }
    });


    // Modal Triggers
    if (loginBtn) loginBtn.addEventListener('click', () => openModal('login'));
    if (signupBtn) signupBtn.addEventListener('click', () => openModal('signup'));

    // AI Settings Modal
    document.getElementById('ai-settings-btn')?.addEventListener('click', () => openModal('ai-settings'));

    // Internal API to open modals globally
    // openModal is already global, no need to re-assign (it causes recursion)


    document.getElementById('ai-settings-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        aiSettings.openai = document.getElementById('openai-key').value.trim();
        aiSettings.gemini = document.getElementById('gemini-key').value.trim();
        localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
        alert('AI credentials saved locally! You can now generate real-time results.');
        closeModal();
    });
    const handleCreatorAccess = (e) => {
        if (e) e.preventDefault();
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) window.location.href = 'create-prompt.html';
            else openModal('login');
        });
    };

    if (sellPromptBtn) {
        sellPromptBtn.addEventListener('click', handleCreatorAccess);
    }

    const becomeCreatorBtn = document.getElementById('become-creator-btn');
    if (becomeCreatorBtn) {
        becomeCreatorBtn.addEventListener('click', handleCreatorAccess);
    }

    // Form Submits
    if (document.getElementById('upload-form')) {
        document.getElementById('upload-form').addEventListener('submit', handlePromptUpload);
    }

    // Mobile specific triggers
    document.getElementById('mobile-login-btn')?.addEventListener('click', () => openModal('login'));
    document.getElementById('mobile-signup-btn')?.addEventListener('click', () => openModal('signup'));

    // Prompt of the Day Actions
    document.getElementById('potd-copy-btn')?.addEventListener('click', (e) => {
        const text = "Generate 5 startup ideas in the [industry] industry. Include problem, solution, and target audience.";
        copyToClipboard(text, e.currentTarget);
    });

    document.getElementById('potd-test-btn')?.addEventListener('click', () => {
        if (playgroundInput) {
            playgroundInput.value = "Generate 5 startup ideas in the [industry] industry. Include problem, solution, and target audience.";
            updatePlaygroundVariables();
        }
    });

    // Global Modal Delegation (100% working)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.modal-close') || e.target.closest('.close-modal') || e.target === modalOverlay) {
            closeModal();
        }
    });
    switchToSignup?.addEventListener('click', (e) => { e.preventDefault(); openModal('signup'); });
    switchToLogin?.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });

    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPassword();
    });

    // Initial session check
    checkUserSession();

    // Marketplace Page: Check for category or search in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlCat = urlParams.get('category');
    const urlSearch = urlParams.get('search');

    if (urlCat || urlSearch) {
        setTimeout(() => {
            if (urlCat) {
                const btn = document.querySelector(`.filter-btn[data-category="${urlCat}"]`);
                if (btn) btn.click();
            }
            if (urlSearch) {
                syncSearch(urlSearch);
            }
        }, 800);
    }
});

function initCustomSelects() {
    const selects = document.querySelectorAll('.custom-select');
    
    selects.forEach(select => {
        const trigger = select.querySelector('.select-trigger');
        const options = select.querySelectorAll('.select-option');
        const hiddenInput = select.querySelector('input[type="hidden"]');
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other selects
            document.querySelectorAll('.custom-select').forEach(s => {
                if (s !== select) s.classList.remove('active');
            });
            select.classList.toggle('active');
        });
        
        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.getAttribute('data-value');
                const content = option.innerHTML;
                
                // Update UI
                trigger.querySelector('span').innerHTML = content;
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // Update state
                if (hiddenInput) {
                    hiddenInput.value = value;
                    // Trigger change event if needed for existing logic
                    hiddenInput.dispatchEvent(new Event('change'));
                }
                
                select.classList.remove('active');
            });
        });
    });
    
    // Close on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('active'));
    });
}
