import {
  DeterministicRng,
  EventStore,
  ValidationError,
  assert,
  canonicalJson,
  canonicalize,
  clone,
  deterministicPick,
  sha256,
  stableId,
} from './core.mjs';

export const GAME_ID = 'mafia.v1';
export const PHASES = Object.freeze(['night_mafia', 'night_doctor', 'night_detective', 'day_discussion', 'day_vote', 'complete']);

export function validateManifest(manifest) {
  assert(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'Manifest must be an object');
  assert(manifest.schemaVersion === '1.0.0', 'Unsupported manifest schema version');
  assert(manifest.gameId === GAME_ID, `Unsupported game: ${manifest.gameId}`);
  assert(typeof manifest.seed === 'string' && manifest.seed.length > 0 && manifest.seed.length <= 120, 'Seed must contain 1–120 characters');
  assert(Array.isArray(manifest.agents) && manifest.agents.length >= 5 && manifest.agents.length <= 12, 'Mafia requires 5–12 agents');
  const ids = manifest.agents.map((agent) => agent.id);
  assert(new Set(ids).size === ids.length, 'Agent IDs must be unique');
  for (const agent of manifest.agents) {
    assert(/^[a-z0-9_-]{1,40}$/i.test(agent.id), `Invalid agent ID: ${agent.id}`);
    assert(typeof agent.name === 'string' && agent.name.trim().length > 0 && agent.name.length <= 60, `Invalid name for ${agent.id}`);
    assert(typeof agent.provider === 'string' && agent.provider.length > 0, `Missing provider for ${agent.id}`);
    assert(typeof agent.model === 'string' && agent.model.length > 0, `Missing model for ${agent.id}`);
  }
  const rules = manifest.rules ?? {};
  if (rules.maxRounds !== undefined) assert(Number.isSafeInteger(rules.maxRounds) && rules.maxRounds >= 1 && rules.maxRounds <= 50, 'maxRounds must be 1–50');
  return true;
}

export function createInitialState(manifest) {
  validateManifest(manifest);
  const runId = manifest.runId ?? stableId('run', {
    gameId: manifest.gameId,
    seed: manifest.seed,
    agents: manifest.agents,
    rules: manifest.rules ?? {},
  }, 20);
  return {
    schemaVersion: '1.0.0',
    runId,
    gameId: GAME_ID,
    seed: manifest.seed,
    status: 'created',
    phase: 'setup',
    round: 0,
    winner: null,
    completionReason: null,
    rules: {
      maxRounds: manifest.rules?.maxRounds ?? 12,
      doctorMaySelfProtect: manifest.rules?.doctorMaySelfProtect !== false,
      revealRolesAtEnd: manifest.rules?.revealRolesAtEnd !== false,
    },
    players: manifest.agents.map((agent, seat) => ({
      id: agent.id,
      name: agent.name.trim(),
      provider: agent.provider,
      model: agent.model,
      seat,
      role: null,
      alive: true,
    })),
    pendingDecisions: {},
    night: { mafiaTargetId: null, protectedTargetId: null },
    investigations: {},
    publicTranscript: [],
    eliminations: [],
    counters: {
      acceptedDecisions: 0,
      deterministicFallbacks: 0,
      timeouts: 0,
      transportFailures: 0,
      semanticFailures: 0,
      refusals: 0,
    },
  };
}

function roleDeck(playerCount) {
  const mafiaCount = Math.max(1, Math.floor(playerCount / 3));
  const roles = [...Array.from({ length: mafiaCount }, () => 'mafia'), 'doctor', 'detective'];
  while (roles.length < playerCount) roles.push('villager');
  return roles.slice(0, playerCount);
}

export function assignRoles(state) {
  const roles = new DeterministicRng(state.seed, 'role-assignment').shuffle(roleDeck(state.players.length));
  return state.players.map((player, index) => ({ playerId: player.id, role: roles[index] }));
}

function playerName(state, playerId) {
  return state.players.find((player) => player.id === playerId)?.name ?? playerId ?? 'No one';
}

function alivePlayers(state) {
  return state.players.filter((player) => player.alive);
}

function aliveRole(state, role) {
  return state.players.filter((player) => player.alive && player.role === role);
}

export function winnerFor(state) {
  const mafiaCount = aliveRole(state, 'mafia').length;
  const nonMafiaCount = alivePlayers(state).length - mafiaCount;
  if (mafiaCount === 0) return 'village';
  if (mafiaCount >= nonMafiaCount) return 'mafia';
  return null;
}

export function reduceMafiaEvent(state, event) {
  const payload = event.payload;
  switch (event.type) {
    case 'roles_assigned': {
      const roleByPlayer = Object.fromEntries(payload.assignments.map((entry) => [entry.playerId, entry.role]));
      for (const player of state.players) player.role = roleByPlayer[player.id];
      state.status = 'running';
      return state;
    }
    case 'game_started':
      return state;
    case 'phase_started': {
      state.phase = payload.phase;
      state.round = payload.round;
      state.pendingDecisions = {};
      return state;
    }
    case 'barrier_committed': {
      state.pendingDecisions = Object.fromEntries(payload.entries.map((entry) => [entry.actorId, entry.decision]));
      for (const entry of payload.entries) {
        if (entry.meta.fallback) state.counters.deterministicFallbacks += 1;
        else state.counters.acceptedDecisions += 1;
        if (entry.meta.disposition === 'timed_out') state.counters.timeouts += 1;
        if (entry.meta.failureKind === 'transport') state.counters.transportFailures += 1;
        if (entry.meta.failureKind === 'semantic') state.counters.semanticFailures += 1;
        if (entry.meta.disposition === 'refused') state.counters.refusals += 1;
      }
      return state;
    }
    case 'secret_resolved': {
      if (payload.kind === 'mafia_target') state.night.mafiaTargetId = payload.targetId;
      if (payload.kind === 'protection') state.night.protectedTargetId = payload.targetId;
      if (payload.kind === 'investigation' && payload.detectiveId) {
        state.investigations[payload.detectiveId] ??= [];
        state.investigations[payload.detectiveId].push({
          round: state.round,
          targetId: payload.targetId,
          alignment: payload.alignment,
        });
      }
      state.pendingDecisions = {};
      return state;
    }
    case 'night_resolved': {
      if (payload.eliminatedId) {
        const player = state.players.find((candidate) => candidate.id === payload.eliminatedId);
        if (player) player.alive = false;
        state.eliminations.push({ playerId: payload.eliminatedId, round: state.round, cause: 'night' });
      }
      state.publicTranscript.push({
        id: stableId('line', { runId: state.runId, sequence: event.sequence }),
        round: state.round,
        phase: 'night',
        speakerId: 'host',
        text: payload.eliminatedId
          ? `${playerName(state, payload.eliminatedId)} was eliminated during the night.`
          : 'No player was eliminated during the night.',
      });
      state.night = { mafiaTargetId: null, protectedTargetId: null };
      state.pendingDecisions = {};
      return state;
    }
    case 'discussion_resolved': {
      for (const statement of payload.statements) {
        state.publicTranscript.push({
          id: stableId('line', { runId: state.runId, sequence: event.sequence, speakerId: statement.actorId }),
          round: state.round,
          phase: 'day_discussion',
          speakerId: statement.actorId,
          text: statement.speech,
          accusationId: statement.accusationId,
        });
      }
      state.pendingDecisions = {};
      return state;
    }
    case 'vote_resolved': {
      if (payload.eliminatedId) {
        const player = state.players.find((candidate) => candidate.id === payload.eliminatedId);
        if (player) player.alive = false;
        state.eliminations.push({ playerId: payload.eliminatedId, round: state.round, cause: 'vote' });
      }
      state.publicTranscript.push({
        id: stableId('line', { runId: state.runId, sequence: event.sequence }),
        round: state.round,
        phase: 'day_vote',
        speakerId: 'host',
        text: payload.eliminatedId
          ? `${playerName(state, payload.eliminatedId)} was eliminated by vote.`
          : 'The vote produced no elimination.',
      });
      state.pendingDecisions = {};
      return state;
    }
    case 'game_completed': {
      state.status = 'completed';
      state.phase = 'complete';
      state.winner = payload.winner;
      state.completionReason = payload.reason;
      state.pendingDecisions = {};
      return state;
    }
    default:
      throw new ValidationError(`Unknown Mafia event: ${event.type}`);
  }
}

export function requiredActors(state) {
  if (state.status !== 'running') return [];
  switch (state.phase) {
    case 'night_mafia': return aliveRole(state, 'mafia').map((player) => player.id).sort();
    case 'night_doctor': return aliveRole(state, 'doctor').map((player) => player.id).sort();
    case 'night_detective': return aliveRole(state, 'detective').map((player) => player.id).sort();
    case 'day_discussion':
    case 'day_vote': return alivePlayers(state).map((player) => player.id).sort();
    default: return [];
  }
}

function legalTargetIds(state, actorId, phase) {
  const actor = state.players.find((player) => player.id === actorId);
  if (!actor?.alive) return [];
  const alive = alivePlayers(state);
  if (phase === 'night_mafia') return alive.filter((player) => player.role !== 'mafia').map((player) => player.id).sort();
  if (phase === 'night_doctor') return alive.filter((player) => state.rules.doctorMaySelfProtect || player.id !== actorId).map((player) => player.id).sort();
  if (phase === 'night_detective' || phase === 'day_vote' || phase === 'day_discussion') {
    return alive.filter((player) => player.id !== actorId).map((player) => player.id).sort();
  }
  return [];
}

export function legalActionSpec(state, actorId) {
  const targetIds = legalTargetIds(state, actorId, state.phase);
  switch (state.phase) {
    case 'night_mafia': return { actionType: 'kill', targetIds, targetRequired: true, speechRequired: false };
    case 'night_doctor': return { actionType: 'protect', targetIds, targetRequired: true, speechRequired: false };
    case 'night_detective': return { actionType: 'inspect', targetIds, targetRequired: true, speechRequired: false };
    case 'day_discussion': return { actionType: 'speak', targetIds, targetRequired: false, speechRequired: true };
    case 'day_vote': return { actionType: 'vote', targetIds, targetRequired: false, speechRequired: false };
    default: return { actionType: 'none', targetIds: [], targetRequired: false, speechRequired: false };
  }
}

export function buildAgentView(state, actorId) {
  const actor = state.players.find((player) => player.id === actorId);
  assert(actor, `Unknown actor: ${actorId}`);
  const mafiaTeammates = actor.role === 'mafia'
    ? state.players.filter((player) => player.role === 'mafia' && player.id !== actorId).map(({ id, name, alive }) => ({ id, name, alive }))
    : [];
  return canonicalize({
    schemaVersion: '1.0.0',
    runId: state.runId,
    gameId: state.gameId,
    logicalStateHash: sha256(state),
    round: state.round,
    phase: state.phase,
    you: { id: actor.id, name: actor.name, role: actor.role, alive: actor.alive },
    privateState: {
      mafiaTeammates,
      investigations: clone(state.investigations[actorId] ?? []),
    },
    publicState: {
      players: state.players.map(({ id, name, seat, alive }) => ({ id, name, seat, alive })),
      eliminations: clone(state.eliminations),
      transcript: clone(state.publicTranscript),
    },
    legalAction: legalActionSpec(state, actorId),
  });
}

export function assertNoHiddenInformation(view, globalState) {
  const actorId = view.you.id;
  const allowedRoleOwners = new Set([actorId, ...(view.privateState.mafiaTeammates ?? []).map((entry) => entry.id)]);
  const walk = (value, path = '$') => {
    if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
    if (!value || typeof value !== 'object') return;
    if ('id' in value && 'role' in value && !allowedRoleOwners.has(value.id)) {
      throw new ValidationError(`Hidden role exposed at ${path}`, { playerId: value.id });
    }
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
  };
  walk(view);
  const viewText = canonicalJson(view);
  for (const player of globalState.players) {
    if (allowedRoleOwners.has(player.id)) continue;
    const signature = canonicalJson({ id: player.id, role: player.role });
    if (viewText.includes(signature.slice(1, -1))) {
      throw new ValidationError('Hidden role signature exposed', { playerId: player.id });
    }
  }
  return true;
}

export function validateDecision(state, actorId, decision) {
  assert(requiredActors(state).includes(actorId), `${actorId} is not eligible in ${state.phase}`);
  assert(decision && typeof decision === 'object' && !Array.isArray(decision), 'Decision must be an object');
  assert(decision.action && typeof decision.action === 'object' && !Array.isArray(decision.action), 'Decision.action must be an object');
  const spec = legalActionSpec(state, actorId);
  assert(decision.action.type === spec.actionType, `Expected action ${spec.actionType}, received ${decision.action.type}`);
  const targetId = decision.action.targetId ?? null;
  if (spec.targetRequired) assert(typeof targetId === 'string', `${spec.actionType} requires targetId`);
  if (targetId !== null) assert(spec.targetIds.includes(targetId), `Illegal target ${targetId} for ${actorId}`);
  const speech = decision.speech ?? '';
  assert(typeof speech === 'string' && speech.length <= 800, 'speech must be a string of at most 800 characters');
  if (spec.speechRequired) assert(speech.trim().length > 0, 'Discussion requires non-empty speech');
  const beliefs = decision.beliefs ?? [];
  assert(Array.isArray(beliefs) && beliefs.length <= state.players.length, 'beliefs must be a bounded array');
  for (const belief of beliefs) {
    assert(typeof belief.subjectId === 'string', 'Belief subjectId must be a string');
    assert(typeof belief.probabilityMafia === 'number' && belief.probabilityMafia >= 0 && belief.probabilityMafia <= 1, 'Belief probability must be 0–1');
  }
  return true;
}

export function deterministicFallback(state, actorId, reasonCode = 'fallback') {
  const spec = legalActionSpec(state, actorId);
  const targetId = spec.targetIds.length > 0
    ? deterministicPick(state.seed, `${reasonCode}:${state.round}:${state.phase}:${actorId}`, spec.targetIds)
    : null;
  return {
    speech: state.phase === 'day_discussion'
      ? `I am relying on the public record and currently suspect ${targetId ? playerName(state, targetId) : 'no one strongly enough to name'}.`
      : '',
    action: { type: spec.actionType, targetId },
    beliefs: [],
  };
}

function pluralityTarget(state, entries, actionType, label) {
  const counts = new Map();
  for (const entry of entries) {
    if (entry.decision.action.type !== actionType) continue;
    const targetId = entry.decision.action.targetId ?? null;
    if (targetId) counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  }
  if (counts.size === 0) return { targetId: null, tieCandidates: [], counts: {} };
  const highest = Math.max(...counts.values());
  const candidates = [...counts.entries()].filter(([, count]) => count === highest).map(([id]) => id).sort();
  return {
    targetId: candidates.length === 1 ? candidates[0] : deterministicPick(state.seed, `${label}:${state.round}`, candidates),
    tieCandidates: candidates.length > 1 ? candidates : [],
    counts: Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

function sanitizeMeta(meta = {}) {
  const dispositions = new Set(['accepted', 'invalid', 'timed_out', 'refused', 'unavailable', 'cancelled']);
  return {
    fallback: Boolean(meta.fallback),
    disposition: dispositions.has(meta.disposition) ? meta.disposition : (meta.fallback ? 'invalid' : 'accepted'),
    failureKind: ['transport', 'semantic', null].includes(meta.failureKind) ? meta.failureKind : null,
    reasonCode: typeof meta.reasonCode === 'string' ? meta.reasonCode.slice(0, 100) : null,
    requestId: typeof meta.requestId === 'string' ? meta.requestId.slice(0, 120) : null,
    observationHash: typeof meta.observationHash === 'string' ? meta.observationHash : null,
  };
}

export class MafiaGame {
  constructor(manifest) {
    this.manifest = canonicalize(manifest);
    this.initialState = createInitialState(this.manifest);
    this.runId = this.initialState.runId;
    this.store = new EventStore(this.runId, this.initialState, reduceMafiaEvent);
    this.barrierIndex = 0;
  }

  get state() { return clone(this.store.state); }
  get events() { return clone(this.store.events); }

  initialize() {
    assert(this.store.state.status === 'created', 'Game is already initialized');
    this.store.commit('roles_assigned', { assignments: assignRoles(this.store.state) }, { visibility: 'research' });
    this.store.commit('game_started', {
      roster: this.store.state.players.map(({ id, name, provider, model, seat }) => ({ id, name, provider, model, seat })),
    }, { visibility: 'public' });
    this.#startPhase('night_mafia', 1);
    return this;
  }

  currentBarrier() {
    if (this.store.state.status !== 'running') return null;
    this.#advanceEmptyPhases();
    if (this.store.state.status !== 'running') return null;
    const actors = requiredActors(this.store.state);
    const preStateHash = sha256(this.store.state);
    const barrierId = stableId('barrier', {
      runId: this.runId,
      barrierIndex: this.barrierIndex,
      phase: this.store.state.phase,
      round: this.store.state.round,
      preStateHash,
      actors,
    }, 20);
    return {
      barrierId,
      barrierIndex: this.barrierIndex,
      phase: this.store.state.phase,
      round: this.store.state.round,
      preStateHash,
      actors,
      observations: Object.fromEntries(actors.map((actorId) => {
        const view = buildAgentView(this.store.state, actorId);
        assertNoHiddenInformation(view, this.store.state);
        return [actorId, { view, observationHash: sha256(view) }];
      })),
    };
  }

  resolveBarrier(barrier, submissions) {
    assert(barrier && barrier.barrierIndex === this.barrierIndex, 'Barrier is stale or unknown');
    assert(barrier.preStateHash === sha256(this.store.state), 'Authoritative state changed after barrier freeze');
    const expectedActors = requiredActors(this.store.state);
    assert(canonicalJson(expectedActors) === canonicalJson(barrier.actors), 'Eligible actor set changed');
    const byActor = new Map(submissions.map((entry) => [entry.actorId, entry]));
    assert(byActor.size === expectedActors.length, 'Barrier requires exactly one submission per actor');
    const entries = expectedActors.map((actorId) => {
      const submission = byActor.get(actorId);
      assert(submission, `Missing submission for ${actorId}`);
      validateDecision(this.store.state, actorId, submission.decision);
      const expectedObservationHash = barrier.observations[actorId].observationHash;
      const meta = sanitizeMeta(submission.meta);
      assert(meta.observationHash === expectedObservationHash, `Observation hash mismatch for ${actorId}`);
      return { actorId, decision: canonicalize(submission.decision), meta };
    });
    this.store.commit('barrier_committed', {
      barrierId: barrier.barrierId,
      preStateHash: barrier.preStateHash,
      phase: barrier.phase,
      round: barrier.round,
      entries,
    }, { visibility: 'research' });
    this.barrierIndex += 1;
    this.#resolvePhase(entries);
    this.#advanceEmptyPhases();
  }

  #startPhase(phase, round = this.store.state.round) {
    assert(PHASES.includes(phase), `Unknown phase ${phase}`);
    this.store.commit('phase_started', { phase, round }, { visibility: 'public' });
  }

  #resolvePhase(entries) {
    const phase = this.store.state.phase;
    if (phase === 'night_mafia') {
      const result = pluralityTarget(this.store.state, entries, 'kill', 'night-mafia');
      this.store.commit('secret_resolved', { kind: 'mafia_target', ...result }, { visibility: 'team', audience: aliveRole(this.store.state, 'mafia').map((player) => player.id) });
      this.#startPhase('night_doctor');
      return;
    }
    if (phase === 'night_doctor') {
      const targetId = entries[0]?.decision.action.targetId ?? null;
      this.store.commit('secret_resolved', { kind: 'protection', targetId }, { visibility: 'private', audience: entries[0] ? [entries[0].actorId] : [] });
      this.#startPhase('night_detective');
      return;
    }
    if (phase === 'night_detective') {
      const detectiveId = entries[0]?.actorId ?? null;
      const targetId = entries[0]?.decision.action.targetId ?? null;
      const target = this.store.state.players.find((player) => player.id === targetId);
      this.store.commit('secret_resolved', {
        kind: 'investigation',
        detectiveId,
        targetId,
        alignment: target ? (target.role === 'mafia' ? 'mafia' : 'village') : null,
      }, { visibility: 'private', audience: detectiveId ? [detectiveId] : [] });
      this.#resolveNight();
      return;
    }
    if (phase === 'day_discussion') {
      this.store.commit('discussion_resolved', {
        statements: entries.map((entry) => ({
          actorId: entry.actorId,
          speech: entry.decision.speech.trim(),
          accusationId: entry.decision.action.targetId ?? null,
        })),
      }, { visibility: 'public' });
      this.#startPhase('day_vote');
      return;
    }
    if (phase === 'day_vote') {
      const result = pluralityTarget(this.store.state, entries, 'vote', 'day-vote');
      this.store.commit('vote_resolved', {
        votes: entries.map((entry) => ({ voterId: entry.actorId, targetId: entry.decision.action.targetId ?? null })),
        eliminatedId: result.targetId,
        tieCandidates: result.tieCandidates,
        counts: result.counts,
      }, { visibility: 'public' });
      if (this.#completeIfNeeded()) return;
      if (this.store.state.round >= this.store.state.rules.maxRounds) {
        this.store.commit('game_completed', { winner: 'draw', reason: 'max_rounds' }, { visibility: 'public' });
        return;
      }
      this.#startPhase('night_mafia', this.store.state.round + 1);
      return;
    }
    throw new ValidationError(`Cannot resolve phase ${phase}`);
  }

  #resolveNight() {
    const eliminatedId = this.store.state.night.mafiaTargetId && this.store.state.night.mafiaTargetId !== this.store.state.night.protectedTargetId
      ? this.store.state.night.mafiaTargetId
      : null;
    this.store.commit('night_resolved', {
      eliminatedId,
      hadProtection: Boolean(this.store.state.night.protectedTargetId),
    }, { visibility: 'public' });
    if (!this.#completeIfNeeded()) this.#startPhase('day_discussion');
  }

  #completeIfNeeded() {
    const winner = winnerFor(this.store.state);
    if (!winner) return false;
    this.store.commit('game_completed', { winner, reason: 'win_condition' }, { visibility: 'public' });
    return true;
  }

  #advanceEmptyPhases() {
    let guard = 0;
    while (this.store.state.status === 'running' && requiredActors(this.store.state).length === 0) {
      guard += 1;
      assert(guard <= 8, 'Empty-phase auto-advance exceeded safety limit');
      if (this.store.state.phase === 'night_doctor') {
        this.store.commit('barrier_committed', {
          barrierId: stableId('barrier', { runId: this.runId, barrierIndex: this.barrierIndex, empty: true }),
          preStateHash: sha256(this.store.state), phase: 'night_doctor', round: this.store.state.round, entries: [],
        }, { visibility: 'research' });
        this.barrierIndex += 1;
        this.store.commit('secret_resolved', { kind: 'protection', targetId: null }, { visibility: 'research' });
        this.#startPhase('night_detective');
        continue;
      }
      if (this.store.state.phase === 'night_detective') {
        this.store.commit('barrier_committed', {
          barrierId: stableId('barrier', { runId: this.runId, barrierIndex: this.barrierIndex, empty: true }),
          preStateHash: sha256(this.store.state), phase: 'night_detective', round: this.store.state.round, entries: [],
        }, { visibility: 'research' });
        this.barrierIndex += 1;
        this.store.commit('secret_resolved', { kind: 'investigation', detectiveId: null, targetId: null, alignment: null }, { visibility: 'research' });
        this.#resolveNight();
        continue;
      }
      const winner = winnerFor(this.store.state);
      if (winner) this.store.commit('game_completed', { winner, reason: 'win_condition' }, { visibility: 'public' });
      else throw new ValidationError(`No eligible actors in actionable phase ${this.store.state.phase}`);
    }
  }

  verify() { return this.store.verify(); }
}

function projectPublicEvent(stateAfter, event) {
  const base = {
    schemaVersion: '1.0.0',
    sequence: event.sequence,
    logicalTime: event.logicalTime,
    canonicalEventHash: event.eventHash,
    type: event.type,
    round: stateAfter.round,
    phase: stateAfter.phase,
  };
  if (event.type === 'game_started') return { ...base, payload: clone(event.payload) };
  if (event.type === 'phase_started') return { ...base, payload: clone(event.payload) };
  if (event.type === 'night_resolved') return {
    ...base,
    payload: {
      eliminatedId: event.payload.eliminatedId,
      headline: event.payload.eliminatedId ? `${playerName(stateAfter, event.payload.eliminatedId)} was eliminated overnight.` : 'Everyone survived the night.',
    },
  };
  if (event.type === 'discussion_resolved') return { ...base, payload: clone(event.payload) };
  if (event.type === 'vote_resolved') return {
    ...base,
    payload: {
      votes: clone(event.payload.votes),
      eliminatedId: event.payload.eliminatedId,
      tieCandidates: clone(event.payload.tieCandidates),
      headline: event.payload.eliminatedId ? `${playerName(stateAfter, event.payload.eliminatedId)} was voted out.` : 'The vote ended without an elimination.',
    },
  };
  if (event.type === 'game_completed') return {
    ...base,
    payload: {
      winner: event.payload.winner,
      reason: event.payload.reason,
      roles: stateAfter.rules.revealRolesAtEnd ? stateAfter.players.map(({ id, role }) => ({ id, role })) : [],
    },
  };
  return null;
}

export function buildPublicFrames(roster, publicEvents) {
  const projection = {
    frame: 0,
    eventSequence: 0,
    round: 0,
    phase: 'setup',
    status: 'running',
    winner: null,
    headline: 'Preparing the arena.',
    players: roster.map((player) => ({ ...player, alive: true, role: null })),
    transcript: [],
    votes: [],
  };
  const frames = [clone(projection)];
  for (const event of publicEvents) {
    projection.frame += 1;
    projection.eventSequence = event.sequence;
    projection.round = event.round;
    projection.phase = event.phase;
    if (event.type === 'phase_started') projection.headline = `${event.payload.phase.replaceAll('_', ' ')} · round ${event.payload.round}`;
    if (event.type === 'night_resolved') {
      projection.headline = event.payload.headline;
      if (event.payload.eliminatedId) {
        const player = projection.players.find((candidate) => candidate.id === event.payload.eliminatedId);
        if (player) player.alive = false;
      }
      projection.transcript.push({ speakerId: 'host', text: event.payload.headline, round: event.round, phase: 'night' });
    }
    if (event.type === 'discussion_resolved') {
      for (const statement of event.payload.statements) projection.transcript.push({
        speakerId: statement.actorId,
        text: statement.speech,
        accusationId: statement.accusationId,
        round: event.round,
        phase: 'day_discussion',
      });
      projection.headline = `${event.payload.statements.length} agents addressed the table.`;
    }
    if (event.type === 'vote_resolved') {
      projection.votes = clone(event.payload.votes);
      projection.headline = event.payload.headline;
      if (event.payload.eliminatedId) {
        const player = projection.players.find((candidate) => candidate.id === event.payload.eliminatedId);
        if (player) player.alive = false;
      }
      projection.transcript.push({ speakerId: 'host', text: event.payload.headline, round: event.round, phase: 'day_vote' });
    }
    if (event.type === 'game_completed') {
      projection.status = 'completed';
      projection.phase = 'complete';
      projection.winner = event.payload.winner;
      projection.headline = event.payload.winner === 'draw' ? 'The match ended in a draw.' : `${event.payload.winner} wins.`;
      for (const reveal of event.payload.roles) {
        const player = projection.players.find((candidate) => candidate.id === reveal.id);
        if (player) player.role = reveal.role;
      }
    }
    frames.push(clone(projection));
  }
  return frames;
}

export function createPublicArtifact(game, providerSummary = {}) {
  const verification = game.verify();
  assert(verification.verified, 'Cannot publish an unverified run', verification.errors);
  let replayState = clone(game.initialState);
  const publicEvents = [];
  for (const event of game.events) {
    replayState = reduceMafiaEvent(replayState, event);
    if (event.visibility !== 'public') continue;
    const projected = projectPublicEvent(replayState, event);
    if (projected) publicEvents.push(projected);
  }
  const roster = game.state.players.map(({ id, name, provider, model, seat }) => ({ id, name, provider, model, seat }));
  const artifact = {
    schemaVersion: '1.0.0',
    runId: game.runId,
    gameId: GAME_ID,
    seed: game.state.seed,
    status: game.state.status,
    winner: game.state.winner,
    roster,
    publicEvents,
    frames: buildPublicFrames(roster, publicEvents),
    metrics: {
      rounds: game.state.round,
      canonicalEventCount: game.events.length,
      publicEventCount: publicEvents.length,
      decisions: game.state.counters.acceptedDecisions + game.state.counters.deterministicFallbacks,
      fallbacks: game.state.counters.deterministicFallbacks,
      timeouts: game.state.counters.timeouts,
      transportFailures: game.state.counters.transportFailures,
      semanticFailures: game.state.counters.semanticFailures,
      refusals: game.state.counters.refusals,
      providerCalls: providerSummary.providerCalls ?? 0,
      estimatedCostUsd: providerSummary.estimatedCostUsd ?? null,
    },
    integrity: {
      verified: true,
      chainHead: verification.chainHead,
      finalStateHash: verification.finalStateHash,
      eventCount: verification.eventCount,
      manifestHash: sha256(game.manifest),
      publicDigest: null,
    },
  };
  artifact.integrity.publicDigest = sha256(artifact);
  return canonicalize(artifact);
}

export function createCanonicalArtifact(game, providerArtifacts = []) {
  const verification = game.verify();
  return canonicalize({
    schemaVersion: '1.0.0',
    runId: game.runId,
    manifest: clone(game.manifest),
    initialState: clone(game.initialState),
    events: clone(game.events),
    providerArtifacts: clone(providerArtifacts),
    integrity: {
      verified: verification.verified,
      errors: verification.errors,
      chainHead: verification.chainHead,
      finalStateHash: verification.finalStateHash,
      eventCount: verification.eventCount,
    },
  });
}
