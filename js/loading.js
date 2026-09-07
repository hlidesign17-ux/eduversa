// Logic Controller

import { APP_CONFIG } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  const logo = document.getElementById("app-logo");
  const taglineTextContainer = document.getElementById("tagline-text");
  const fullText = "Learn Beyond Limits";

  // Step 1: Fade in Logo
  setTimeout(() => {
    if (logo) logo.classList.add("visible");

    // Step 2: Start Typing Text setelah logo mulai muncul
    setTimeout(startTypingEffect, 600);
  }, APP_CONFIG.ANIMATION.FADE_DELAY);

  function startTypingEffect() {
    let charIndex = 0;

    function typeChar() {
      if (charIndex < fullText.length) {
        taglineTextContainer.textContent += fullText.charAt(charIndex);
        charIndex++;
        setTimeout(typeChar, APP_CONFIG.ANIMATION.TYPING_SPEED);
      } else {
        // Step 3: Pindah halaman setelah animasi mengetik selesai + 2 detik
        setTimeout(() => {
          window.location.href = APP_CONFIG.ROUTES.LOGIN;
        }, APP_CONFIG.ANIMATION.REDIRECT_DELAY);
      }
    }

    typeChar();
  }
});
