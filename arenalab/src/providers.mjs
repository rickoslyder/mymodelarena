import {
  ArenaError,
  ValidationError,
  assert,
  canonicalize,
  clone,
  redactHeaders,
  sha256,
  stableId,
} from './core.mjs';

export class ProviderError extends ArenaError {
  constructor(message, {
    kind = 'transport',
    retryable = false,
    statusCode = null,
    responseBody = null,
    cause = undefined,
  } = {}) {
    super(message, 'PROVIDER_ERROR', { kind, retryable, statusCode, responseBody }, { cause });
    this.kind = kind;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export const DECISION_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    speech: { type: 'string', maxLength: 800 },
    action: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['kill', 'protect', 'inspect', 'speak', 'vote'] },
        targetId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
      required: ['type', 'targetId'],
    },
    beliefs: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          subjectId: { type: 'string' },
          probabilityMafia: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['subjectId', 'probabilityMafia'],
      },
    },
  },
  required: ['speech', 'action', 'beliefs'],
});

function classifyStatus(status) {
  if (status === 401 || status === 403) return { kind: 'authentication', retryable: false };
  if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) {
    return { kind: 'transport', retryable: true };
  }
  return { kind: 'invalid_request', retryable: false };
}

async function parseResponseJson(response, providerName) {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return canonicalize(JSON.parse(text));
  } catch (error) {
    throw new ProviderError(`${providerName} returned non-JSON content`, {
      kind: 'invalid_response',
      retryable: false,
      statusCode: response.status,
      responseBody: text.slice(0, 8_000),
      cause: error,
    });
  }
}

async function postJson({ providerName, url, headers, body, signal, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error;
    throw new ProviderError(`${providerName} request failed before a response was received`, {
      kind: 'transport', retryable: true, cause: error,
    });
  }
  const responseBody = await parseResponseJson(response, providerName);
  if (!response.ok) {
    throw new ProviderError(`${providerName} returned HTTP ${response.status}`, {
      ...classifyStatus(response.status),
      statusCode: response.status,
      responseBody,
    });
  }
  return {
    response,
    responseBody,
    responseHeaders: redactHeaders(Object.fromEntries(response.headers.entries())),
  };
}

function parseJsonString(text, providerName, responseBody) {
  try {
    return canonicalize(JSON.parse(text));
  } catch (error) {
    throw new ProviderError(`${providerName} structured output was not valid JSON`, {
      kind: 'invalid_response', retryable: false, responseBody, cause: error,
    });
  }
}

function usageFields(inputTokens = null, outputTokens = null, totalTokens = null, extras = {}) {
  return canonicalize({ inputTokens, outputTokens, totalTokens, ...extras });
}

export class ScriptedAdapter {
  constructor(policy, { adapterVersion = 'scripted/1.0.0' } = {}) {
    assert(typeof policy === 'function', 'ScriptedAdapter requires a policy function');
    this.id = 'scripted';
    this.adapterVersion = adapterVersion;
    this.policy = policy;
  }

  async invoke(invocation, signal) {
    if (signal.aborted) throw signal.reason;
    const output = await this.policy(clone(invocation));
    if (signal.aborted) throw signal.reason;
    return canonicalize({
      provider: this.id,
      adapterVersion: this.adapterVersion,
      requestId: invocation.requestId,
      providerRequestId: invocation.requestId,
      responseId: stableId('scripted', { requestId: invocation.requestId, output }),
      requestedModel: invocation.model,
      resolvedModel: invocation.model,
      finishReason: 'completed',
      output,
      requestBody: {
        model: invocation.model,
        systemPrompt: invocation.systemPrompt,
        userPrompt: invocation.userPrompt,
        decisionSchema: invocation.decisionSchema,
        metadata: invocation.metadata,
      },
      responseBody: { output },
      responseHeaders: {},
      usage: usageFields(0, 0, 0),
    });
  }
}

export class OpenAIAdapter {
  constructor({
    apiKey = process.env.OPENAI_API_KEY ?? '',
    baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    organization = process.env.OPENAI_ORG_ID,
    project = process.env.OPENAI_PROJECT_ID,
    fetchImpl = fetch,
  } = {}) {
    this.id = 'openai';
    this.adapterVersion = 'openai-responses/1.0.0';
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.organization = organization;
    this.project = project;
    this.fetchImpl = fetchImpl;
  }

  async invoke(invocation, signal) {
    if (!this.apiKey) throw new ProviderError('OPENAI_API_KEY is not configured', { kind: 'authentication' });
    const body = {
      model: invocation.model,
      instructions: invocation.systemPrompt,
      input: invocation.userPrompt,
      max_output_tokens: invocation.maxOutputTokens,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'arenalab_decision',
          strict: true,
          schema: invocation.decisionSchema,
        },
      },
      metadata: { arenalab_request_id: invocation.requestId.slice(0, 64) },
    };
    const { response, responseBody, responseHeaders } = await postJson({
      providerName: 'OpenAI',
      url: `${this.baseUrl}/responses`,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
        'x-client-request-id': invocation.requestId,
        ...(this.organization ? { 'openai-organization': this.organization } : {}),
        ...(this.project ? { 'openai-project': this.project } : {}),
      },
      body,
      signal,
      fetchImpl: this.fetchImpl,
    });
    const outputText = typeof responseBody?.output_text === 'string'
      ? responseBody.output_text
      : responseBody?.output?.flatMap((item) => item?.content ?? []).find((block) => block?.type === 'output_text')?.text;
    const refusal = responseBody?.output?.flatMap((item) => item?.content ?? []).find((block) => block?.type === 'refusal')?.refusal;
    if (refusal) throw new ProviderError(`OpenAI refused the decision request: ${refusal}`, { kind: 'refusal', responseBody });
    if (typeof outputText !== 'string') throw new ProviderError('OpenAI response contained no output_text block', { kind: 'invalid_response', responseBody });
    const usage = responseBody?.usage ?? {};
    return canonicalize({
      provider: this.id,
      adapterVersion: this.adapterVersion,
      requestId: invocation.requestId,
      providerRequestId: response.headers.get('x-request-id'),
      responseId: responseBody?.id ?? null,
      requestedModel: invocation.model,
      resolvedModel: responseBody?.model ?? null,
      finishReason: responseBody?.status ?? null,
      output: parseJsonString(outputText, 'OpenAI', responseBody),
      requestBody: body,
      responseBody,
      responseHeaders,
      usage: usageFields(
        Number.isFinite(usage.input_tokens) ? usage.input_tokens : null,
        Number.isFinite(usage.output_tokens) ? usage.output_tokens : null,
        Number.isFinite(usage.total_tokens) ? usage.total_tokens : null,
        {
          cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? null,
          reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? null,
        },
      ),
    });
  }
}

export class AnthropicAdapter {
  constructor({
    apiKey = process.env.ANTHROPIC_API_KEY ?? '',
    baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
    apiVersion = process.env.ANTHROPIC_API_VERSION ?? '2023-06-01',
    fetchImpl = fetch,
  } = {}) {
    this.id = 'anthropic';
    this.adapterVersion = 'anthropic-messages/1.0.0';
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiVersion = apiVersion;
    this.fetchImpl = fetchImpl;
  }

  async invoke(invocation, signal) {
    if (!this.apiKey) throw new ProviderError('ANTHROPIC_API_KEY is not configured', { kind: 'authentication' });
    const body = {
      model: invocation.model,
      max_tokens: invocation.maxOutputTokens,
      system: invocation.systemPrompt,
      messages: [{ role: 'user', content: invocation.userPrompt }],
      tools: [{
        name: 'submit_decision',
        description: 'Submit exactly one complete ArenaLab game decision.',
        input_schema: invocation.decisionSchema,
      }],
      tool_choice: { type: 'tool', name: 'submit_decision', disable_parallel_tool_use: true },
    };
    const { response, responseBody, responseHeaders } = await postJson({
      providerName: 'Anthropic',
      url: `${this.baseUrl}/v1/messages`,
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
        'content-type': 'application/json',
      },
      body,
      signal,
      fetchImpl: this.fetchImpl,
    });
    const toolCalls = (responseBody?.content ?? []).filter((block) => block?.type === 'tool_use' && block?.name === 'submit_decision');
    if (toolCalls.length !== 1) throw new ProviderError(`Anthropic returned ${toolCalls.length} submit_decision calls; expected one`, { kind: 'invalid_response', responseBody });
    const usage = responseBody?.usage ?? {};
    const inputTokens = Number.isFinite(usage.input_tokens) ? usage.input_tokens : null;
    const outputTokens = Number.isFinite(usage.output_tokens) ? usage.output_tokens : null;
    return canonicalize({
      provider: this.id,
      adapterVersion: this.adapterVersion,
      requestId: invocation.requestId,
      providerRequestId: response.headers.get('request-id') ?? response.headers.get('x-request-id'),
      responseId: responseBody?.id ?? null,
      requestedModel: invocation.model,
      resolvedModel: responseBody?.model ?? null,
      finishReason: responseBody?.stop_reason ?? null,
      output: canonicalize(toolCalls[0].input),
      requestBody: body,
      responseBody,
      responseHeaders,
      usage: usageFields(inputTokens, outputTokens, inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null, {
        cachedInputTokens: usage.cache_read_input_tokens ?? null,
      }),
    });
  }
}

export class GeminiAdapter {
  constructor({
    apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '',
    baseUrl = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com',
    apiVersion = process.env.GEMINI_API_VERSION ?? 'v1beta',
    fetchImpl = fetch,
  } = {}) {
    this.id = 'gemini';
    this.adapterVersion = 'gemini-generate-content/1.0.0';
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiVersion = apiVersion;
    this.fetchImpl = fetchImpl;
  }

  async invoke(invocation, signal) {
    if (!this.apiKey) throw new ProviderError('GEMINI_API_KEY is not configured', { kind: 'authentication' });
    const body = {
      systemInstruction: { parts: [{ text: invocation.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: invocation.userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: invocation.decisionSchema,
        maxOutputTokens: invocation.maxOutputTokens,
      },
    };
    const { response, responseBody, responseHeaders } = await postJson({
      providerName: 'Gemini',
      url: `${this.baseUrl}/${this.apiVersion}/models/${encodeURIComponent(invocation.model)}:generateContent`,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
      body,
      signal,
      fetchImpl: this.fetchImpl,
    });
    const candidate = responseBody?.candidates?.[0];
    const outputText = candidate?.content?.parts?.find((part) => typeof part?.text === 'string')?.text;
    if (typeof outputText !== 'string') throw new ProviderError('Gemini response contained no text part', { kind: 'invalid_response', responseBody });
    const usage = responseBody?.usageMetadata ?? {};
    return canonicalize({
      provider: this.id,
      adapterVersion: this.adapterVersion,
      requestId: invocation.requestId,
      providerRequestId: response.headers.get('x-request-id') ?? response.headers.get('x-guploader-uploadid'),
      responseId: responseBody?.responseId ?? null,
      requestedModel: invocation.model,
      resolvedModel: responseBody?.modelVersion ?? null,
      finishReason: candidate?.finishReason ?? null,
      output: parseJsonString(outputText, 'Gemini', responseBody),
      requestBody: body,
      responseBody,
      responseHeaders,
      usage: usageFields(
        Number.isFinite(usage.promptTokenCount) ? usage.promptTokenCount : null,
        Number.isFinite(usage.candidatesTokenCount) ? usage.candidatesTokenCount : null,
        Number.isFinite(usage.totalTokenCount) ? usage.totalTokenCount : null,
        {
          cachedInputTokens: usage.cachedContentTokenCount ?? null,
          reasoningTokens: usage.thoughtsTokenCount ?? null,
        },
      ),
    });
  }
}

export class OpenAICompatibleAdapter {
  constructor({
    apiKey = '',
    baseUrl,
    providerName = 'OpenAI-compatible',
    fetchImpl = fetch,
    extraHeaders = {},
    strictSchema = true,
  }) {
    assert(typeof baseUrl === 'string' && baseUrl.length > 0, 'baseUrl is required');
    this.id = 'openai-compatible';
    this.adapterVersion = 'openai-compatible-chat/1.0.0';
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.providerName = providerName;
    this.fetchImpl = fetchImpl;
    this.extraHeaders = extraHeaders;
    this.strictSchema = strictSchema;
  }

  async invoke(invocation, signal) {
    const body = {
      model: invocation.model,
      messages: [
        { role: 'system', content: invocation.systemPrompt },
        { role: 'user', content: invocation.userPrompt },
      ],
      max_tokens: invocation.maxOutputTokens,
      response_format: this.strictSchema
        ? { type: 'json_schema', json_schema: { name: 'arenalab_decision', strict: true, schema: invocation.decisionSchema } }
        : { type: 'json_object' },
    };
    const { response, responseBody, responseHeaders } = await postJson({
      providerName: this.providerName,
      url: `${this.baseUrl}/chat/completions`,
      headers: {
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        'content-type': 'application/json',
        'x-request-id': invocation.requestId,
        ...this.extraHeaders,
      },
      body,
      signal,
      fetchImpl: this.fetchImpl,
    });
    const choice = responseBody?.choices?.[0];
    const outputText = choice?.message?.content;
    if (typeof outputText !== 'string') throw new ProviderError(`${this.providerName} response contained no message content`, { kind: 'invalid_response', responseBody });
    const usage = responseBody?.usage ?? {};
    return canonicalize({
      provider: this.id,
      adapterVersion: this.adapterVersion,
      requestId: invocation.requestId,
      providerRequestId: response.headers.get('x-request-id'),
      responseId: responseBody?.id ?? null,
      requestedModel: invocation.model,
      resolvedModel: responseBody?.model ?? null,
      finishReason: choice?.finish_reason ?? null,
      output: parseJsonString(outputText, this.providerName, responseBody),
      requestBody: body,
      responseBody,
      responseHeaders,
      usage: usageFields(usage.prompt_tokens ?? null, usage.completion_tokens ?? null, usage.total_tokens ?? null),
    });
  }
}

function validateNormalizedDecisionShape(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Decision output must be an object'];
  if (typeof value.speech !== 'string') errors.push('speech must be a string');
  if (!value.action || typeof value.action !== 'object' || Array.isArray(value.action)) errors.push('action must be an object');
  else {
    if (typeof value.action.type !== 'string') errors.push('action.type must be a string');
    if (!(typeof value.action.targetId === 'string' || value.action.targetId === null)) errors.push('action.targetId must be a string or null');
  }
  if (!Array.isArray(value.beliefs)) errors.push('beliefs must be an array');
  return errors;
}

function linkSignal(source, controller) {
  if (!source) return () => {};
  const abort = () => controller.abort(source.reason);
  if (source.aborted) abort();
  else source.addEventListener('abort', abort, { once: true });
  return () => source.removeEventListener('abort', abort);
}

function sleep(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    const abort = () => { clearTimeout(timer); reject(signal.reason ?? new Error('Aborted')); };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export class AgentGateway {
  constructor({ maxTransportAttempts = 2, retryBaseDelayMs = 200, now = () => new Date() } = {}) {
    assert(Number.isSafeInteger(maxTransportAttempts) && maxTransportAttempts >= 1 && maxTransportAttempts <= 5, 'maxTransportAttempts must be 1–5');
    this.maxTransportAttempts = maxTransportAttempts;
    this.retryBaseDelayMs = Math.max(0, retryBaseDelayMs);
    this.now = now;
  }

  async decide(adapter, invocation, { signal, validateDecision } = {}) {
    const deadline = new AbortController();
    const unlink = linkSignal(signal, deadline);
    const timeout = setTimeout(() => deadline.abort(new ProviderError(`Decision deadline exceeded after ${invocation.timeoutMs}ms`, { kind: 'timed_out' })), invocation.timeoutMs);
    const attempts = [];
    try {
      for (let attempt = 1; attempt <= this.maxTransportAttempts; attempt += 1) {
        const startedAt = this.now();
        try {
          const raw = await adapter.invoke(clone(invocation), deadline.signal);
          const shapeErrors = validateNormalizedDecisionShape(raw.output);
          const semanticErrors = shapeErrors.length === 0 && validateDecision ? validateDecision(raw.output) : [];
          const errors = [...shapeErrors, ...semanticErrors];
          const completedAt = this.now();
          attempts.push(canonicalize({
            attempt,
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            latencyMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
            status: 'succeeded',
            failureKind: null,
            raw,
          }));
          return {
            decision: errors.length === 0 ? clone(raw.output) : null,
            disposition: errors.length === 0 ? 'accepted' : 'invalid',
            failureKind: errors.length === 0 ? null : 'semantic',
            errors,
            raw,
            attempts,
          };
        } catch (caught) {
          let error;
          if (deadline.signal.aborted) {
            error = deadline.signal.reason instanceof ProviderError
              ? deadline.signal.reason
              : new ProviderError(signal?.aborted ? 'Decision was cancelled' : 'Decision timed out', { kind: signal?.aborted ? 'cancelled' : 'timed_out', cause: caught });
          } else {
            error = caught instanceof ProviderError
              ? caught
              : new ProviderError('Provider invocation failed', { kind: 'transport', retryable: true, cause: caught });
          }
          const completedAt = this.now();
          attempts.push(canonicalize({
            attempt,
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            latencyMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
            status: 'failed',
            failureKind: error.kind,
            retryable: error.retryable,
            statusCode: error.statusCode,
            message: error.message,
            responseBody: error.responseBody,
          }));
          const shouldRetry = error.kind === 'transport' && error.retryable && attempt < this.maxTransportAttempts && !deadline.signal.aborted;
          if (shouldRetry) {
            await sleep(this.retryBaseDelayMs * 2 ** (attempt - 1), deadline.signal);
            continue;
          }
          const disposition = error.kind === 'timed_out' ? 'timed_out'
            : error.kind === 'refusal' ? 'refused'
              : error.kind === 'cancelled' ? 'cancelled'
                : ['authentication', 'transport'].includes(error.kind) ? 'unavailable'
                  : 'invalid';
          return {
            decision: null,
            disposition,
            failureKind: error.kind === 'transport' ? 'transport' : (disposition === 'invalid' ? 'semantic' : null),
            errors: [error.message],
            raw: null,
            attempts,
          };
        }
      }
      throw new ValidationError('AgentGateway exhausted attempts without returning');
    } finally {
      clearTimeout(timeout);
      unlink();
    }
  }
}

export function createProviderRequestId({ runId, barrierId, actorId, observationHash }) {
  return stableId('req', { runId, barrierId, actorId, observationHash }, 24);
}

export function providerArtifactDigest(result) {
  return sha256({ attempts: result.attempts, disposition: result.disposition, errors: result.errors });
}
