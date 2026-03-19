(function () {
    /* ─────────── CONFIG ─────────── */
    const PAGE_DATA = [
        {
            id: 'p1',
            bgVideoId: 'vid-p1',
            templateId: 'tpl-p1',
            label: 'PAGE 01 — PROFILE',
        },
        {
            id: 'p2',
            bgVideoId: 'vid-p2',
            templateId: 'tpl-p2',
            label: 'PAGE 02 — OPERATIONS',
        },
        {
            id: 'p3',
            bgVideoId: 'vid-p3',
            templateId: 'tpl-p3',
            label: 'PAGE 03 — CREDENTIALS',
        },
    ];

    /* ─────────── ELEMENTS ─────────── */
    const site           = document.getElementById('site');
    const paperCard      = document.getElementById('paper-card');
    const vidTransition  = document.getElementById('vid-transition');
    const vidInspectEnt  = document.getElementById('vid-inspect-entry');
    const pageLabel      = document.getElementById('page-label');
    const hintLeft       = document.getElementById('hint-left');
    const hintRight      = document.getElementById('hint-right');
    const dots           = document.querySelectorAll('.dot');
    const endNormalBtn   = document.getElementById('end-normal-btn');
    const cvOverlay    = document.getElementById('cv-popup-overlay');
    const cvFrame      = document.getElementById('cv-frame');

    /* ─────────── STATE ─────────── */
    let state       = 'normal';
    let currentPage = 0;  // 0, 1, 2

    /* ─────────── HELPERS ─────────── */

    function getBgVideo(pageIdx) {
        return document.getElementById(PAGE_DATA[pageIdx].bgVideoId);
    }

    function showVideo(vid) {
        vid.classList.add('visible');
    }
    function hideVideo(vid) {
        vid.classList.remove('visible');
    }

    // Load page content into paperCard and reset scroll
    function loadPanels(pageIdx) {
        const tpl = document.getElementById(PAGE_DATA[pageIdx].templateId);
        paperCard.innerHTML = '';
        const clone = tpl.content.cloneNode(true);
        paperCard.appendChild(clone);
        const doc = paperCard.querySelector('#page-doc');
        if (doc) {
            doc.scrollTop = 0;
        }
    }

    // Update page label and dots
    function updatePageMeta(pageIdx) {
        pageLabel.textContent = PAGE_DATA[pageIdx].label;
        dots.forEach((d, i) => d.classList.toggle('active', i === pageIdx));
    }

    // Update arrow hints (only visible in normal mode)
    function updateArrows() {
        if (state !== 'normal') {
            hintLeft.classList.remove('visible');
            hintRight.classList.remove('visible');
            return;
        }
        hintLeft.classList.toggle('visible', currentPage > 0);
        hintRight.classList.toggle('visible', currentPage < PAGE_DATA.length - 1);
    }

    // Show/hide END button — only on page 3, only in normal mode
    function updateEndButton() {
        if (currentPage === 2 && state === 'normal') {
            site.classList.add('page3-normal');
        } else {
            site.classList.remove('page3-normal');
        }
    }

    /* ─────────── INITIALISE ─────────── */
    function init() {
        loadPanels(0);
        updatePageMeta(0);
        showVideo(getBgVideo(0));
        updateArrows();
        updateEndButton();
    }

    /* ─────────── NORMAL → TRANSITION → NEXT PAGE ─────────── */
    function navigateTo(nextIdx) {
        if (state !== 'normal') return;
        if (nextIdx < 0 || nextIdx >= PAGE_DATA.length) return;
        if (nextIdx === currentPage) return;

        state = 'transitioning';
        site.classList.add('transitioning');
        updateArrows();
        updateEndButton();

        hideVideo(getBgVideo(currentPage));

        vidTransition.currentTime = 0;
        showVideo(vidTransition);
        vidTransition.play().catch(() => {});

        function afterTransition() {
            vidTransition.removeEventListener('ended', afterTransition);
            hideVideo(vidTransition);

            currentPage = nextIdx;
            updatePageMeta(currentPage);
            loadPanels(currentPage);
            showVideo(getBgVideo(currentPage));

            site.classList.remove('transitioning');
            state = 'normal';
            updateArrows();
            updateEndButton();
        }

        vidTransition.addEventListener('ended', afterTransition, { once: true });

        // Fallback: skip after 2s if no video
        setTimeout(() => {
            if (state === 'transitioning') afterTransition();
        }, 2000);
    }

    /* ─────────── NORMAL → INSPECT (ENTER) ─────────── */
    function enterInspect() {
        if (state !== 'normal') return;
        playSelect();

        state = 'inspect-entry';
        updateArrows();
        updateEndButton();

        vidInspectEnt.currentTime = 0;
        showVideo(vidInspectEnt);
        vidInspectEnt.play().catch(() => {});

        function afterEntry() {
            vidInspectEnt.removeEventListener('ended', afterEntry);
            hideVideo(vidInspectEnt);

            state = 'inspect';
            site.classList.add('inspect-active');
            updateArrows();
            updateEndButton();
            updateVerb();
        }

        vidInspectEnt.addEventListener('ended', afterEntry, { once: true });

        // Fallback: skip after 2s if no video
        setTimeout(() => {
            if (state === 'inspect-entry') afterEntry();
        }, 2000);
    }

    /* ─────────── INSPECT → NORMAL (ENTER again) ─────────── */
    function exitInspect() {
        if (state !== 'inspect') return;
        playSelect();

        site.classList.remove('inspect-active');
        state = 'normal';
        updateArrows();
        updateEndButton();
        updateVerb();
    }

    /* ─────────── FINAL CREDITS ─────────── */
    function startCredits() {
        if (state === 'credits') return;

        // Exit inspect first if active
        if (state === 'inspect') {
            site.classList.remove('inspect-active');
        }

        state = 'credits';
        site.classList.add('credits-active');
        site.classList.remove('page3-normal');

        // Pause all videos
        const allVids = site.querySelectorAll('video');
        allVids.forEach(v => {
            v.pause();
            v.classList.remove('visible');
        });

        playSelect();

        const scroll = document.getElementById('credits-scroll');
        if (scroll) {
            scroll.onanimationend = () => {
                site.classList.add('credits-ending');
                setTimeout(() => {
                    // Show final ratings screen on solid black background
                    document.body.innerHTML = `
                        <div style="background:#000; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; animation: fadeIn 2s forwards; position: relative; overflow: hidden;">
                            <div style="font-family:'Courier New', monospace; font-size:10px; letter-spacing:5px; margin-bottom:24px; color:rgba(255,255,255,0.2); font-weight: bold; text-transform: uppercase;">SESSION TERMINATED</div>
                            <div style="font-family:'Courier New', monospace; font-size:18px; letter-spacing:4px; margin-bottom:40px; color:#fff; text-transform: uppercase;">THANK YOU FOR VISITING</div>
                            <a href="https://forms.gle/SYom1ioTanGXSddz9" target="_blank" 
                               style="font-family:'Courier New', monospace; color:rgba(255, 255, 255, 0.45); text-decoration:none; border: 1px solid rgba(180, 0, 0, 0.4); padding: 7px 30px; font-size:10px; letter-spacing:3px; transition:all 0.3s ease; background:rgba(0,0,0,0.5); display:inline-block; border-radius: 3px; backdrop-filter: blur(8px); text-transform: uppercase; filter: url(#handDrawnNoise);" 
                               onmouseover="this.style.color='#ffffff';this.style.borderColor='#ff3e3e';this.style.background='rgba(180, 0, 0, 0.3)';" 
                               onmouseout="this.style.color='rgba(255, 255, 255, 0.45)';this.style.borderColor='rgba(180, 0, 0, 0.4)';this.style.background='rgba(0,0,0,0.5)';"
                               onclick="playSelect()">
                               RATE MY PORTFOLIO
                            </a>
                            <style>
                                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                            </style>
                        </div>
                    `;
                }, 2000);
            };
        }
    }

    function updateVerb() {
        const verb = document.getElementById('inspect-verb');
        if (verb) {
            verb.textContent = (state === 'inspect') ? 'EXIT' : 'INSPECT';
        }
    }

    /* ─────────── CV POPUP ─────────── */
    window.openCV = function() {
        playSelect();
        if (cvOverlay) {
            cvOverlay.style.display = 'flex';
        }
        // Always ensure the PDF is loaded when opening
        if (cvFrame) {
             cvFrame.src = "/static/images/UT_CV_MAIN.pdf"; 
        }
    }

    window.closeCV = function() {
        if (!cvOverlay) return;
        cvOverlay.style.display = 'none';
    }

    /* ─────────── KEYBOARD ─────────── */
    const selectSound = document.getElementById('selectSound');
    function playSelect() {
        if (selectSound) {
            selectSound.currentTime = 0;
            selectSound.play().catch(() => {});
        }
    }

    document.addEventListener('keydown', (e) => {
        // Shift + Enter = End Sequence
        if (e.shiftKey && e.key === 'Enter') {
            startCredits();
            return;
        }

        switch (e.key) {
            case 'Enter':
                if (state === 'normal')  { enterInspect(); return; }
                if (state === 'inspect') { exitInspect();  return; }
                break;

            case 'ArrowRight':
                if (state === 'normal' && currentPage < PAGE_DATA.length - 1) {
                    navigateTo(currentPage + 1);
                }
                break;

            case 'ArrowLeft':
                if (state === 'normal' && currentPage > 0) {
                    navigateTo(currentPage - 1);
                }
                break;
        }
    });

    /* ─────────── MOUSE INTERACTIVE ─────────── */

    // 1. Navigation Dots
    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            if (state === 'normal' && idx !== currentPage) {
                navigateTo(idx);
            }
        });
    });

    // 2. Arrow Hints
    if (hintLeft) {
        hintLeft.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state === 'normal' && currentPage > 0) {
                navigateTo(currentPage - 1);
            }
        });
    }
    if (hintRight) {
        hintRight.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state === 'normal' && currentPage < PAGE_DATA.length - 1) {
                navigateTo(currentPage + 1);
            }
        });
    }

    // 3. Inspect Toggle (Hint bar trigger)
    const inspectTrigger = document.querySelector('.inspect-trigger');
    const inspectGlass = document.getElementById('inspect-glass');

    if (inspectTrigger) {
        inspectTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state === 'normal')  { enterInspect(); }
            else if (state === 'inspect') { exitInspect(); }
        });
    }

    if (inspectGlass) {
        inspectGlass.addEventListener('click', () => {
            if (state === 'inspect') {
                exitInspect();
            }
        });
    }

    // 4. END Button (normal mode, page 3)
    if (endNormalBtn) {
        endNormalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startCredits();
        });
    }

    // 5. Click site to enter inspect (normal mode only)
    site.addEventListener('click', (e) => {
        if (state === 'credits') return;

        // Ignore interactive elements
        if (
            e.target.closest('.dot') ||
            e.target.closest('.arrow-hint') ||
            e.target.closest('#paper-card') ||
            e.target.closest('#end-btn-container')
        ) return;

        if (state === 'normal') {
            enterInspect();
        }
    });

    // 6. Global Link Click Sound
    document.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
            playSelect();
        }
    });

    /* ─────────── START ─────────── */
    init();

})();
