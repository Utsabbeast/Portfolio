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
    const VIDEO_SOURCES = {
        bg: [
            "https://res.cloudinary.com/da8mnqeej/video/upload/v1781383592/SideMain1_ijqmdu.webm",
            "https://res.cloudinary.com/da8mnqeej/video/upload/v1781436478/SideMain2_pr7cyh.webm",
            "https://res.cloudinary.com/da8mnqeej/video/upload/v1781436425/SideMain3_plnu0i.webm"
        ],
        inspect: [
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1778603333/Top1_mwmsly.webm",
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1778603762/Top2_wvttwx.webm",
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1778603519/Top3_bhrqvp.webm"
        ],
        inspect_enter: [
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1781185826/Enter_1_fdvmw0.webm",
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1781185827/Enter_2_aq9sfl.webm",
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1781185827/Enter_3_yy1trl.webm"
        ],
        inspect_exit: [
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1781186834/Enter_1R_kr5wg6.webm",
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1781186879/Enter_2R_hxx1cd.webm",
            "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1781186876/Enter_3R_ju957c.webm"
        ],
        transition: {
            "0-1": "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1778604414/Page_1_2_gxhyz6.webm",
            "1-2": "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1778603951/Page_2_3_sbtw0v.webm",
            "1-0": "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1778604335/Page_2_1_twowyt.webm",
            "2-1": "https://res.cloudinary.com/da8mnqeej/video/upload/q_auto,f_auto/v1778603782/Page_3_2mp4_q6u9fg.webm"
        }
    };

    const PAGE_DATA = [
        {
            id: 'p1',
            templateId: 'tpl-p1',
            label: 'PAGE 01 — PROFILE',
        },
        {
            id: 'p2',
            templateId: 'tpl-p2',
            label: 'PAGE 02 — OPERATIONS',
        },
        {
            id: 'p3',
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
    let hasInteracted = isSoundAllowed();

    function isSoundAllowed() {
        try {
            return localStorage.getItem('soundAllowed') === 'true';
        } catch (e) {
            console.warn("Storage access restricted. Defaulting sound to true.", e);
            return true;
        }
    }



    function handleFirstInteraction() {
        if (!hasInteracted) {
            hasInteracted = true;
            const vBg = getBgVideo();
            if (vBg && isSoundAllowed()) {
                vBg.muted = false;
                vBg.volume = 1.0;
                vBg.play().catch(() => {});
            }
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
        }
    }
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    /* ─────────── HELPERS ─────────── */

    function getBgVideo() {
        return document.getElementById('vid-bg');
    }

    function showVideo(vid) {
        if (!vid) return;
        vid.classList.add('visible');
        if (vid.tagName && vid.tagName.toLowerCase() === 'video') {
            vid.play().catch(() => { });
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
    let blinkTimeout = null;
    function updateEndButton() {
        if (currentPage === 2 && state === 'normal') {
            site.classList.add('page3-normal');
            if (endNormalBtn && !endNormalBtn.classList.contains('blink-active')) {
                endNormalBtn.classList.add('blink-active');
                clearTimeout(blinkTimeout);
                blinkTimeout = setTimeout(() => {
                    endNormalBtn.classList.remove('blink-active');
                }, 5000);
            }
        } else {
            site.classList.remove('page3-normal');
            if (endNormalBtn) {
                endNormalBtn.classList.remove('blink-active');
                clearTimeout(blinkTimeout);
            }
        }
    }

    /* ─────────── INITIALISE ─────────── */
    function init() {
        loadPanels(0);
        updatePageMeta(0);
        const v0 = getBgVideo();
        if (v0) {
            v0.src = VIDEO_SOURCES.bg[0];
            v0.load();
            v0.muted = !isSoundAllowed();
            showVideo(v0);
            v0.play().then(() => console.log('v0 play success')).catch((err) => console.error('v0 play error:', err));
        }
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

        const vBg = getBgVideo();
        if (vBg) {
            vBg.pause();
            hideVideo(vBg);
        }

        const transitionKey = `${currentPage}-${nextIdx}`;
        const transitionUrl = VIDEO_SOURCES.transition[transitionKey];
        const vidTransition = document.getElementById('vid-transition');

        if (vidTransition && transitionUrl) {
            vidTransition.src = transitionUrl;
            vidTransition.load();
            safeSeek(vidTransition, 0);
            vidTransition.muted = !isSoundAllowed();
            showVideo(vidTransition);

            // Preload next background video while transition plays
            if (vBg) {
                vBg.src = VIDEO_SOURCES.bg[nextIdx];
                vBg.load();
            }

            vidTransition.play().catch((err) => {
                console.warn("Transition play failed, fallback immediately:", err);
                afterTransition();
            });

            function afterTransition() {
                vidTransition.removeEventListener('ended', afterTransition);
                hideVideo(vidTransition);
                vidTransition.removeAttribute('src');
                vidTransition.load();

                currentPage = nextIdx;
                updatePageMeta(currentPage);
                loadPanels(currentPage);

                if (vBg) {
                    vBg.muted = !isSoundAllowed();
                    showVideo(vBg);
                    vBg.play().then(() => console.log('vBg play success page 2')).catch((err) => console.error('vBg play error page 2:', err));
                }

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

            if (vBg) {
                vBg.src = VIDEO_SOURCES.bg[nextIdx];
                vBg.load();
            }

            currentPage = nextIdx;
            updatePageMeta(currentPage);
            loadPanels(currentPage);

            if (vBg) {
                vBg.muted = !isSoundAllowed();
                showVideo(vBg);
                vBg.play().then(() => console.log('vBg fallback play success page 2')).catch((err) => console.error('vBg fallback play error page 2:', err));
            }

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

        state = 'inspect_transition';
        updateArrows();
        updateEndButton();
        updateVerb();

        // Pause background video
        const vBg = getBgVideo();
        if (vBg) vBg.pause();

        const imgEnt = document.getElementById(`img-inspect-entry-${currentPage}`);
        const vidInspectEnt = document.getElementById('vid-inspect');
        const vidInspectTrans = document.getElementById('vid-inspect-transition');

        // Preload looping video
        if (vidInspectEnt) {
            vidInspectEnt.src = VIDEO_SOURCES.inspect[currentPage];
            vidInspectEnt.load();
        }

        if (vidInspectTrans && VIDEO_SOURCES.inspect_enter[currentPage]) {
            vidInspectTrans.src = VIDEO_SOURCES.inspect_enter[currentPage];
            vidInspectTrans.load();
            vidInspectTrans.muted = !soundAllowed;
            safeSeek(vidInspectTrans, 0);
            vidInspectTrans.volume = 1.0;
            showVideo(vidInspectTrans);

            vidInspectTrans.play().catch(() => {
                finishEnterInspect(imgEnt, vidInspectEnt, soundAllowed);
            });

            vidInspectTrans.onended = () => {
                hideVideo(vidInspectTrans);
                vidInspectTrans.removeAttribute('src');
                vidInspectTrans.load();
                vidInspectTrans.onended = null;
                finishEnterInspect(imgEnt, vidInspectEnt, soundAllowed);
            };
        } else {
            finishEnterInspect(imgEnt, vidInspectEnt, soundAllowed);
        }
    }

    function finishEnterInspect(imgEnt, vidInspectEnt, soundAllowed) {
        if (imgEnt) {
            if (!imgEnt.style.backgroundImage) {
                const src = imgEnt.getAttribute('data-src');
                if (src) {
                    imgEnt.style.backgroundImage = `url('${src}')`;
                }
            }
            showVideo(imgEnt);
        }

        if (vidInspectEnt) {
            vidInspectEnt.muted = !soundAllowed;
            safeSeek(vidInspectEnt, 0);
            vidInspectEnt.volume = 1.0;
            showVideo(vidInspectEnt);
            vidInspectEnt.play().catch(() => { });
        }

        site.classList.add('inspect-active');
        state = 'inspect';
        updateArrows();
        updateEndButton();
        updateVerb();
    }

    /* ─────────── INSPECT → NORMAL (ENTER again) ─────────── */
    function exitInspect() {
        if (state !== 'inspect') return;
        playSelect();

        const soundAllowed = isSoundAllowed();

        state = 'inspect_transition';
        updateArrows();
        updateEndButton();
        updateVerb();

        site.classList.remove('inspect-active');

        const vidInspectEnt = document.getElementById('vid-inspect');
        if (vidInspectEnt) {
            hideVideo(vidInspectEnt);
            vidInspectEnt.pause();
            vidInspectEnt.removeAttribute('src');
            vidInspectEnt.load();
        }

        const imgEnt = document.getElementById(`img-inspect-entry-${currentPage}`);
        if (imgEnt) hideVideo(imgEnt);

        const vidInspectTrans = document.getElementById('vid-inspect-transition');
        const vBg = getBgVideo();

        if (vidInspectTrans && VIDEO_SOURCES.inspect_exit[currentPage]) {
            vidInspectTrans.src = VIDEO_SOURCES.inspect_exit[currentPage];
            vidInspectTrans.load();
            vidInspectTrans.muted = !soundAllowed;
            safeSeek(vidInspectTrans, 0);
            vidInspectTrans.volume = 1.0;
            showVideo(vidInspectTrans);

            vidInspectTrans.play().catch(() => {
                finishExitInspect(vBg, vidInspectTrans);
            });

            vidInspectTrans.onended = () => {
                finishExitInspect(vBg, vidInspectTrans);
            };
        } else {
            finishExitInspect(vBg, vidInspectTrans);
        }
    }

    function finishExitInspect(vBg, vidInspectTrans) {
        if (vidInspectTrans) {
            hideVideo(vidInspectTrans);
            vidInspectTrans.removeAttribute('src');
            vidInspectTrans.load();
            vidInspectTrans.onended = null;
        }

        // Resume background video
        if (vBg) vBg.play().catch(() => { });

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
    // (Dots are now just visual page indicators, click navigation removed)

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
