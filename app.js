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

let scrollFrame = null;
let seekFrame = null;
let targetTime = 0;
let renderedTime = 0;
let lastSeekAt = 0;

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
  eventMapLinks.haldi.hidden = time < 12 || time > 12.9;
  eventMapLinks.sangeet.hidden = time < 14.6 || time > 15.7;
  eventMapLinks.wedding.hidden = time < 20.8 || time > 23.5;
  weddingVenue.hidden = time < 20.8 || time > 23.5;
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

function updateJourneyHeight() {
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

  const smoothing = 1 - Math.exp(-Math.min(timestamp - lastSeekAt || 16, 48) / 35);
  renderedTime += (targetTime - renderedTime) * smoothing;
  if (Math.abs(targetTime - renderedTime) < 0.01) renderedTime = targetTime;

  if (timestamp - lastSeekAt >= 1000 / 60
    && Math.abs(video.currentTime - renderedTime) >= 1 / 60) {
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
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateJourneyHeight);
}
video.addEventListener('loadedmetadata', updateJourneyHeight);
video.addEventListener('loadedmetadata', () => { renderedTime = video.currentTime; });
video.addEventListener('loadedmetadata', updateEventMapLinks);
video.addEventListener('timeupdate', updateEventMapLinks);
video.addEventListener('seeked', () => {
  updateEventMapLinks();
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
