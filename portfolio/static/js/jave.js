// --- Cinematic Viewport Scaler ---
function applyScaler() {
    const site = document.querySelector('.site');
    if (!site) return;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    
    // Check if force-landscape is active (portrait mobile without native lock)
    let isForced = document.body.classList.contains('force-landscape');
    
    let availW = isForced ? winH : winW;
    let availH = isForced ? winW : winH;
    
    let scale = Math.min(availW / 1440, availH / 810);
    
    site.style.transform = isForced 
        ? `rotate(90deg) scale(${scale})` 
        : `scale(${scale})`;
}
window.addEventListener('resize', applyScaler);
window.addEventListener('orientationchange', () => setTimeout(applyScaler, 100));

document.addEventListener("DOMContentLoaded", () => {
    applyScaler();

    const clickSound = new Audio("/static/images/Select.mp3");
    clickSound.volume = 0.4;

    const steps = Array.from(document.querySelectorAll(".notebook-checkbox"));
    let currentIndex = 0;
    const bgRain = document.getElementById("bgRain");
    const stage = document.getElementById("cinemaStage");

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // --- Core Step Navigation ---
    function showStep(index) {
        if (index >= steps.length) {
            startCinemaSequence();
            return;
        }

        const step = steps[index];
        const action = step.dataset.action;
        const readLink = step.querySelector('.inline-terms-link');

        step.style.display = "flex";
        setTimeout(() => step.classList.add("show"), 50);

        if (readLink) {
            readLink.addEventListener("click", (e) => {
                clickSound.currentTime = 0;
                clickSound.play().catch(() => { });
            });
        }

        const onInteraction = (e) => {
            if (e.target.classList.contains('inline-terms-link')) return;

            clickSound.currentTime = 0;
            clickSound.play().catch(() => { });

            if (action === "sound" && bgRain) {
                bgRain.volume = 0.5;
                bgRain.play().catch(() => { });
            }
            if (action === "fullscreen") {
                document.documentElement.requestFullscreen?.().then(() => {
                    // Try to lock orientation on mobile
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(() => {
                            if (window.innerHeight > window.innerWidth) {
                                document.body.classList.add('force-landscape');
                            }
                        });
                    } else {
                        if (window.innerHeight > window.innerWidth) {
                            document.body.classList.add('force-landscape');
                        }
                    }
                }).catch(() => {
                    if (window.innerHeight > window.innerWidth) {
                        document.body.classList.add('force-landscape');
                    }
                });
            }

            step.classList.remove("show");
            step.removeEventListener("click", onInteraction);

            setTimeout(() => {
                step.style.display = "none";
                currentIndex++;
                showStep(currentIndex);
            }, 800);
        };

        step.addEventListener("click", onInteraction);
    }

    // Initial delay before first checkbox appears
    setTimeout(() => showStep(currentIndex), 1500);

    // --- Global Enter Key for Checkboxes ---
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const currentStep = steps[currentIndex];
            // Only trigger if a step is actually visible and we aren't in cinema mode yet
            if (currentStep && currentStep.classList.contains("show")) {
                currentStep.click();
            }
        }
    });

    // --- Cinema Sequence Controller ---
    let items = [];
    let currentItemIndex = 0;
    let cinemaTimer = null;
    let isCinemaInterrupted = false;
    let skipFolioActive = false;

    function startCinemaSequence(startIndex = 0) {
        if (!stage || skipFolioActive) return;
        isCinemaInterrupted = false;
        items = Array.from(stage.querySelectorAll(".cinema-item"));
        currentItemIndex = startIndex;
        stage.classList.remove("hidden");

        const skipBtn = document.getElementById("skip-to-folio");
        if (skipBtn) skipBtn.style.display = "block";

        playNext();
    }

    function playNext() {
        if (isCinemaInterrupted || skipFolioActive) return;
        if (currentItemIndex >= items.length) return;

        const item = items[currentItemIndex];

        if (bgRain) bgRain.style.opacity = "0";
        item.style.display = "block";
        
        // Slight delay ensures the element is rendered as block before CSS transition on opacity begins
        setTimeout(() => {
            if (isCinemaInterrupted || skipFolioActive) return;
            item.classList.add("show");
        }, 50);

        if (item.tagName.toLowerCase() === "iframe" || item.dataset.type === "iframe") {
            if (item.id === "shuri-iframe") {
                item.src = "/static/Shuri/Shuri.html";
                item.onload = () => {
                    if (isCinemaInterrupted || skipFolioActive) return;
                    setTimeout(() => {
                        if (isCinemaInterrupted || skipFolioActive) return;
                        item.contentWindow.postMessage("startShuri", "*");
                    }, 100);
                };
                cinemaTimer = setTimeout(() => {
                    if (isCinemaInterrupted || skipFolioActive) return;
                    item.classList.remove("show");
                    cinemaTimer = setTimeout(() => {
                        if (isCinemaInterrupted || skipFolioActive) return;
                        item.style.display = "none";
                        currentItemIndex++;
                        playNext();
                    }, 1500); // 1.5s fade out
                }, 16000);

            } else if (item.id === "folio-iframe") {
                item.src = item.getAttribute("data-src") || item.src;
                item.onload = () => {
                   if (item.contentWindow) {
                       item.focus();
                       item.contentWindow.focus();
                   }
                };
                const skipBtn = document.getElementById("skip-to-folio");
                if (skipBtn) skipBtn.style.display = "none";
            }
        }
        else if (item.tagName.toLowerCase() === "img" || item.dataset.type === "image") {
            cinemaTimer = setTimeout(() => {
                if (isCinemaInterrupted || skipFolioActive) return;
                item.classList.remove("show");
                cinemaTimer = setTimeout(() => {
                    if (isCinemaInterrupted || skipFolioActive) return;
                    item.style.display = "none";
                    currentItemIndex++;
                    playNext();
                }, 1500);
            }, 4000);
        }
        else if (item.tagName.toLowerCase() === "video" || item.dataset.type === "video") {
            if (bgRain && !bgRain.paused) {
                let fade = setInterval(() => {
                    if (isCinemaInterrupted || skipFolioActive) { clearInterval(fade); return; }
                    if (bgRain.volume > 0.05) { bgRain.volume -= 0.05; }
                    else { bgRain.pause(); clearInterval(fade); }
                }, 150);
            }

            item.currentTime = 0;
            item.play().catch(e => console.error("Video play error:", e));

            const enterBtn = document.getElementById("video-enter-btn");
            let enterShown = false;
            let keydownHandler = null;

            const onTimeUpdate = () => {
                if (isCinemaInterrupted || skipFolioActive) {
                    item.removeEventListener("timeupdate", onTimeUpdate);
                    return;
                }

                // Only show ENTER button for looping videos (Hand.mp4 has loop attr)
                if (item.loop && !enterShown && item.currentTime >= item.duration - 0.2 && item.duration > 0) {
                    enterShown = true;
                    if (enterBtn) {
                        enterBtn.classList.add("show");
                        
                        const proceedNext = () => {
                            const select2 = document.getElementById("select2Sound");
                            if (select2) {
                                select2.currentTime = 0;
                                select2.play().catch(() => {});
                            }
                            enterBtn.classList.remove("show");
                            enterBtn.removeEventListener("click", proceedNext);
                            if (keydownHandler) document.removeEventListener("keydown", keydownHandler);
                            item.removeEventListener("timeupdate", onTimeUpdate);
                            
                            item.classList.remove("show");
                            
                            cinemaTimer = setTimeout(() => {
                                if (isCinemaInterrupted || skipFolioActive) return;
                                item.style.display = "none";
                                item.pause();
                                currentItemIndex++;
                                playNext();
                            }, 1500);
                        };
                        
                        enterBtn.addEventListener("click", proceedNext);

                        keydownHandler = (e) => {
                            if (e.key === "Enter" && enterShown) {
                                e.preventDefault();
                                proceedNext();
                            }
                        };
                        document.addEventListener("keydown", keydownHandler);
                    } else {
                        item.removeEventListener("timeupdate", onTimeUpdate);
                        item.classList.remove("show");
                        cinemaTimer = setTimeout(() => {
                            if (isCinemaInterrupted || skipFolioActive) return;
                            item.style.display = "none";
                            item.pause();
                            currentItemIndex++;
                            playNext();
                        }, 1500);
                    }
                }
            };

            item.addEventListener("timeupdate", onTimeUpdate);

            // For non-first videos (walk.mp4 etc): auto-advance on end
            item.onended = () => {
                if (item.loop) {
                    // Hand.mp4 (has loop attr): loop until ENTER pressed
                    if (!enterShown) {
                        item.currentTime = 0;
                        item.play().catch(() => {});
                    }
                } else {
                    // All other videos: auto-advance
                    if (isCinemaInterrupted || skipFolioActive) return;
                    item.removeEventListener("timeupdate", onTimeUpdate);
                    item.classList.remove("show");
                    cinemaTimer = setTimeout(() => {
                        if (isCinemaInterrupted || skipFolioActive) return;
                        item.style.display = "none";
                        item.pause();
                        currentItemIndex++;
                        playNext();
                    }, 1500);
                }
            };
        }
    }

    // --- Skip to Folio ---
    window.skipToFolio = function () {
        skipFolioActive = true;
        isCinemaInterrupted = true;
        if (cinemaTimer) clearTimeout(cinemaTimer);

        // Hide the enter button if it's there
        const enterBtn = document.getElementById("video-enter-btn");
        if (enterBtn) {
            enterBtn.classList.remove("show");
        }

        // Hide any visible checkbox step
        steps.forEach(s => { s.classList.remove("show"); s.style.display = "none"; });

        if (!stage) return;
        items = Array.from(stage.querySelectorAll(".cinema-item"));

        const folioIndex = items.findIndex(el => el.id === "folio-iframe");
        if (folioIndex === -1) return;

        // ── Stop all sounds ──────────────────────────────
        // 1. Rain audio
        if (bgRain) { bgRain.pause(); bgRain.currentTime = 0; bgRain.style.opacity = "0"; }

        // 2. All video elements (pause + reset)
        items.forEach(el => {
            if (el.id !== "folio-iframe") { // Only hide/reset if not the folio iframe
                el.classList.remove("show");
                el.style.display = "none";
                if (el.tagName.toLowerCase() === "video") {
                    el.pause();
                    el.src = "";
                    el.load();
                }
            }
        });

        // 3. Shuri iframe — blank it to kill any audio inside
        const shuriFrame = document.getElementById("shuri-iframe");
        if (shuriFrame) shuriFrame.src = "about:blank";

        // ── Hide everything except folio ─────────────────
        // This loop is now handled by the previous items.forEach
        // items.forEach((el, i) => {
        //     if (i !== folioIndex) { el.classList.remove("show"); el.style.display = "none"; }
        // });

        stage.classList.remove("hidden");

        const folio = items[folioIndex];
        folio.style.display = "block";
        folio.classList.add("show");
        folio.src = folio.getAttribute("data-src") || folio.src;
        folio.onload = () => {
            if (folio.contentWindow) {
                folio.focus();
                folio.contentWindow.focus();
            }
        };

        // Hide skip button
        const skipBtn = document.getElementById("skip-to-folio");
        if (skipBtn) skipBtn.style.display = "none";
    };
});



