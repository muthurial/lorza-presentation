'use strict';

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const progress = document.querySelector('#progress');
const masthead = document.querySelector('.masthead');
const chapterMenu = document.querySelector('.chapters');
const chapterLinks = [...chapterMenu.querySelectorAll('nav a')];
const scenes = [...document.querySelectorAll('.scene')];
const timeline = document.querySelector('.timeline');
const checkpoints = [...timeline.querySelectorAll('.checkpoint')];
const timelineNav = document.querySelector('.timeline-nav');
const dateLinks = [...timelineNav.querySelectorAll('a')];

function setCurrent(links, fragment, kind) {
  for (const link of links) {
    if (link.hash === fragment) link.setAttribute('aria-current', kind);
    else link.removeAttribute('aria-current');
  }
}

function syncPagePosition() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  progress.value = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  const readingLine = masthead.offsetHeight + window.innerHeight * 0.32;
  const current = scenes.findLast(scene => scene.getBoundingClientRect().top <= readingLine);
  setCurrent(chapterLinks, '#' + (current ?? scenes[0]).id, 'location');
}

function syncTimelinePosition() {
  const index = Math.min(checkpoints.length - 1, Math.round(timeline.scrollLeft / timeline.clientWidth));
  setCurrent(dateLinks, '#' + checkpoints[index].id, 'step');
}

let pageFrame = 0;
function queuePageSync() {
  if (pageFrame) return;
  pageFrame = window.requestAnimationFrame(() => {
    pageFrame = 0;
    syncPagePosition();
  });
}

window.addEventListener('scroll', queuePageSync, { passive: true });
window.addEventListener('resize', queuePageSync);
new ResizeObserver(queuePageSync).observe(document.querySelector('main'));
timeline.addEventListener('scroll', syncTimelinePosition, { passive: true });
new ResizeObserver(syncTimelinePosition).observe(timeline);
syncPagePosition();
syncTimelinePosition();

function showCheckpoint(index) {
  const checkpoint = checkpoints[index];
  timeline.scrollTo({
    left: timeline.clientWidth * index,
    behavior: motion.matches ? 'instant' : 'smooth',
  });
  checkpoint.tabIndex = -1;
  checkpoint.focus({ preventScroll: true });
}

dateLinks.forEach((link, index) => link.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showCheckpoint(index);
}));

function navigateCheckpoints(event, current) {
  const directions = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: checkpoints.length - 1 };
  if (!Object.hasOwn(directions, event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  showCheckpoint(Math.min(checkpoints.length - 1, Math.max(0, directions[event.key])));
}

timeline.addEventListener('keydown', event => {
  navigateCheckpoints(event, Math.round(timeline.scrollLeft / timeline.clientWidth));
});

timelineNav.addEventListener('keydown', event => {
  const current = dateLinks.indexOf(event.target);
  if (current >= 0) navigateCheckpoints(event, current);
});

for (const link of chapterLinks) {
  link.addEventListener('click', () => { chapterMenu.open = false; });
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !chapterMenu.open) return;
  chapterMenu.open = false;
  chapterMenu.querySelector('summary').focus();
});

for (const group of document.querySelectorAll('[data-switch]')) {
  const panels = [...document.querySelectorAll('[data-panel]')]
    .filter(panel => panel.dataset.panel.startsWith(group.dataset.switch + ':'));
  function syncChoice() {
    const value = group.querySelector('input:checked').value;
    for (const panel of panels) {
      panel.hidden = panel.dataset.panel !== group.dataset.switch + ':' + value;
    }
  }
  group.addEventListener('change', syncChoice);
  syncChoice();
}
