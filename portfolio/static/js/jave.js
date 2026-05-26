// --- Cinematic Viewport Scaler ---
function applyScaler() {
    const site = document.querySelector('.site');
    if (!site) return;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let isForced = document.body.classList.contains('force-landscape');

    let availW = isForced ? winH : winW;
    let availH = isForced ? winW : winH;

    let scale = Math.min(availW / 1920, availH / 1080);

    site.style.transform = isForced
        ? `translate(-50%, -50%) rotate(90deg) scale(${scale})`
        : `translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener('resize', applyScaler);
window.addEventListener('orientationchange', () => setTimeout(applyScaler, 100));

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

document.addEventListener("DOMContentLoaded", () => {
    applyScaler();

    // Explicitly restore iframe sources to prevent browsers from reloading them as "about:blank" from session history
    const shuriIframe = document.getElementById("shuri-iframe");
    if (shuriIframe) {
        shuriIframe.src = "/static/Shuri/Shuri.html?v=9";
    }
    const folioIframe = document.getElementById("folio-iframe");
    if (folioIframe) {
        folioIframe.src = "about:blank";
    }

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
                safeSeek(clickSound, 0);
                clickSound.play().catch(() => { });
            });
        }

        const onInteraction = (e) => {
            if (e.target.classList.contains('inline-terms-link')) return;

            safeSeek(clickSound, 0);
            clickSound.play().catch(() => { });

            if (action === "sound") {
                localStorage.setItem('soundAllowed', 'true');
                if (bgRain) {
                    bgRain.volume = 0.5;
                    bgRain.play().catch(() => { });
                }
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
                let shuriPing;
                let shuriAdvanced = false;

                const handleShuriComplete = (e) => {
                    if (e.data === "shuriComplete") {
                        console.log("Shuri completed naturally, advancing...");
                        advanceFromShuri();
                    }
                };

                const advanceFromShuri = () => {
                    if (shuriAdvanced || isCinemaInterrupted || skipFolioActive) return;
                    shuriAdvanced = true;
                    window.removeEventListener("message", handleShuriComplete);
                    if (shuriPing) clearInterval(shuriPing);
                    if (cinemaTimer) clearTimeout(cinemaTimer);
                    
                    const oldItem = item;
                    oldItem.classList.remove("show");

                    // Delay playing the next item (vid-hand) until the shuri iframe has fully faded out (1.5s)
                    setTimeout(() => {
                        if (isCinemaInterrupted || skipFolioActive) return;
                        currentItemIndex++;
                        playNext();
                    }, 1500);

                    cinemaTimer = setTimeout(() => {
                        oldItem.style.display = "none";
                        oldItem.src = "about:blank"; // Unload Shuri iframe to release memory
                    }, 1500);
                };

                window.addEventListener("message", handleShuriComplete);

                const startPinging = () => {
                    if (isCinemaInterrupted || skipFolioActive || shuriAdvanced) return;
                    console.log("Shuri iframe loaded or starting, beginning ping...");

                    // Respond to acknowledgement
                    const handleAck = (e) => {
                        if (e.data === "shuriReady") {
                            console.log("Shuri acknowledged, stop ping.");
                            clearInterval(shuriPing);
                            window.removeEventListener("message", handleAck);
                        }
                    };
                    window.addEventListener("message", handleAck);

                    shuriPing = setInterval(() => {
                        if (isCinemaInterrupted || skipFolioActive || shuriAdvanced) {
                            clearInterval(shuriPing);
                            return;
                        }
                        console.log("Pinging Shuri...");
                        if (item.contentWindow) {
                            item.contentWindow.postMessage("startShuri", "*");
                        }
                    }, 500);
                };

                // Wait for the iframe fade-in transition (1.5s) to complete before starting Shuri intro animations
                setTimeout(() => {
                    startPinging();
                }, 1500);

                cinemaTimer = setTimeout(() => {
                    advanceFromShuri();
                }, 30000);

            } else if (item.id === "folio-iframe") {
                const baseSrc = item.getAttribute("data-src") || item.src || "/static/folio/folio.html";
                item.src = baseSrc.split('?')[0] + "?t=" + Date.now();
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

            safeSeek(item, 0);
            item.play().catch(e => console.error("Video play error:", e));

            const enterBtn = document.getElementById("video-enter-btn");
            let enterShown = false;
            let keydownHandler = null;
            let transitioningNext = false;
            let lastTime = 0;

            const onTimeUpdate = () => {
                if (isCinemaInterrupted || skipFolioActive || transitioningNext) {
                    item.removeEventListener("timeupdate", onTimeUpdate);
                    return;
                }

                let looped = false;
                if (item.currentTime < lastTime && lastTime > 0) {
                    looped = true;
                }
                lastTime = item.currentTime;

                // Only show ENTER button for looping videos (Hand has loop attr)
                if (item.loop && !enterShown && item.duration > 0 && (item.currentTime >= item.duration - 0.4 || looped)) {
                    enterShown = true;
                    if (enterBtn) {
                        enterBtn.classList.add("show");

                        const proceedNext = () => {
                            if (transitioningNext) return;
                            transitioningNext = true;

                            const select2 = document.getElementById("select2Sound");
                            if (select2) {
                                safeSeek(select2, 0);
                                select2.play().catch(() => { });
                            }
                            enterBtn.classList.remove("show");
                            enterBtn.removeEventListener("click", proceedNext);
                            if (keydownHandler) document.removeEventListener("keydown", keydownHandler);
                            item.removeEventListener("timeupdate", onTimeUpdate);

                            const oldItem = item;
                            oldItem.classList.remove("show");

                            currentItemIndex++;
                            playNext();

                            cinemaTimer = setTimeout(() => {
                                oldItem.style.display = "none";
                                oldItem.pause();
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
                        transitioningNext = true;
                        item.removeEventListener("timeupdate", onTimeUpdate);
                        
                        const oldItem = item;
                        oldItem.classList.remove("show");

                        currentItemIndex++;
                        playNext();

                        cinemaTimer = setTimeout(() => {
                            oldItem.style.display = "none";
                            oldItem.pause();
                        }, 1500);
                    }
                }
            };

            item.addEventListener("timeupdate", onTimeUpdate);

            // For non-first videos (walk etc): auto-advance on end
            item.onended = () => {
                if (item.loop) {
                    // Hand (has loop attr): loop until ENTER pressed
                    if (!enterShown && !transitioningNext && !isCinemaInterrupted && !skipFolioActive) {
                        safeSeek(item, 0);
                        item.play().catch(() => { });
                    }
                } else {
                    // All other videos: auto-advance
                    if (isCinemaInterrupted || skipFolioActive || transitioningNext) return;
                    transitioningNext = true;
                    item.removeEventListener("timeupdate", onTimeUpdate);
                    
                    const oldItem = item;
                    oldItem.classList.remove("show");

                    currentItemIndex++;
                    playNext();

                    cinemaTimer = setTimeout(() => {
                        oldItem.style.display = "none";
                        oldItem.pause();
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
        if (bgRain) { bgRain.pause(); safeSeek(bgRain, 0); bgRain.style.opacity = "0"; }

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
        const baseSrc = folio.getAttribute("data-src") || folio.src || "/static/folio/folio.html";
        folio.src = baseSrc.split('?')[0] + "?t=" + Date.now();
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



