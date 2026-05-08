const rainContainer = document.getElementById('rain');
const lightning = document.getElementById('lightning');
const emberContainer = document.getElementById('embers');
const shurikenLogo = document.getElementById('shuriken-logo');
const presentsLogo = document.getElementById('presents-logo');
const eclipseGlow = document.querySelector('.eclipse-glow');
const shurikenFrame = document.querySelector('.shuriken-frame');

// --- VISUAL EFFECTS ---

function createRain() {
    const dropCount = 180;
    for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('div');
        drop.className = 'drop';
        drop.style.left = Math.random() * 100 + "%";
        drop.style.animationDuration = 0.4 + Math.random() * 0.4 + "s";
        drop.style.animationDelay = Math.random() * 2 + "s";
        drop.style.opacity = Math.random() * 0.7 + 0.3;
        rainContainer.appendChild(drop);
    }
}

function createEmbers() {
    const emberCount = 80;
    for (let i = 0; i < emberCount; i++) {
        const ember = document.createElement('div');
        ember.className = 'ember';
        ember.style.left = Math.random() * 100 + "%";
        const size = 2 + Math.random() * 6;
        ember.style.width = size + "px";
        ember.style.height = size + "px";
        ember.style.animationDuration = 5 + Math.random() * 10 + "s";
        ember.style.animationDelay = Math.random() * 10 + "s";
        ember.style.opacity = Math.random() * 0.8 + 0.2;
        emberContainer.appendChild(ember);
    }
}

function thunderStrike() {
    if (Math.random() > 0.95) {
        lightning.style.animation = 'strike 0.4s ease-out';
        setTimeout(() => { lightning.style.animation = ''; }, 400);
    }
    setTimeout(thunderStrike, 3000 + Math.random() * 5000);
}

// --- AUDIO LOGIC ---

// Fixed path: Shuri.js is in static/Shuri/, audio is in static/images/
const slashAudio = new Audio("../images/sword-slash.mp3");
const glitchAudio = new Audio("../images/glitch-sound.mp3");

slashAudio.volume = 1.0;
glitchAudio.volume = 0.8;

function playSlashSound() {
    slashAudio.currentTime = 0;
    slashAudio.play().catch(e => console.log("Slash sound blocked"));

    setTimeout(() => {
        glitchAudio.currentTime = 0;
        glitchAudio.play().catch(e => console.log("Glitch sound blocked"));
    }, 500);
}

// --- INITIALIZATION & SEQUENCING ---

createRain();
createEmbers();

function startShuriIntro() {
    shurikenLogo.classList.remove('hidden');
    shurikenLogo.classList.remove('fade-out');
    console.log("Shuri Sequence Started");

    // 1. Play first slash sound (Shuriken)
    setTimeout(playSlashSound, 2500);

    // 2. Start thunder strikes
    setTimeout(thunderStrike, 4500);

    // 3. Fade out 'Shuriken' after it has been visible for a few seconds
    setTimeout(() => {
        shurikenLogo.classList.add('fade-out');
        if (eclipseGlow) eclipseGlow.classList.add('fade-out');
        if (shurikenFrame) shurikenFrame.classList.add('fade-out');
    }, 8500);

    // 4. Reveal 'Presents' and play second slash
    setTimeout(() => {
        shurikenLogo.classList.add('hidden');
        presentsLogo.classList.remove('hidden');

        // Slash sound for 'Presents' (matches 1.2s delay in CSS)
        setTimeout(playSlashSound, 1200);
    }, 10000);
}

// Listen for message from parent (when embedded in iframe)
let shuriStarted = false;
window.addEventListener("message", (event) => {
    if (event.data === "startShuri" && !shuriStarted) {
        shuriStarted = true;
        // Acknowledge so parent stops pinging
        if (event.source) event.source.postMessage("shuriReady", "*");
        startShuriIntro();
    }
});

// Auto-start if running standalone (no parent iframe)
if (window.parent === window) {
    setTimeout(startShuriIntro, 500);
}
