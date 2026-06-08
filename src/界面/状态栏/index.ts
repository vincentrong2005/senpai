import { waitUntil } from 'async-wait-until';
import { Schema } from '../../schema';
import './global.css';

type StatusData = z.infer<typeof Schema>;

const elements = {
  root: '#senpai-status-root',
  portrait: '#senpai-status-portrait',
  portraitImage: '#senpai-status-portrait-image',
  time: '#senpai-status-time',
  weekday: '#senpai-status-weekday',
  location: '#senpai-status-location',
  output: '#senpai-status-semen-output',
  meter: '#senpai-status-semen-meter',
  fill: '#senpai-status-semen-fill',
} as const;

const portraitBaseUrl = 'https://img.vinsimage.org/%E5%89%8D%E8%BE%88/%E5%89%8D%E8%BE%88';
const portraitIndexes = _.range(1, 13);
let currentPortraitIndex = 0;

function getRandomPortraitIndex() {
  const candidates = portraitIndexes.filter(index => index !== currentPortraitIndex);
  return _.sample(candidates) ?? 1;
}

function getPortraitUrl(index: number) {
  return `${portraitBaseUrl}${index}.png`;
}

function renderPortrait(index = getRandomPortraitIndex()) {
  const image = document.querySelector<HTMLImageElement>(elements.portraitImage);
  if (!image) {
    return;
  }

  currentPortraitIndex = index;
  image.classList.add('is-switching');
  window.setTimeout(() => {
    image.onload = () => {
      image.classList.remove('is-switching');
      syncIframeFrame();
    };
    image.onerror = () => {
      image.classList.remove('is-switching');
    };
    image.src = getPortraitUrl(index);
  }, 110);
}

function syncIframeFrame() {
  const root = document.querySelector<HTMLElement>(elements.root);
  const frame = window.frameElement;
  if (!root || !(frame instanceof HTMLElement)) {
    return;
  }

  const rect = root.getBoundingClientRect();
  frame.setAttribute('allowtransparency', 'true');
  frame.style.width = '100%';
  frame.style.maxWidth = '100%';
  frame.style.height = `${Math.ceil(rect.height)}px`;
  frame.style.display = 'block';
  frame.style.margin = '0 auto';
  frame.style.background = 'transparent';
  frame.style.backgroundColor = 'transparent';
  frame.style.border = '0';
  frame.style.boxShadow = 'none';
  frame.style.overflow = 'hidden';

  let parent = frame.parentElement;
  for (let depth = 0; parent && depth < 8; depth += 1) {
    parent.style.background = 'transparent';
    parent.style.backgroundColor = 'transparent';
    parent.style.boxShadow = 'none';
    parent.style.textAlign = 'center';
    parent = parent.parentElement;
  }
}

function ensureMeta() {
  document.title = '状态栏';
  document.documentElement.style.colorScheme = 'normal';
  document.documentElement.style.background = 'transparent';
  document.documentElement.style.backgroundColor = 'transparent';
  document.body.style.background = 'transparent';
  document.body.style.backgroundColor = 'transparent';
  document.body.style.width = '100%';
  document.body.style.margin = '0';

  const description =
    document.querySelector<HTMLMetaElement>('meta[name="description"]') ?? document.createElement('meta');
  description.name = 'description';
  description.content = '展示时间、星期、地点与主角精液存量的沉浸式状态栏。';
  if (!description.parentElement) {
    document.head.append(description);
  }
}

function readStatusData(): StatusData {
  return Schema.parse(_.get(getVariables({ type: 'message' }), 'stat_data', {}), { reportInput: true });
}

function renderStatus(data: StatusData) {
  const stock = _.clamp(Math.round(data.精液存量), 0, 100);

  $(elements.time).text(data.时间 || '未知时间');
  $(elements.weekday).text(data.星期 || '未知星期');
  $(elements.location).text(data.地点 || '未知地点');
  $(elements.output).text(`${stock}%`);
  $(elements.fill).css('height', `${stock}%`);
  $(elements.meter).attr('aria-valuenow', String(stock));
  requestAnimationFrame(syncIframeFrame);
}

async function initStatusBar() {
  ensureMeta();
  renderPortrait();
  $(elements.portrait).on('click', () => renderPortrait());
  await waitGlobalInitialized('Mvu');
  await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'));

  let last_snapshot = '';
  const sync = () => {
    const data = readStatusData();
    const snapshot = JSON.stringify(data);
    if (snapshot === last_snapshot) {
      return;
    }

    last_snapshot = snapshot;
    renderStatus(data);
  };

  sync();
  syncIframeFrame();
  const observer = new ResizeObserver(syncIframeFrame);
  const root = document.querySelector<HTMLElement>(elements.root);
  if (root) {
    observer.observe(root);
  }

  const timer = window.setInterval(sync, 1200);
  const offUpdate = eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, sync);
  $(window).one('pagehide', () => {
    window.clearInterval(timer);
    observer.disconnect();
    $(elements.portrait).off('click');
    offUpdate.stop();
  });
}

$(() => {
  errorCatched(initStatusBar)();
});
