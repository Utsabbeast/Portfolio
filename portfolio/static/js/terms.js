// --- Cinematic Viewport Scaler ---
function applyTermsScaler() {
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
window.addEventListener('resize', applyTermsScaler);
window.addEventListener('orientationchange', () => setTimeout(applyTermsScaler, 100));

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

document.addEventListener('DOMContentLoaded', () => {
    applyTermsScaler();
    
    // --- 1. Variable Declarations ---
    const bgMusic = document.getElementById('bgMusic');
    const closeBtn = document.getElementById('closeBtn');
    const hoverSound = document.getElementById('hoverSound'); 
    const clickSound = new Audio("/static/images/Select.mp3"); 
    const timecodeEl = document.getElementById('timecode');
    const trigger = document.getElementById('easterEggTrigger');
    const note = document.getElementById('directorNote');
    const hoverTargets = document.querySelectorAll('.hover-target');
    const allLinks = document.querySelectorAll('.credits-list a, #easterEggTrigger');

    // --- 2. Background Music Logic ---
    // Delayed start for atmospheric effect
    setTimeout(() => {
        if (bgMusic) {
            bgMusic.play().catch(error => {
                console.log("Autoplay prevented. Music starts on interaction.");
                document.addEventListener('click', () => {
                    bgMusic.play();
                }, { once: true });
            });
        }
    }, 10000);

    // --- 3. Close Button Logic ---
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            // Stop background music
            if (bgMusic) {
                bgMusic.pause();
                safeSeek(bgMusic, 0);
            }

            // Play UI click sound
            safeSeek(clickSound, 0);
            clickSound.play().catch(e => console.log("Audio blocked."));
            
            // Logic to handle closing the tab or redirecting
            setTimeout(() => {
                // Because home.html uses target="_blank", window.close() should work.
                window.close();

                // Fallback: If the browser blocks the close command, redirect to home.
                setTimeout(() => {
                    window.location.href = "/";
                }, 100);
            }, 500);
        });
    }

    // --- 4. Hover Sound Logic ---
    if (hoverSound) {
        hoverTargets.forEach(target => {
            target.addEventListener('mouseenter', () => {
                safeSeek(hoverSound, 0); 
                hoverSound.play().catch(e => console.log("Audio blocked."));
            });
        });
    }

    // --- 5. Click Sound Logic for all links ---
    allLinks.forEach(link => {
        link.addEventListener('click', () => {
            safeSeek(clickSound, 0);
            clickSound.play().catch(e => console.log("Audio blocked."));
        });
    });

    // --- 6. Running Timecode Logic (24fps) ---
    if (timecodeEl) {
        let frames = 0, seconds = 0, minutes = 0, hours = 1;

        setInterval(() => {
            frames++;
            if (frames >= 24) { frames = 0; seconds++; }
            if (seconds >= 60) { seconds = 0; minutes++; }
            if (minutes >= 60) { minutes = 0; hours++; }

            const f = frames.toString().padStart(2, '0');
            const s = seconds.toString().padStart(2, '0');
            const m = minutes.toString().padStart(2, '0');
            const h = hours.toString().padStart(2, '0');
            
            timecodeEl.innerText = `TCR ${h}:${m}:${s}:${f}`;
        }, 1000 / 24); 
    }

    // --- 7. Easter Egg Logic ---
    if (trigger && note) {
        trigger.addEventListener('click', () => {
            note.classList.toggle('show-note');
        });
    }

});