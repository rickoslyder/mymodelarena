const state = { artifact: null, frameIndex: 0, playing: false, timer: null, transcriptFilter: 'all' };
const ids = [
  'run-status', 'download-run', 'seed-form', 'seed-input', 'metric-winner', 'metric-winner-detail',
  'metric-integrity', 'metric-integrity-detail', 'metric-rounds', 'metric-rounds-detail',
  'metric-fallbacks', 'metric-fallbacks-detail', 'phase-round', 'phase-name', 'arena-headline',
  'arena-subtitle', 'player-ring', 'replay-start', 'replay-back', 'replay-play', 'replay-forward',
  'replay-end', 'timeline', 'timeline-value', 'transcript-filter', 'transcript', 'event-ledger',
  'ledger-count', 'integrity-badge', 'receipt-run-id', 'receipt-manifest', 'receipt-chain',
  'receipt-public', 'verify-public', 'copy-chain', 'integrity-message', 'toast-region',
];
const refs = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

function node(tag, { className, text, attrs } = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  for (const [key, value] of Object.entries(attrs ?? {})) element.setAttribute(key, String(value));
  return element;
}

function setText(reference, value) { reference.textContent = value === null || value === undefined ? '—' : String(value); }
function shortHash(value) { return value ? `${value.slice(0, 11)}…${value.slice(-6)}` : '—'; }
function titleCase(value) { return String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function winnerLabel(value) { return value ? (value === 'draw' ? 'Draw' : titleCase(value)) : 'Pending'; }
function roleLabel(value) { return value ? titleCase(value) : 'Role sealed'; }

function toast(message, tone = 'neutral') {
  const item = node('div', { className: `toast ${tone}`, text: message, attrs: { role: 'status' } });
  refs['toast-region'].append(item);
  window.setTimeout(() => item.remove(), 3_400);
}

function setBusy(busy) {
  refs['run-status'].dataset.status = busy ? 'loading' : (state.artifact?.status === 'completed' ? 'completed' : 'ready');
  setText(refs['run-status'], busy ? 'Running' : (state.artifact?.status === 'completed' ? 'Completed' : 'Ready'));
  refs['seed-input'].disabled = busy;
  refs['seed-form'].querySelector('button').disabled = busy;
}

function enableControls(enabled) {
  for (const id of ['download-run', 'replay-start', 'replay-back', 'replay-play', 'replay-forward', 'replay-end', 'timeline', 'verify-public', 'copy-chain']) {
    refs[id].disabled = !enabled;
  }
}

async function loadRun(seed) {
  stopPlayback();
  setBusy(true);
  try {
    const response = await fetch(`/api/demo?seed=${encodeURIComponent(seed)}`, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error?.message ?? `API returned ${response.status}`);
    }
    state.artifact = await response.json();
  } catch (apiError) {
    try {
      const fallback = await fetch('/demo-run.json', { headers: { accept: 'application/json' } });
      if (!fallback.ok) throw apiError;
      state.artifact = await fallback.json();
      toast('API unavailable; loaded the bundled verified control run.', 'warning');
    } catch {
      toast(apiError instanceof Error ? apiError.message : 'Experiment could not be loaded.', 'error');
      setBusy(false);
      return;
    }
  }
  state.frameIndex = state.artifact.frames.length - 1;
  refs.timeline.max = String(Math.max(0, state.artifact.frames.length - 1));
  refs.timeline.value = String(state.frameIndex);
  enableControls(true);
  renderAll();
  setBusy(false);
}

function currentFrame() { return state.artifact?.frames?.[state.frameIndex] ?? null; }

function renderMetrics() {
  const artifact = state.artifact;
  setText(refs['metric-winner'], winnerLabel(artifact.winner));
  setText(refs['metric-winner-detail'], `${artifact.roster.length} agents · ${artifact.gameId}`);
  setText(refs['metric-integrity'], artifact.integrity.verified ? 'Verified' : 'Failed');
  setText(refs['metric-integrity-detail'], `${artifact.metrics.canonicalEventCount} canonical events`);
  setText(refs['metric-rounds'], artifact.metrics.rounds);
  setText(refs['metric-rounds-detail'], `${artifact.metrics.decisions} decisions`);
  setText(refs['metric-fallbacks'], artifact.metrics.fallbacks);
  setText(refs['metric-fallbacks-detail'], `${artifact.metrics.transportFailures} transport · ${artifact.metrics.semanticFailures} semantic`);
}

function renderFrame() {
  const frame = currentFrame();
  if (!frame) return;
  setText(refs['phase-round'], frame.round ? `Round ${frame.round}` : 'Setup');
  setText(refs['phase-name'], titleCase(frame.phase));
  setText(refs['arena-headline'], frame.headline);
  setText(refs['arena-subtitle'], frame.eventSequence ? `Canonical event #${frame.eventSequence}` : 'Initial public state');
  setText(refs['timeline-value'], `${state.frameIndex} / ${state.artifact.frames.length - 1}`);
  refs.timeline.value = String(state.frameIndex);
  refs['player-ring'].replaceChildren();
  for (const player of frame.players) {
    const item = node('li', {
      className: `player-seat${player.alive ? '' : ' eliminated'}`,
      attrs: { 'data-seat': player.seat, 'aria-label': `${player.name}, ${player.alive ? 'alive' : 'eliminated'}, ${roleLabel(player.role)}` },
    });
    const avatar = node('span', { className: 'avatar', text: player.name.slice(0, 2).toUpperCase(), attrs: { 'aria-hidden': 'true' } });
    const identity = node('span', { className: 'identity' });
    identity.append(node('strong', { text: player.name }), node('small', { text: player.alive ? roleLabel(player.role) : `${roleLabel(player.role)} · eliminated` }));
    item.append(avatar, identity, node('span', { className: 'life', text: player.alive ? 'Active' : 'Out' }));
    refs['player-ring'].append(item);
  }
}

function renderTranscript() {
  const frame = currentFrame();
  refs.transcript.replaceChildren();
  if (!frame) return;
  const lines = frame.transcript.filter((line) => state.transcriptFilter === 'all' || line.phase === state.transcriptFilter);
  if (lines.length === 0) {
    refs.transcript.append(node('p', { className: 'empty-state', text: 'No public speech is visible at this frame.' }));
    return;
  }
  for (const line of lines) {
    const speaker = state.artifact.roster.find((candidate) => candidate.id === line.speakerId);
    const card = node('article', { className: `transcript-line${line.speakerId === 'host' ? ' host' : ''}` });
    const header = node('header');
    header.append(node('strong', { text: speaker?.name ?? 'Host' }), node('span', { text: `Round ${line.round} · ${titleCase(line.phase)}` }));
    card.append(header, node('p', { text: line.text }));
    if (line.accusationId) {
      const accused = state.artifact.roster.find((candidate) => candidate.id === line.accusationId)?.name ?? line.accusationId;
      card.append(node('small', { className: 'accusation', text: `Public suspicion: ${accused}` }));
    }
    refs.transcript.append(card);
  }
  refs.transcript.scrollTop = refs.transcript.scrollHeight;
}

function renderLedger() {
  const frame = currentFrame();
  const visible = state.artifact.publicEvents.filter((event) => frame && event.sequence <= frame.eventSequence);
  refs['event-ledger'].replaceChildren();
  for (const event of visible) {
    const row = node('tr');
    row.append(
      node('td', { text: event.sequence }),
      node('td', { text: titleCase(event.type) }),
      node('td', { text: event.round ? `R${event.round} · ${titleCase(event.phase)}` : titleCase(event.phase) }),
      node('td', { className: 'hash', text: shortHash(event.canonicalEventHash), attrs: { title: event.canonicalEventHash } }),
    );
    refs['event-ledger'].append(row);
  }
  setText(refs['ledger-count'], `${visible.length} event${visible.length === 1 ? '' : 's'}`);
}

function renderReceipt() {
  const integrity = state.artifact.integrity;
  refs['integrity-badge'].dataset.status = integrity.verified ? 'completed' : 'error';
  setText(refs['integrity-badge'], integrity.verified ? 'Chain verified' : 'Verification failed');
  for (const [id, value] of [
    ['receipt-run-id', state.artifact.runId],
    ['receipt-manifest', integrity.manifestHash],
    ['receipt-chain', integrity.chainHead],
    ['receipt-public', integrity.publicDigest],
  ]) {
    setText(refs[id], id === 'receipt-run-id' ? value : shortHash(value));
    refs[id].title = value;
  }
}

function renderAll() { renderMetrics(); renderFrame(); renderTranscript(); renderLedger(); renderReceipt(); }
function setFrame(index) {
  const maximum = state.artifact ? state.artifact.frames.length - 1 : 0;
  state.frameIndex = Math.max(0, Math.min(maximum, Number(index) || 0));
  renderFrame();
  renderTranscript();
  renderLedger();
}

function stopPlayback() {
  state.playing = false;
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
  setText(refs['replay-play'], 'Play');
  refs['replay-play'].setAttribute('aria-label', 'Play replay');
}

function togglePlayback() {
  if (!state.artifact) return;
  if (state.playing) return stopPlayback();
  if (state.frameIndex >= state.artifact.frames.length - 1) setFrame(0);
  state.playing = true;
  setText(refs['replay-play'], 'Pause');
  refs['replay-play'].setAttribute('aria-label', 'Pause replay');
  state.timer = window.setInterval(() => {
    if (state.frameIndex >= state.artifact.frames.length - 1) return stopPlayback();
    setFrame(state.frameIndex + 1);
  }, 850);
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyPublicArtifact() {
  if (!state.artifact) return;
  refs['verify-public'].disabled = true;
  setText(refs['integrity-message'], 'Recomputing the public digest…');
  const candidate = structuredClone(state.artifact);
  candidate.integrity.publicDigest = null;
  const digest = await sha256Hex(stableStringify(candidate));
  const provenanceValid = state.artifact.publicEvents.every((event) => /^[a-f0-9]{64}$/.test(event.canonicalEventHash));
  const valid = digest === state.artifact.integrity.publicDigest && provenanceValid && state.artifact.integrity.verified;
  setText(refs['integrity-message'], valid
    ? 'Public digest matches, all visible events have canonical provenance, and the server reports a valid private replay.'
    : 'Verification failed. Do not treat this projection as authoritative.');
  refs['integrity-badge'].dataset.status = valid ? 'completed' : 'error';
  setText(refs['integrity-badge'], valid ? 'Public artifact verified' : 'Verification failed');
  toast(valid ? 'Public artifact verified.' : 'Public verification failed.', valid ? 'success' : 'error');
  refs['verify-public'].disabled = false;
}

function downloadRun() {
  if (!state.artifact) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(state.artifact, null, 2)], { type: 'application/json' }));
  const anchor = node('a', { attrs: { href: url, download: `${state.artifact.runId}.public.json` } });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function copyChain() {
  try { await navigator.clipboard.writeText(state.artifact.integrity.chainHead); toast('Chain head copied.', 'success'); }
  catch { toast('Clipboard access was unavailable.', 'warning'); }
}

refs['seed-form'].addEventListener('submit', (event) => { event.preventDefault(); loadRun(refs['seed-input'].value.trim() || 'arena-demo-001'); });
refs['download-run'].addEventListener('click', downloadRun);
refs['replay-start'].addEventListener('click', () => { stopPlayback(); setFrame(0); });
refs['replay-back'].addEventListener('click', () => { stopPlayback(); setFrame(state.frameIndex - 1); });
refs['replay-play'].addEventListener('click', togglePlayback);
refs['replay-forward'].addEventListener('click', () => { stopPlayback(); setFrame(state.frameIndex + 1); });
refs['replay-end'].addEventListener('click', () => { stopPlayback(); setFrame(state.artifact.frames.length - 1); });
refs.timeline.addEventListener('input', (event) => { stopPlayback(); setFrame(event.target.value); });
refs['transcript-filter'].addEventListener('change', (event) => { state.transcriptFilter = event.target.value; renderTranscript(); });
refs['verify-public'].addEventListener('click', verifyPublicArtifact);
refs['copy-chain'].addEventListener('click', copyChain);

enableControls(false);
loadRun(refs['seed-input'].value);
