(function () {
    /* --- Cinematic Viewport Scaler (for standalone rendering) --- */
    function applyFolioScaler() {
        const site = document.getElementById('site');
        if (!site) return;
        
        // If rendered inside a resized iframe, innerWidth will already be 1440
        // and scale evaluates to 1. If rendered standalone, it correctly scales.
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        let scale = Math.min(winW / 1440, winH / 810);
        site.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', applyFolioScaler);
    window.addEventListener('orientationchange', () => setTimeout(applyFolioScaler, 100));
    applyFolioScaler(); // Initial scale on load

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

        playSelect2();

        state = 'transitioning';
        site.classList.add('transitioning');
        updateArrows();
        updateEndButton();

        hideVideo(getBgVideo(currentPage));

        const transitionId = `vid-transition-${currentPage}-${nextIdx}`;
        const vidTransition = document.getElementById(transitionId);

        if (vidTransition) {
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
        } else {
            // Fallback immediately if transition video is entirely missing
            currentPage = nextIdx;
            updatePageMeta(currentPage);
            loadPanels(currentPage);
            showVideo(getBgVideo(currentPage));

            site.classList.remove('transitioning');
            state = 'normal';
            updateArrows();
            updateEndButton();
        }
    }

    /* ─────────── NORMAL → INSPECT (ENTER) ─────────── */
    function enterInspect() {
        if (state !== 'normal') return;
        playSelect();

        state = 'inspect';
        updateArrows();
        updateEndButton();
        updateVerb();

        // Show full-screen image (bottom layer)
        const imgEnt = document.getElementById(`img-inspect-entry-${currentPage}`);
        if (imgEnt) showVideo(imgEnt);

        // Show looping video and fade audio in
        const vidInspectEnt = document.getElementById(`vid-inspect-entry-${currentPage}`);
        if (vidInspectEnt) {
            vidInspectEnt.currentTime = 0;
            vidInspectEnt.volume = 0;
            showVideo(vidInspectEnt);
            vidInspectEnt.play().catch(() => {});
            fadeInAudio(vidInspectEnt, 1.0, 1000);
        }

        site.classList.add('inspect-active');
    }

    /* ─────────── INSPECT → NORMAL (ENTER again) ─────────── */
    function exitInspect() {
        if (state !== 'inspect') return;
        playSelect();

        site.classList.remove('inspect-active');

        const vidInspectEnt = document.getElementById(`vid-inspect-entry-${currentPage}`);
        if (vidInspectEnt) {
            fadeOutAudio(vidInspectEnt, 800, () => {
                hideVideo(vidInspectEnt);
                vidInspectEnt.pause();
            });
        }

        const imgEnt = document.getElementById(`img-inspect-entry-${currentPage}`);
        if (imgEnt) hideVideo(imgEnt);

        state = 'normal';
        updateArrows();
        updateEndButton();
        updateVerb();
    }

    /* ─────────── AUDIO FADE HELPERS ─────────── */
    function fadeInAudio(el, targetVol, durationMs) {
        const steps = 30;
        const stepTime = durationMs / steps;
        const increment = targetVol / steps;
        let current = 0;
        const timer = setInterval(() => {
            current = Math.min(current + increment, targetVol);
            el.volume = current;
            if (current >= targetVol) clearInterval(timer);
        }, stepTime);
    }

    function fadeOutAudio(el, durationMs, onDone) {
        const steps = 30;
        const stepTime = durationMs / steps;
        const decrement = el.volume / steps;
        const timer = setInterval(() => {
            el.volume = Math.max(0, el.volume - decrement);
            if (el.volume <= 0) {
                clearInterval(timer);
                if (onDone) onDone();
            }
        }, stepTime);
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
                site.classList.add('credits-finished');
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
        playSelect2();
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
    const select2Sound = document.getElementById('select2Sound');
    function playSelect() {
        if (selectSound) {
            selectSound.currentTime = 0;
            selectSound.play().catch(() => {});
        }
    }
    
    function playSelect2() {
        if (select2Sound) {
            select2Sound.currentTime = 0;
            select2Sound.play().catch(() => {});
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

    /* ─────────── TOUCH / SWIPE ─────────── */
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});

    function handleSwipe() {
        if (state !== 'normal') return;
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swipe Left -> Next Page
            if (currentPage < PAGE_DATA.length - 1) {
                navigateTo(currentPage + 1);
            }
        } else if (touchEndX > touchStartX + swipeThreshold) {
            // Swipe Right -> Prev Page
            if (currentPage > 0) {
                navigateTo(currentPage - 1);
            }
        }
    }

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
