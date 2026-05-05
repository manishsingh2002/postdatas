function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, undefined, 2);
    }

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'json-number';

        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            }

            else {
                cls = 'json-string';
            }
        }

        else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        }

        else if (/null/.test(match)) {
            cls = 'json-null';
        }

        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Toast Notification System
function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    // Remove element after animation finishes
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

// Robust Copy Function (Bypasses iFrame Navigator Clipboard restrictions)
async function executeCopy(text, btn) {
    try {
        // Try modern Clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers or non-secure contexts
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(ta);
            if (!successful) throw new Error("Copy failed");
        }

        // Visual Feedback
        if (btn) {
            const orig = btn.getAttribute('data-orig') || btn.textContent;
            if (!btn.hasAttribute('data-orig')) btn.setAttribute('data-orig', orig);

            btn.textContent = '✓ Copied!';
            btn.classList.add('btn-success');
            showToast('Copied to clipboard successfully');

            setTimeout(() => {
                btn.textContent = orig;
                btn.classList.remove('btn-success');
            }, 2200);
        }
    } catch (err) {
        console.error("Copy failed", err);
        showToast('Failed to copy. Please copy manually.');
    }
}

// Global Handlers attached to index to avoid inline strings
window.copyPostJson = function (num, event) {
    if (event) event.stopPropagation();
    console.log("Copying JSON for post:", num);
    const post = postsData.find(p => p.num === num);

    if (post) {
        const jsonStr = JSON.stringify(post.json, null, 2);
        const btn = event.target.closest('button') || event.target;
        executeCopy(jsonStr, btn);
    }
}

window.copyPostCaption = function (num, event) {
    if (event) event.stopPropagation();
    console.log("Copying Caption for post:", num);
    const post = postsData.find(p => p.num === num);

    if (post) {
        const btn = event.target.closest('button') || event.target;
        executeCopy(post.igCaption, btn);
    }
}

window.togglePost = function (num) {
    const card = document.getElementById(`post-${num}`);
    const isCurrentlyOpen = card.classList.contains('is-open');

    // Toggle the clicked one
    card.classList.toggle('is-open', !isCurrentlyOpen);
}

window.filterPosts = function (cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.post-card').forEach(card => {
        if (cat === 'all') {
            card.style.display = '';
        }

        else {
            card.style.display = card.dataset.cat === cat ? '' : 'none';
        }
    });
}

function buildPostHTML(p) {
    const jsonStr = JSON.stringify(p.json, null, 2);
    const slideTypes = p.json.slides.map(s => s.type);
    const highlightedTypes = ['hook', 'closing', 'manifesto'];

    const chipsHtml = slideTypes.map((t, i) => `<span class="slide-chip ${highlightedTypes.includes(t) ? 'highlight' : ''}">${i + 1}. ${t}</span>`).join('');

    return `<div class="post-card" id="post-${p.num}" data-cat="${escHtml(p.category)}">
        <div class="post-header" onclick="togglePost(${p.num})">
            <div class="post-num">${String(p.num).padStart(2, '0')}</div>
            <div class="post-info">
                <div class="post-title">${escHtml(p.title)}</div>
                <div class="post-meta-row">
                    <span class="post-cat">${escHtml(p.category)}</span>
                    <span class="post-theme-badge">${escHtml(p.json.theme)}</span>
                    <span class="post-slides-count">${p.json.slides.length} slides · font ${p.json.fontSize}px</span>
                </div>
                <div class="post-hook-prev">"${escHtml(p.json.slides[0]?.hook || '')}"</div>
            </div>
            <div class="post-actions">
                <span class="expand-lbl">Expand</span>
                <button class="btn-primary" onclick="copyPostJson(${p.num}, event)">⎘ Copy JSON</button>
            </div>
        </div>
        <div class="post-body-wrapper">
            <div class="post-body">
                <div class="post-body-content">
                    <div class="slides-info">${chipsHtml}</div>
                    <div class="ig-caption-wrap">
                        <div class="section-label">
                            <span>Instagram Caption (Copy-Ready)</span>
                            <button class="btn-secondary" onclick="copyPostCaption(${p.num}, event)">⎘ Copy Caption</button>
                        </div>
                        <div class="ig-caption-box">${escHtml(p.igCaption)}</div>
                    </div>
                    <div class="json-wrap">
                        <div class="section-label">
                            <span>Full JSON Import — All ${p.json.slides.length} Slides</span>
                            <button class="btn-secondary" onclick="copyPostJson(${p.num}, event)">⎘ Copy JSON</button>
                        </div>
                        <div class="json-block">${syntaxHighlight(jsonStr)}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function buildNav() {
    const nav = document.getElementById('nav-float');
    nav.innerHTML = postsData.map(p => `<div class="ndot" title="Post ${p.num}: ${p.title}" onclick="document.getElementById('post-${p.num}').scrollIntoView({behavior:'smooth', block:'center'})" ></div>`).join('');
}

function init() {
    console.log("Initializing APEX Bank... postsData length:", typeof postsData !== 'undefined' ? postsData.length : 'UNDEFINED');

    if (typeof postsData === 'undefined') {
        console.error("CRITICAL: postsData is not defined. Check data.js import.");
        document.body.innerHTML = '<div style="color:red; padding:2rem; font-family:monospace;">Error: Data not loaded. Please ensure data.js is in the same folder.</div>';
        return;
    }

    // Dynamically re-index and NORMALIZE data structure
    postsData.forEach((p, i) => {
        p.num = i + 1;

        // NORMALIZATION: If post was added without the 'json' wrapper, fix it now
        if (!p.json && p.slides) {
            p.json = {
                theme: p.theme || 'dark-gold',
                format: p.format || 'post',
                accent: p.accent || '#c9a84c',
                fontSize: p.fontSize || 30,
                slides: p.slides
            };
            // Clean up root properties to avoid confusion (optional)
            delete p.slides;
            delete p.theme;
            delete p.accent;
            delete p.fontSize;
        }

        // Update postnum label in slides if it exists to match the new count
        if (p.json && p.json.slides) {
            const total = postsData.length;
            p.json.slides.forEach(slide => {
                if (slide.postnum) {
                    const current = String(p.num).padStart(2, '0');
                    slide.postnum = `${current} / ${total}`;
                }
            });
        }
    });

    const total = postsData.length;
    document.title = `APEX — ${total} Billionaire Posts · JSON Import Bank`;

    const headerRight = document.querySelector('.header-right');
    if (headerRight) headerRight.innerHTML = `${total} Posts · 18 Slide Types<br>Instagram Format Ready`;

    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) heroTitle.innerHTML = `${total} Premium Billionaire Posts<br>JSON Import Ready`;

    const infoNum = document.querySelector('.info-num-total');
    if (infoNum) infoNum.textContent = total;

    const filterBtn = document.querySelector('.filter-btn.active');
    if (filterBtn) filterBtn.textContent = `All ${total}`;

    const footer = document.querySelector('.footer');
    if (footer) footer.innerHTML = `APEX Post Bank · ${total} Billionaire Thinking Posts · JSON Import Format · All Rights Reserved`;

    buildNav();

    const container = document.getElementById('posts-container');
    if (!container) {
        console.error("CRITICAL: #posts-container not found in DOM");
        return;
    }

    // Load ALL posts into the DOM with safety catch
    container.innerHTML = postsData.map(p => {
        try {
            return buildPostHTML(p);
        } catch (e) {
            console.error("Error rendering post at index", p.num, e);
            return `<div class="post-card" style="border:1px solid red; padding:1rem;">Error rendering post ${p.num}</div>`;
        }
    }).join('');

    // Intersection Observer for floating nav dots
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const idx = postsData.findIndex(p => `post-${p.num}` === e.target.id);
                if (idx !== -1) {
                    document.querySelectorAll('.ndot').forEach((d, i) => {
                        d.classList.toggle('active', i === idx);
                    });
                }
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: "-20% 0px -20% 0px"
    });

    postsData.forEach(p => {
        const el = document.getElementById(`post-${p.num}`);
        if (el) obs.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', init);
