document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".notebook-checkbox"));
  let currentIndex = 0;
  const DELAY_AFTER_CHECK = 5000; // wait 5s after checking

  let audioContext;
  let backgroundAudio; // real audio file

  // Hide all checkboxes initially
  steps.forEach(step => {
    step.style.display = "none";
    step.querySelector("input").checked = false;
    step.classList.remove("locked", "show", "hide");
  });

  // Show the current checkbox
  function showStep(index) {
    if (index >= steps.length) return; // end of flow

    const step = steps[index];
    step.style.display = "flex";
    step.classList.add("show");

    const input = step.querySelector("input");
    input.addEventListener(
      "change",
      () => onChecked(step),
      { once: true } // only trigger once per checkbox
    );
  }

  // Checkbox checked
  function onChecked(step) {
    step.classList.add("locked");

    const action = step.dataset.action;

    if (action === "sound") startBackgroundSound();
    if (action === "fullscreen") requestFullScreen();
    if (action === "terms") console.log("Terms accepted");

    // Fade out animation
    step.classList.remove("show");
    step.classList.add("hide");

    // After fade-out, hide element and show next checkbox
    setTimeout(() => {
      step.style.display = "none";
      currentIndex++;
      showStep(currentIndex);
    }, 800); // match CSS transition duration
  }

  // Play continuous background audio
  function startBackgroundSound() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!backgroundAudio) {
      // Use real audio file from Django static folder
      backgroundAudio = new Audio("/static/images/rain.mp3"); 
      backgroundAudio.loop = true;
      backgroundAudio.volume = 0.5;
      backgroundAudio.play().catch(() => console.log("User interaction required"));
    }
  }

  // Request fullscreen
  function requestFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  // Mobile rotation: fullscreen on portrait
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    window.addEventListener("orientationchange", () => {
      if (window.innerHeight > window.innerWidth) {
        requestFullScreen();
      }
    });
  }

  // Start the first checkbox after 5 seconds
  setTimeout(() => showStep(currentIndex), 5000);
});






