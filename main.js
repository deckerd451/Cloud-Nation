// --- Config & Assets ---
const CONFIG = {
  cardImages: [
    "images/yellowscullcard.png",
    "images/redscullcard.png",
    "images/Descartes.png",
    "images/Alexandor.png",
    "images/Medusa.png",
    "images/Elara.png",
    "images/adventurercard.png",
    "images/collaboratorcard.png",
    "images/humanitariancard.png",
    "images/nextcard.png",
    "images/Aegis.png",
    "images/resilientcard.png",
    "images/Astrid.png",
    "images/nicolecard.png"
  ],
  videos: [
    "images/Descartesvideo.mp4",
    "images/medusa best.mp4",
    "images/medusa 1.mp4",
    "images/young medusa.mp4",
    "images/Alexandorvideo.mp4",
    "images/Elaravideo.mp4",
    "images/elara rage.mp4",
    "images/astridvideo.mp4",
    "images/aegisvideo.mp4",
    "images/wolfvideo.mp4",
    "images/merlin.mp4",
    "images/hermesvideo.mp4",
    "images/Mystery.mp4"
  ],
  sounds: {
    cardflip: document.getElementById('cardflipSound'),
    chime: document.getElementById('chimeSound'),
    keys: document.getElementById('keysSound')
  }
};

// --- BTC Price Fetch ---
function updateBTCPrice() {
  fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
    .then(response => response.json())
    .then(data => {
      const price = data?.bitcoin?.usd;
      if (price !== undefined) {
        document.getElementById('btcPrice').textContent = `BTC: ${price.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}`;
      } else {
        document.getElementById('btcPrice').textContent = 'BTC price unavailable';
      }
    })
    .catch(() => {
      document.getElementById('btcPrice').textContent = 'BTC price unavailable';
    });
}

// --- Helpers ---
function getRandomCardImage() {
  const arr = CONFIG.cardImages;
  return arr[Math.floor(Math.random() * arr.length)];
}
function getRandomFlipClass() {
  return Math.random() > 0.5 ? 'flip-image-x' : 'flip-image-y';
}
function playSound(soundKey) {
  const audio = CONFIG.sounds[soundKey];
  if (audio) {
    audio.currentTime = 0;
    audio.volume = soundKey === "cardflip" ? 0.45 : 0.7;
    audio.play().catch(()=>{});
  }
}

// --- Main UI Logic ---
document.addEventListener("DOMContentLoaded", function() {
  // BTC Price
  updateBTCPrice();
  setInterval(updateBTCPrice, 60000);

  // Card logic
  const buttons = document.querySelectorAll('.clickable-area');
  const missionImage = document.getElementById('missionImage');
  const missionVideo = document.getElementById('missionVideo');
  const cardFrame = document.getElementById('cardFrame');
  let videoPlaying = false;

  missionImage.addEventListener('click', function() {
    if (videoPlaying) return;
    playSound('cardflip');
    missionImage.src = getRandomCardImage();
    const flipClass = getRandomFlipClass();
    missionImage.classList.add(flipClass);
    setTimeout(() => { missionImage.classList.remove(flipClass); }, 1200);

    // Show video with random video
    missionVideo.src = CONFIG.videos[Math.floor(Math.random() * CONFIG.videos.length)];
    missionVideo.style.display = "block";
    cardFrame.style.display = "block";
    setTimeout(() => { missionVideo.style.opacity = 1; }, 100);
    missionVideo.muted = false;
    if (window.matchMedia("(max-width: 600px)").matches) {
      missionVideo.removeAttribute('controls');
    } else {
      missionVideo.setAttribute('controls', '');
    }
    missionVideo.load();
    missionVideo.play();
    videoPlaying = true;
    buttons.forEach(b => b.disabled = true);

    missionVideo.onended = () => {
      missionVideo.pause();
      missionVideo.style.display = "none";
      missionVideo.style.opacity = 0;
      cardFrame.style.display = "none";
      buttons.forEach(b => b.disabled = false);
      videoPlaying = false;
    };
  });

  // Keyboard accessibility for card image flip
  missionImage.setAttribute('tabindex', '0');
  missionImage.addEventListener('keydown', function(e) {
    if (e.key === "Enter" || e.key === " ") {
      missionImage.click();
    }
  });

  // Button click logic for sound + navigation
  buttons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const soundKey = btn.dataset.sound;
      playSound(soundKey);
      btn.classList.add('glow-animate');
      setTimeout(() => {
        window.location.href = btn.dataset.url;
      }, 460);
    });
    btn.addEventListener('keydown', function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        btn.click();
      }
    });
    btn.addEventListener('animationend', function(e) {
      if (e.animationName === "glow") {
        btn.classList.remove('glow-animate');
      }
    });
  });

  // Preload audio on first interaction for autoplay policy
  window.addEventListener('pointerdown', () => {
    Object.values(CONFIG.sounds).forEach(audio => {
      audio.load();
    });
  }, { once: true });
});
