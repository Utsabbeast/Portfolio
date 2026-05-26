(function () {
    function safeSeek(mediaEl, time = 0) {
        if (!mediaEl) return;
        try {
            if (Math.abs(mediaEl.currentTime - time) > 0.1) {
                mediaEl.currentTime = time;
            }
        } catch (e) {
            console.warn("Failed to seek media element:", e);
        }
    }

    /* --- Cinematic Viewport Scaler (for standalone rendering) --- */
    function applyFolioScaler() {
        const site = document.getElementById('site');
        if (!site) return;

        // If rendered inside a scaled iframe (parent handles scaling), we skip it.
        // This avoids "double scaling" which breaks coordinates and visibility.
        if (window.self !== window.top) {
            site.style.transform = 'scale(1)';
            return;
        }

        const winW = window.innerWidth;
        const winH = window.innerHeight;
        let scale = Math.min(winW / 1920, winH / 1080);
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
    const site = document.getElementById('site');
    const paperCard = document.getElementById('paper-card');
    const pageLabel = document.getElementById('page-label');
    const hintLeft = document.getElementById('hint-left');
    const hintRight = document.getElementById('hint-right');
    const dots = document.querySelectorAll('.dot');
    const endNormalBtn = document.getElementById('end-normal-btn');
    const cvOverlay = document.getElementById('cv-popup-overlay');
    const cvFrame = document.getElementById('cv-frame');

    /* ─────────── STATE ─────────── */
    let state = 'normal';
    let currentPage = 0;  // 0, 1, 2
    let hasInteracted = false;

    function isSoundAllowed() {
        try {
            return localStorage.getItem('soundAllowed') === 'true';
        } catch (e) {
            console.warn("Storage access restricted. Defaulting sound to true.", e);
            return true;
        }
    }

    function playBgVideoAudio(pageIdx) {
        if (!isSoundAllowed()) return;
        const vid = getBgVideo(pageIdx);
        if (!vid) return;

        if (!hasInteracted) {
            vid.muted = true;
            return;
        }

        vid.muted = false;
        vid.volume = 0;
        fadeInAudio(vid, 0.5, 1000); // Fade in to 0.5 volume over 1s
    }

    function stopBgVideoAudio(pageIdx) {
        const vid = getBgVideo(pageIdx);
        if (!vid) return;

        fadeOutAudio(vid, 800, () => {
            vid.muted = true;
        });
    }

    function handleFirstInteraction() {
        if (!hasInteracted) {
            hasInteracted = true;
            playBgVideoAudio(currentPage);
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
        }
    }
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    /* ─────────── HELPERS ─────────── */

    function getBgVideo(pageIdx) {
        return document.getElementById(PAGE_DATA[pageIdx].bgVideoId);
    }

    function showVideo(vid) {
        if (!vid) return;
        vid.classList.add('visible');
        if (vid.tagName && vid.tagName.toLowerCase() === 'video') {
            vid.play().catch(() => {});
        }
    }
    function hideVideo(vid) {
        if (!vid) return;
        vid.classList.remove('visible');
        if (vid.tagName && vid.tagName.toLowerCase() === 'video') {
            vid.pause();
        }
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
        const v0 = getBgVideo(0);
        if (v0) {
            v0.muted = true; // Always mute background atmosphere videos to guarantee autoplay
            showVideo(v0);
        }
        playBgVideoAudio(0);
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

        stopBgVideoAudio(currentPage);
        hideVideo(getBgVideo(currentPage));

        const transitionId = `vid-transition-${currentPage}-${nextIdx}`;
        const vidTransition = document.getElementById(transitionId);

        if (vidTransition) {
            safeSeek(vidTransition, 0);
            vidTransition.muted = true; // Always mute transition videos to guarantee autoplay
            showVideo(vidTransition);
            vidTransition.play().catch((err) => {
                console.warn("Transition play failed, fallback immediately:", err);
                afterTransition();
            });

            function afterTransition() {
                vidTransition.removeEventListener('ended', afterTransition);
                hideVideo(vidTransition);

                currentPage = nextIdx;
                updatePageMeta(currentPage);
                loadPanels(currentPage);
                const vNext = getBgVideo(currentPage);
                if (vNext) {
                    vNext.muted = true; // Always mute background atmosphere videos to guarantee autoplay
                    showVideo(vNext);
                }
                playBgVideoAudio(currentPage);

                site.classList.remove('transitioning');
                state = 'normal';
                updateArrows();
                updateEndButton();
            }

            vidTransition.addEventListener('ended', afterTransition, { once: true });

            // Fallback: wait for the video to naturally 'ended', with a generous 10s timeout just in case it hangs
            setTimeout(() => {
                if (state === 'transitioning') afterTransition();
            }, 10000);
        } else {
            // Fallback immediately if transition video is entirely missing
            stopBgVideoAudio(currentPage);
            currentPage = nextIdx;
            updatePageMeta(currentPage);
            loadPanels(currentPage);
            showVideo(getBgVideo(currentPage));
            playBgVideoAudio(currentPage);

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

        const soundAllowed = isSoundAllowed();

        state = 'inspect';
        updateArrows();
        updateEndButton();
        updateVerb();

        // Pause background video
        const vBg = getBgVideo(currentPage);
        if (vBg) vBg.pause();
        stopBgVideoAudio(currentPage);

        // Show full-screen image (bottom layer)
        const imgEnt = document.getElementById(`img-inspect-entry-${currentPage}`);
        if (imgEnt) {
            if (!imgEnt.style.backgroundImage) {
                const src = imgEnt.getAttribute('data-src');
                if (src) {
                    imgEnt.style.backgroundImage = `url('${src}')`;
                }
            }
            showVideo(imgEnt);
        }

        // Show looping video and fade audio in
        const vidInspectEnt = document.getElementById(`vid-inspect-entry-${currentPage}`);
        if (vidInspectEnt) {
            vidInspectEnt.muted = !soundAllowed;
            safeSeek(vidInspectEnt, 0);
            vidInspectEnt.volume = 0;
            showVideo(vidInspectEnt);
            vidInspectEnt.play().catch(() => { });
            if (soundAllowed) {
                fadeInAudio(vidInspectEnt, 1.0, 1000);
            }
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

        // Resume background video
        const vBg = getBgVideo(currentPage);
        if (vBg) vBg.play().catch(() => {});
        playBgVideoAudio(currentPage);

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
        stopBgVideoAudio(currentPage);

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
    window.openCV = function () {
        playSelect2();
        if (cvOverlay) {
            cvOverlay.style.display = 'flex';
        }
        // Always ensure the PDF is loaded when opening
        if (cvFrame) {
            cvFrame.src = "/static/images/UT_CV_MAIN.pdf";
        }
    }

    window.closeCV = function () {
        playSelect();
        if (cvOverlay) {
            cvOverlay.style.display = 'none';
        }
    }

    /* ─────────── KEYBOARD ─────────── */
    const selectSound = document.getElementById('selectSound');
    const select2Sound = document.getElementById('select2Sound');
    function playSelect() {
        if (selectSound) {
            safeSeek(selectSound, 0);
            selectSound.play().catch(() => { });
        }
    }

    function playSelect2() {
        if (select2Sound) {
            safeSeek(select2Sound, 0);
            select2Sound.play().catch(() => { });
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
                if (state === 'normal') { enterInspect(); return; }
                if (state === 'inspect') { exitInspect(); return; }
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
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

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
            if (state === 'normal') { enterInspect(); }
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
