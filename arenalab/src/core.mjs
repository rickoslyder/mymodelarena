import { createHash, timingSafeEqual } from 'node:crypto';

export class ArenaError extends Error {
  constructor(message, code = 'ARENA_ERROR', details = undefined, options = undefined) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ArenaError {
  constructor(message, details = undefined, options = undefined) {
    super(message, 'VALIDATION_ERROR', details, options);
  }
}

export class IntegrityError extends ArenaError {
  constructor(message, details = undefined, options = undefined) {
    super(message, 'INTEGRITY_ERROR', details, options);
  }
}

export function assert(condition, message, details = undefined) {
  if (!condition) throw new ValidationError(message, details);
}

export function canonicalize(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ValidationError(`Non-finite number at ${path}`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => canonicalize(entry, `${path}[${index}]`));
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ValidationError(`Only plain objects can be canonicalized at ${path}`);
    }
    const output = {};
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      if (typeof child === 'undefined') throw new ValidationError(`Undefined value at ${path}.${key}`);
      output[key] = canonicalize(child, `${path}.${key}`);
    }
    return output;
  }
  throw new ValidationError(`Unsupported ${typeof value} at ${path}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function clone(value) {
  return structuredClone(value);
}

export function sha256(value) {
  const input = typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalJson(value);
  return createHash('sha256').update(input).digest('hex');
}

export function stableId(prefix, value, length = 18) {
  return `${prefix}_${sha256(value).slice(0, length)}`;
}

export function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left ?? ''));
  const b = Buffer.from(String(right ?? ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export class DeterministicRng {
  constructor(seed, stream = 'default') {
    const digest = sha256(`${String(seed)}\u0000${stream}`);
    this.state = BigInt(`0x${digest.slice(0, 16)}`) || 0x9e3779b97f4a7c15n;
  }

  nextUint64() {
    let x = this.state;
    x ^= x >> 12n;
    x ^= x << 25n;
    x ^= x >> 27n;
    this.state = x & ((1n << 64n) - 1n);
    return (this.state * 2685821657736338717n) & ((1n << 64n) - 1n);
  }

  next() {
    return Number(this.nextUint64() >> 11n) / 9_007_199_254_740_992;
  }

  int(maxExclusive) {
    assert(Number.isSafeInteger(maxExclusive) && maxExclusive > 0, 'maxExclusive must be a positive safe integer');
    return Number(this.nextUint64() % BigInt(maxExclusive));
  }

  pick(values) {
    assert(Array.isArray(values) && values.length > 0, 'Cannot choose from an empty collection');
    return values[this.int(values.length)];
  }

  shuffle(values) {
    const output = [...values];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swap = this.int(index + 1);
      [output[index], output[swap]] = [output[swap], output[index]];
    }
    return output;
  }
}

export function deterministicPick(seed, label, values) {
  const sorted = [...values].sort();
  assert(sorted.length > 0, 'Cannot choose from an empty collection');
  const digest = sha256({ seed: String(seed), label, values: sorted });
  return sorted[Number(BigInt(`0x${digest.slice(0, 14)}`) % BigInt(sorted.length))];
}

function hashableEvent(event) {
  const { wallTime: _wallTime, eventHash: _eventHash, ...hashable } = event;
  return hashable;
}

export function createCanonicalEvent({
  runId,
  sequence,
  logicalTime,
  type,
  actorId = null,
  visibility = 'public',
  audience = [],
  payload,
  previousEventHash,
  stateHashBefore,
  stateHashAfter,
  provenance = { source: 'kernel', producerVersion: 'arenalab/1.0.0' },
  wallTime = undefined,
}) {
  const base = {
    schemaVersion: '1.0.0',
    runId,
    eventId: `evt_${runId}_${String(sequence).padStart(6, '0')}`,
    sequence,
    logicalTime,
    ...(wallTime ? { wallTime } : {}),
    type,
    actorId,
    visibility,
    audience: [...audience].sort(),
    payload: canonicalize(payload),
    previousEventHash,
    stateHashBefore,
    stateHashAfter,
    provenance: canonicalize(provenance),
  };
  return { ...base, eventHash: sha256(hashableEvent(base)) };
}

export class EventStore {
  constructor(runId, initialState, reducer) {
    assert(typeof runId === 'string' && runId.length > 0, 'runId is required');
    this.runId = runId;
    this.initialState = clone(initialState);
    this.initialStateHash = sha256(initialState);
    this.genesisHash = sha256({ runId, initialStateHash: this.initialStateHash });
    this.state = clone(initialState);
    this.reducer = reducer;
    this.events = [];
    this.logicalTime = 0;
  }

  commit(type, payload, options = {}) {
    const sequence = this.events.length + 1;
    const logicalTime = options.logicalTime ?? this.logicalTime + 1;
    assert(Number.isSafeInteger(logicalTime) && logicalTime > this.logicalTime, 'Logical time must advance');
    const stateBefore = clone(this.state);
    const stateHashBefore = sha256(stateBefore);
    const reducerEvent = {
      type,
      actorId: options.actorId ?? null,
      payload: canonicalize(payload),
      sequence,
      logicalTime,
    };
    const stateAfter = canonicalize(this.reducer(stateBefore, reducerEvent));
    const stateHashAfter = sha256(stateAfter);
    const event = createCanonicalEvent({
      runId: this.runId,
      sequence,
      logicalTime,
      type,
      actorId: options.actorId ?? null,
      visibility: options.visibility ?? 'public',
      audience: options.audience ?? [],
      payload,
      previousEventHash: this.events.at(-1)?.eventHash ?? this.genesisHash,
      stateHashBefore,
      stateHashAfter,
      provenance: options.provenance,
      wallTime: options.wallTime,
    });
    this.events.push(event);
    this.state = stateAfter;
    this.logicalTime = logicalTime;
    return clone(event);
  }

  verify() {
    return verifyEventChain(this.runId, this.initialState, this.events, this.reducer);
  }
}

export function verifyEventChain(runId, initialState, events, reducer) {
  let state = canonicalize(initialState);
  let previousEventHash = sha256({ runId, initialStateHash: sha256(initialState) });
  let previousLogicalTime = 0;
  const errors = [];

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const expectedSequence = index + 1;
    if (event.runId !== runId) errors.push(`Event ${event.eventId}: runId mismatch`);
    if (event.sequence !== expectedSequence) errors.push(`Event ${event.eventId}: expected sequence ${expectedSequence}`);
    if (event.logicalTime <= previousLogicalTime) errors.push(`Event ${event.eventId}: logical time did not advance`);
    if (event.previousEventHash !== previousEventHash) errors.push(`Event ${event.eventId}: previous hash mismatch`);
    if (event.stateHashBefore !== sha256(state)) errors.push(`Event ${event.eventId}: pre-state hash mismatch`);
    const expectedHash = sha256(hashableEvent(event));
    if (expectedHash !== event.eventHash) errors.push(`Event ${event.eventId}: event hash mismatch`);
    try {
      state = canonicalize(reducer(clone(state), {
        type: event.type,
        actorId: event.actorId,
        payload: clone(event.payload),
        sequence: event.sequence,
        logicalTime: event.logicalTime,
      }));
    } catch (error) {
      errors.push(`Event ${event.eventId}: reducer failed: ${error instanceof Error ? error.message : String(error)}`);
      break;
    }
    if (event.stateHashAfter !== sha256(state)) errors.push(`Event ${event.eventId}: post-state hash mismatch`);
    previousEventHash = event.eventHash;
    previousLogicalTime = event.logicalTime;
  }

  return {
    verified: errors.length === 0,
    errors,
    eventCount: events.length,
    chainHead: previousEventHash,
    finalStateHash: sha256(state),
    finalState: clone(state),
  };
}

export function redactHeaders(headers = {}) {
  const safe = /^(content-type|date|request-id|x-request-id|openai-version|openai-processing-ms|x-ratelimit-|anthropic-ratelimit-|x-goog-)/i;
  return Object.fromEntries(Object.entries(headers).filter(([key]) => safe.test(key)).map(([key, value]) => [key.toLowerCase(), String(value)]));
}
