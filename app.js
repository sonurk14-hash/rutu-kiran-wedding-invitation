const journey = document.querySelector('.video-journey');
const stage = document.querySelector('.video-stage');
const video = document.querySelector('.story-video');
const eventMapLinks = {
  haldi: document.querySelector('[data-event-map="haldi"]'),
  sangeet: document.querySelector('[data-event-map="sangeet"]'),
  wedding: document.querySelector('[data-event-map="wedding"]'),
};
const scrollCue = document.querySelector('#scroll-cue');
const weddingVenue = document.querySelector('.wedding-venue');
const countdownValues = {
  days: document.querySelector('#countdown-days'),
  hours: document.querySelector('#countdown-hours'),
  minutes: document.querySelector('#countdown-minutes'),
  seconds: document.querySelector('#countdown-seconds'),
};
const weddingDate = new Date('2026-12-14T07:30:00+05:30');
const rsvpToggle = document.querySelector('#rsvp-toggle');
const rsvpForm = document.querySelector('#rsvp-form');
const rsvpError = document.querySelector('#rsvp-error');
const guestCount = document.querySelector('#guest-count');
const edgeProbe = document.createElement('canvas');
const edgeProbeContext = edgeProbe.getContext('2d', { willReadFrequently: true });

edgeProbe.width = 120;
edgeProbe.height = 214;

let scrollFrame = null;
let seekFrame = null;
let targetTime = 0;
let renderedTime = 0;
let lastSeekAt = 0;
let lastFittedTime = -1;

function updateCountdown() {
  const remaining = Math.max(0, weddingDate.getTime() - Date.now());
  const seconds = Math.floor(remaining / 1000);
  countdownValues.days.textContent = String(Math.floor(seconds / 86400)).padStart(2, '0');
  countdownValues.hours.textContent = String(Math.floor((seconds % 86400) / 3600)).padStart(2, '0');
  countdownValues.minutes.textContent = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  countdownValues.seconds.textContent = String(seconds % 60).padStart(2, '0');
}

function updateEventMapLinks() {
  const time = video.currentTime;
  eventMapLinks.haldi.hidden = time < 14 || time > 16;
  eventMapLinks.sangeet.hidden = time < 20 || time > 24;
  eventMapLinks.wedding.hidden = time < 27.6 || time > 29.2;
  weddingVenue.hidden = time < 27.6 || time > 29.2;
  scrollCue.hidden = time > 4 || time > video.duration - 0.1;
}

function scrollInvitation() {
  window.scrollBy({ top: Math.max(120, window.innerHeight * 0.22), behavior: 'smooth' });
}

function toggleRsvpForm() {
  const isExpanded = rsvpToggle.getAttribute('aria-expanded') === 'true';
  rsvpToggle.setAttribute('aria-expanded', String(!isExpanded));
  rsvpToggle.textContent = isExpanded ? 'RSVP' : 'Close RSVP form';
  rsvpForm.hidden = isExpanded;
  rsvpError.hidden = true;
  if (!isExpanded) {
    rsvpForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function submitRsvp(event) {
  event.preventDefault();
  const selectedEvents = [...rsvpForm.querySelectorAll('input[name="event"]:checked')]
    .map((input) => input.value);
  if (!selectedEvents.length) {
    rsvpError.hidden = false;
    rsvpForm.querySelector('input[name="event"]').focus();
    return;
  }

  rsvpError.hidden = true;
  const guestTotal = Number(guestCount.value);
  const message = [
    'Hello, I would like to RSVP for the wedding.',
    `Events: ${selectedEvents.join(', ')}.`,
    `Number of guests: ${guestTotal}.`,
  ].join('\n');
  const whatsappUrl = `https://wa.me/919482596885?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

function updateFrameFit() {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    || !video.videoWidth
    || !video.videoHeight) return;

  const currentTime = video.currentTime;
  if (Math.abs(currentTime - lastFittedTime) < 1 / 120) return;

  edgeProbeContext.drawImage(video, 0, 0, edgeProbe.width, edgeProbe.height);
  const pixels = edgeProbeContext.getImageData(0, 0, edgeProbe.width, edgeProbe.height).data;
  lastFittedTime = currentTime;
  const firstRow = Math.round(edgeProbe.height * 0.15);
  const lastRow = Math.round(edgeProbe.height * 0.85);

  function isDarkEdge(column) {
    let darkSamples = 0;
    let luminanceSum = 0;
    let luminanceSquareSum = 0;
    let totalSamples = 0;
    for (let row = firstRow; row < lastRow; row += 4) {
      const offset = (row * edgeProbe.width + column) * 4;
      const luminance = (pixels[offset] * 299
        + pixels[offset + 1] * 587
        + pixels[offset + 2] * 114) / 1000;
      luminanceSum += luminance;
      luminanceSquareSum += luminance * luminance;
      if (luminance < 110) {
        darkSamples += 1;
      }
      totalSamples += 1;
    }
    const averageLuminance = luminanceSum / totalSamples;
    const luminanceVariance = luminanceSquareSum / totalSamples
      - averageLuminance * averageLuminance;
    const hasMostlyBlackPixels = darkSamples / totalSamples >= 0.9;
    const isUniformDarkPadding = averageLuminance < 115 && luminanceVariance < 625;
    return hasMostlyBlackPixels || isUniformDarkPadding;
  }

  let leftMargin = 0;
  let rightMargin = 0;
  while (leftMargin < edgeProbe.width / 2 && isDarkEdge(leftMargin)) leftMargin += 1;
  while (rightMargin < edgeProbe.width / 2 && isDarkEdge(edgeProbe.width - 1 - rightMargin)) {
    rightMargin += 1;
  }

  if (leftMargin + rightMargin > edgeProbe.width * 0.4) {
    leftMargin = 0;
    rightMargin = 0;
  }

  if (leftMargin + rightMargin === 0) {
    video.style.transform = 'none';
    video.style.transformOrigin = 'center';
    video.style.objectPosition = 'center';
    return;
  }

  const zoom = edgeProbe.width / (edgeProbe.width - leftMargin - rightMargin);
  const contentCenter = (leftMargin + edgeProbe.width - rightMargin) / (2 * edgeProbe.width);
  const origin = (0.5 - zoom * contentCenter) / (1 - zoom);
  video.style.transform = `scaleX(${zoom})`;
  video.style.transformOrigin = `${origin * 100}% center`;
  video.style.objectPosition = 'center';
}

function updateJourneyHeight() {
  updateFrameFit();
  if (!Number.isFinite(video.duration) || !video.duration) return;
  const stageHeight = stage.getBoundingClientRect().height;
  const scrollRate = 150;
  journey.style.height = `${stageHeight + video.duration * scrollRate}px`;
  requestScrollUpdate();
}

function seekVideo(timestamp) {
  seekFrame = null;
  if (video.readyState < HTMLMediaElement.HAVE_METADATA
    || !Number.isFinite(video.duration)
    || video.seeking) return;

  const smoothing = 1 - Math.exp(-Math.min(timestamp - lastSeekAt || 16, 48) / 45);
  renderedTime += (targetTime - renderedTime) * smoothing;
  if (Math.abs(targetTime - renderedTime) < 0.01) renderedTime = targetTime;

  if (timestamp - lastSeekAt >= 1000 / 30
    && Math.abs(video.currentTime - renderedTime) >= 1 / 30) {
    video.currentTime = renderedTime;
    lastSeekAt = timestamp;
  }

  if (Math.abs(targetTime - renderedTime) > 0.01) requestSeek();
}

function requestSeek() {
  if (seekFrame !== null) return;
  seekFrame = window.requestAnimationFrame(seekVideo);
}

function updateScroll() {
  scrollFrame = null;
  if (!Number.isFinite(video.duration) || !video.duration) return;
  const journeyStart = journey.getBoundingClientRect().top + window.scrollY;
  const journeyDistance = Math.max(1, journey.offsetHeight - stage.offsetHeight);
  const progress = Math.min(1, Math.max(0, (window.scrollY - journeyStart) / journeyDistance));
  targetTime = progress * video.duration;
  if (seekFrame === null && !video.seeking && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    renderedTime = video.currentTime;
  }
  requestSeek();
}

function requestScrollUpdate() {
  if (scrollFrame !== null) return;
  scrollFrame = window.requestAnimationFrame(updateScroll);
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', updateJourneyHeight);
video.addEventListener('loadedmetadata', updateJourneyHeight);
video.addEventListener('loadedmetadata', () => { renderedTime = video.currentTime; });
video.addEventListener('loadedmetadata', updateEventMapLinks);
video.addEventListener('loadeddata', updateFrameFit);
video.addEventListener('timeupdate', updateEventMapLinks);
video.addEventListener('seeked', () => {
  updateEventMapLinks();
  updateFrameFit();
  requestSeek();
});
video.addEventListener('error', () => {
  console.error('Unable to load the wedding video.', video.error);
});

updateCountdown();
window.setInterval(updateCountdown, 1000);
rsvpToggle.addEventListener('click', toggleRsvpForm);
rsvpForm.addEventListener('submit', submitRsvp);
scrollCue.addEventListener('click', scrollInvitation);
