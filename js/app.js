let exhibits = [];
let currentActiveExhibit = null;

function navigateTo(hash) {
    window.location.hash = hash;
}

// Render math formula safely with KaTeX (enabling HTML trust for dataset attributes)
function safeRenderMath(tex, elementId) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (!el) return;
    if (window.katex) {
        try {
            katex.render(tex, el, { throwOnError: false, trust: true });
        } catch (e) {
            el.innerText = tex;
        }
    } else {
        el.innerText = tex;
    }
}

// Generate LaTeX TeX string for exhibit with embedded htmlData attributes for variable interactivity
function generateExhibitTex(ex, activeTermId) {
    let resultTex = ex.texTemplate;
    ex.terms.forEach(t => {
        const isSelected = (t.id === activeTermId);
        const color = t.color || '#ea580c';
        
        let termTex = `\\textcolor{${color}}{${t.symbol}}`;
        if (isSelected) {
            termTex = `\\boxed{${termTex}}`;
        }
        
        // Wrap with KaTeX \htmlData to allow direct clicking on equation rendered DOM elements
        const activeClass = isSelected ? 'eq-var eq-var-active' : 'eq-var';
        const interactiveTex = `\\htmlData{term=${t.id}}{\\htmlClass{${activeClass}}{${termTex}}}`;
        
        // Replace placeholder in template string
        const placeholder = new RegExp(`\\{${t.id}\\}`, 'g');
        resultTex = resultTex.replace(placeholder, interactiveTex);
    });
    return resultTex;
}

// Render 3-column scrollable catalog grid
function renderSquareGrid() {
    const grid = document.getElementById('squareGrid');
    if (!grid) return;

    grid.innerHTML = exhibits.map((ex) => `
        <a href="#${ex.id}" class="square-card">
            <div>
                <div class="square-card-top">
                    <span class="category-pill">${ex.category}</span>
                </div>
                <h3 class="square-title">${ex.title}</h3>
                <div class="square-eq-box" id="square-math-${ex.id}"></div>
            </div>
        </a>
    `).join('');

    exhibits.forEach(ex => {
        safeRenderMath(ex.previewTex, `square-math-${ex.id}`);
    });
}

// Open exhibit detail view
function openExhibitDetail(exhibitId, targetTermId) {
    const ex = exhibits.find(e => e.id === exhibitId);
    if (!ex) return;
    currentActiveExhibit = ex;

    if (targetTermId && ex.varDetails && ex.varDetails[targetTermId]) {
        ex.activeTerm = targetTermId;
    }

    document.getElementById('catalogWrapper').style.display = 'none';
    document.getElementById('detailWrapper').style.display = 'block';

    renderDetailCard(ex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Return to catalog view
function showCatalogView() {
    document.getElementById('detailWrapper').style.display = 'none';
    document.getElementById('catalogWrapper').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render detailed exhibit view
function renderDetailCard(ex) {
    const currentVar = ex.varDetails[ex.activeTerm] || Object.values(ex.varDetails)[0];
    const card = document.getElementById('detailCard');

    card.innerHTML = `
        <div class="exhibit-card-header">
            <div class="exhibit-badges-top">
                <span class="category-pill">${ex.category}</span>
            </div>
            <h2 class="exhibit-title">${ex.title}</h2>
        </div>

        <!-- EQUATION BOX -->
        <div class="equation-box">
            <div class="equation-render-area" id="katex-detail-main" title="Click any variable on the equation to inspect"></div>

            <div class="terms-row">
                ${ex.terms.map(t => `
                    <a href="#${ex.id}/${t.id}" class="term-pill ${t.id === ex.activeTerm ? 'active' : ''}" id="detail-term-pill-${t.id}">
                        <span class="dot" style="background: ${t.color}"></span>
                        <span id="detail-term-tex-${t.id}"></span>
                    </a>
                `).join('')}
            </div>
        </div>

        <!-- DECODER TEXT BOX -->
        <div class="decoder-box">
            <div class="decoder-text" id="detail-decoder-text">${ex.decoderHTML}</div>
        </div>

        <!-- VARIABLE DETAIL CARD -->
        <div class="var-detail-card">
            <div class="var-detail-top">
                <div class="var-symbol-badge" id="detail-var-symbol"></div>
                <div class="var-info">
                    <h4 id="detail-var-title">${currentVar ? currentVar.title : ''}</h4>
                    <p id="detail-var-desc">${currentVar ? currentVar.desc : ''}</p>
                    <div class="var-tags">
                        <span class="mini-tag" id="detail-var-tag1">${currentVar ? currentVar.tag1 : ''}</span>
                        <span class="mini-tag" id="detail-var-tag2">${currentVar ? currentVar.tag2 : ''}</span>
                    </div>
                </div>
            </div>
            <div class="var-divider"></div>
            <div class="var-narrative" id="detail-var-narrative">${currentVar ? currentVar.narrative : ''}</div>
        </div>
    `;

    // Render equation in main render area with interactive variable tags
    safeRenderMath(generateExhibitTex(ex, ex.activeTerm), 'katex-detail-main');

    // Attach click listener for equation rendered area
    const mainEqEl = document.getElementById('katex-detail-main');
    if (mainEqEl) {
        mainEqEl.addEventListener('click', (e) => {
            const termEl = e.target.closest('[data-term]');
            if (termEl && currentActiveExhibit) {
                const termId = termEl.getAttribute('data-term');
                if (termId) {
                    navigateTo(`#${currentActiveExhibit.id}/${termId}`);
                }
            }
        });
    }

    // Render term symbols inside pills
    ex.terms.forEach(t => {
        const coloredTex = `\\textcolor{${t.color}}{${t.symbol}}`;
        safeRenderMath(coloredTex, `detail-term-tex-${t.id}`);
    });

    if (currentVar) {
        safeRenderMath(currentVar.symbol, 'detail-var-symbol');
    }
}

// Update active term inside open exhibit detail dynamically
function updateDetailTerm(termId) {
    if (!currentActiveExhibit) return;
    const ex = currentActiveExhibit;
    ex.activeTerm = termId;
    const currentVar = ex.varDetails[termId];
    if (!currentVar) return;

    // Re-render main equation with updated active variable selection
    safeRenderMath(generateExhibitTex(ex, termId), 'katex-detail-main');

    // Update term pills active state
    ex.terms.forEach(t => {
        const pill = document.getElementById(`detail-term-pill-${t.id}`);
        if (pill) {
            if (t.id === termId) pill.classList.add('active');
            else pill.classList.remove('active');
        }
    });

    // Update decoder active phrase
    const decoder = document.getElementById('detail-decoder-text');
    if (decoder) {
        decoder.querySelectorAll('.phrase').forEach(span => {
            if (span.getAttribute('data-term') === termId) {
                span.classList.add('active');
                span.classList.add('phrase-boxed');
            } else {
                span.classList.remove('active');
                span.classList.remove('phrase-boxed');
            }
        });
    }

    // Update variable detail card content
    document.getElementById('detail-var-title').innerText = currentVar.title;
    document.getElementById('detail-var-desc').innerText = currentVar.desc;
    document.getElementById('detail-var-tag1').innerText = currentVar.tag1;
    document.getElementById('detail-var-tag2').innerText = currentVar.tag2;
    document.getElementById('detail-var-narrative').innerText = currentVar.narrative;

    safeRenderMath(currentVar.symbol, 'detail-var-symbol');
}

// URL Hash Router
function handleHashRouting() {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (!rawHash || rawHash === '' || rawHash === 'catalog') {
        showCatalogView();
        return;
    }

    const parts = rawHash.split('/');
    const exhibitId = parts[0];
    const termId = parts[1];

    const ex = exhibits.find(e => e.id === exhibitId);
    if (ex) {
        if (currentActiveExhibit && currentActiveExhibit.id === exhibitId && termId) {
            updateDetailTerm(termId);
        } else {
            openExhibitDetail(exhibitId, termId);
        }
    } else {
        showCatalogView();
    }
}

window.addEventListener('hashchange', handleHashRouting);

// Load equation datasets from JSON
async function initApp() {
    try {
        const response = await fetch('./data/equations.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        exhibits = await response.json();
    } catch (err) {
        console.warn('Could not fetch equations.json via fetch API, utilizing static dataset.', err);
    }

    renderSquareGrid();
    handleHashRouting();
}

window.addEventListener('DOMContentLoaded', () => {
    initApp();
});
