import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import clientDirectiveAi from '../src/index.js';
import aiReadyDirective, {
  parseDirectiveOptions,
  getAICapability,
  executeFallback,
} from '../src/client.js';
import type { ChromeAI } from '../src/chrome-ai.js';

// Setup DOM globals if not present
if (typeof globalThis.HTMLElement === 'undefined') {
  class MockHTMLElement {
    dataset: Record<string, string> = {};
    children: MockHTMLElement[] = [];
    events: { type: string; event: CustomEvent }[] = [];
    dispatchEvent(event: CustomEvent): boolean {
      this.events.push({ type: event.type, event });
      return true;
    }
  }
  // @ts-ignore
  globalThis.HTMLElement = MockHTMLElement;
}

if (typeof globalThis.CustomEvent === 'undefined') {
  class MockCustomEvent {
    type: string;
    detail: any;
    bubbles: boolean;
    constructor(type: string, params?: { detail?: any; bubbles?: boolean }) {
      this.type = type;
      this.detail = params?.detail;
      this.bubbles = params?.bubbles ?? false;
    }
  }
  // @ts-ignore
  globalThis.CustomEvent = MockCustomEvent;
}

describe('astro-client-directive-ai Integration', () => {
  it('returns AstroIntegration object with correct name and hooks', () => {
    const integration = clientDirectiveAi();
    expect(integration.name).toBe('astro-client-directive-ai');
    expect(integration.hooks['astro:config:setup']).toBeDefined();
  });

  it('calls addClientDirective with ai-ready entrypoint on setup', () => {
    const integration = clientDirectiveAi();
    let registeredDirective: any = null;
    const addClientDirective = (dir: any) => {
      registeredDirective = dir;
    };

    integration.hooks['astro:config:setup']?.({
      addClientDirective,
    } as any);

    expect(registeredDirective).toEqual({
      name: 'ai-ready',
      entrypoint: 'astro-client-directive-ai/client',
    });
  });
});

describe('Option Parsing', () => {
  it('returns default options when value is empty, null or boolean', () => {
    expect(parseDirectiveOptions(undefined)).toEqual({
      feature: 'languageModel',
      fallbackStrategy: 'hydrate',
      timeout: 10000,
      pollInterval: 1000,
      triggerDownload: true,
    });
    expect(parseDirectiveOptions(true)).toEqual({
      feature: 'languageModel',
      fallbackStrategy: 'hydrate',
      timeout: 10000,
      pollInterval: 1000,
      triggerDownload: true,
    });
  });

  it('parses JSON string options', () => {
    const jsonStr = JSON.stringify({
      feature: 'summarizer',
      fallbackStrategy: 'ignore',
      timeout: 5000,
      pollInterval: 500,
      triggerDownload: false,
    });
    const parsed = parseDirectiveOptions(jsonStr);
    expect(parsed).toEqual({
      feature: 'summarizer',
      fallbackStrategy: 'ignore',
      timeout: 5000,
      pollInterval: 500,
      triggerDownload: false,
    });
  });

  it('parses string keywords for features', () => {
    expect(parseDirectiveOptions('summarizer').feature).toBe('summarizer');
    expect(parseDirectiveOptions('writer').feature).toBe('writer');
    expect(parseDirectiveOptions('rewriter').feature).toBe('rewriter');
    expect(parseDirectiveOptions('translator').feature).toBe('translator');
    expect(parseDirectiveOptions('languageModel').feature).toBe('languageModel');
  });

  it('parses string keywords for fallback strategies', () => {
    expect(parseDirectiveOptions('ignore').fallbackStrategy).toBe('ignore');
    expect(parseDirectiveOptions('visible').fallbackStrategy).toBe('visible');
    expect(parseDirectiveOptions('idle').fallbackStrategy).toBe('idle');
    const fallbackParsed = parseDirectiveOptions('fallback');
    expect(fallbackParsed.fallbackStrategy).toBe('hydrate');
    expect(fallbackParsed.timeout).toBe(0);
  });

  it('parses poll and timeout string formats', () => {
    const pollParsed = parseDirectiveOptions('poll:250:5000');
    expect(pollParsed.pollInterval).toBe(250);
    expect(pollParsed.timeout).toBe(5000);

    const timeoutParsed = parseDirectiveOptions('timeout:3000');
    expect(timeoutParsed.timeout).toBe(3000);
  });
});

describe('Capability Checks', () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    (globalThis as any).window = {};
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  it('returns "no" when window.ai is undefined', async () => {
    (globalThis as any).window.ai = undefined;
    const capability = await getAICapability('languageModel');
    expect(capability).toBe('no');
  });

  it('returns "no" when factory capabilities throws an error', async () => {
    (globalThis as any).window.ai = {
      languageModel: {
        capabilities: async () => {
          throw new Error('Feature disabled');
        },
      },
    };
    const capability = await getAICapability('languageModel');
    expect(capability).toBe('no');
  });

  it('resolves "readily" when capability returns readily', async () => {
    (globalThis as any).window.ai = {
      languageModel: {
        capabilities: async () => ({
          available: 'readily',
          defaultTemperature: 0.8,
          maxTemperature: 2.0,
          defaultTopK: 3,
          maxTopK: 8,
        }),
      },
    };
    const capability = await getAICapability('languageModel');
    expect(capability).toBe('readily');
  });

  it('resolves "after-download" when capability returns after-download', async () => {
    (globalThis as any).window.ai = {
      summarizer: {
        capabilities: async () => ({
          available: 'after-download',
        }),
      },
    };
    const capability = await getAICapability('summarizer');
    expect(capability).toBe('after-download');
  });
});

describe('Hydration and Fallbacks with aiReadyDirective', () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    (globalThis as any).window = {};
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  it('immediately hydrates when capability is readily', async () => {
    (globalThis as any).window.ai = {
      languageModel: {
        capabilities: async () => ({ available: 'readily' }),
      },
    };

    let hydrated = false;
    const loadFn = async () => async () => {
      hydrated = true;
    };

    const mockEl = new (globalThis.HTMLElement as any)();

    aiReadyDirective(loadFn, { name: 'ai-ready', value: '' }, mockEl as any);

    // Wait a tick for microtasks
    await new Promise((r) => setTimeout(r, 20));

    expect(hydrated).toBe(true);
    expect(mockEl.dataset.aiStatus).toBe('ready');
    expect(mockEl.dataset.aiHydrated).toBe('true');
    expect(mockEl.events.some((e: any) => e.type === 'ai:ready')).toBe(true);
  });

  it('falls back to hydration when window.ai is unavailable with default fallbackStrategy', async () => {
    (globalThis as any).window.ai = undefined;

    let hydrated = false;
    const loadFn = async () => async () => {
      hydrated = true;
    };

    const mockEl = new (globalThis.HTMLElement as any)();

    aiReadyDirective(loadFn, { name: 'ai-ready', value: '' }, mockEl as any);

    await new Promise((r) => setTimeout(r, 20));

    expect(hydrated).toBe(true);
    expect(mockEl.dataset.aiStatus).toBe('unavailable');
    expect(mockEl.dataset.aiHydrated).toBe('true');
    expect(mockEl.events.some((e: any) => e.type === 'ai:unavailable')).toBe(true);
  });

  it('does NOT hydrate when unavailable and fallbackStrategy is "ignore"', async () => {
    (globalThis as any).window.ai = undefined;

    let hydrated = false;
    const loadFn = async () => async () => {
      hydrated = true;
    };

    const mockEl = new (globalThis.HTMLElement as any)();

    aiReadyDirective(loadFn, { name: 'ai-ready', value: 'ignore' }, mockEl as any);

    await new Promise((r) => setTimeout(r, 20));

    expect(hydrated).toBe(false);
    expect(mockEl.dataset.aiStatus).toBe('unavailable');
    expect(mockEl.dataset.aiHydrated).toBeUndefined();
  });

  it('polls during after-download and hydrates when status transitions to readily', async () => {
    let callCount = 0;
    (globalThis as any).window.ai = {
      languageModel: {
        capabilities: async () => {
          callCount++;
          if (callCount >= 3) {
            return { available: 'readily' };
          }
          return { available: 'after-download' };
        },
        create: async () => ({}),
      },
    };

    let hydrated = false;
    const loadFn = async () => async () => {
      hydrated = true;
    };

    const mockEl = new (globalThis.HTMLElement as any)();

    aiReadyDirective(
      loadFn,
      { name: 'ai-ready', value: 'poll:20:2000' },
      mockEl as any
    );

    // Give enough time for 3 polls of 20ms
    await new Promise((r) => setTimeout(r, 120));

    expect(hydrated).toBe(true);
    expect(mockEl.dataset.aiStatus).toBe('ready');
    expect(mockEl.dataset.aiHydrated).toBe('true');
  });

  it('times out during after-download and triggers fallback', async () => {
    (globalThis as any).window.ai = {
      languageModel: {
        capabilities: async () => ({ available: 'after-download' }),
        create: async () => ({}),
      },
    };

    let hydrated = false;
    const loadFn = async () => async () => {
      hydrated = true;
    };

    const mockEl = new (globalThis.HTMLElement as any)();

    aiReadyDirective(
      loadFn,
      { name: 'ai-ready', value: 'poll:20:60' },
      mockEl as any
    );

    // Wait until timeout (60ms) triggers
    await new Promise((r) => setTimeout(r, 150));

    expect(hydrated).toBe(true);
    expect(mockEl.dataset.aiStatus).toBe('timeout');
    expect(mockEl.events.some((e: any) => e.type === 'ai:timeout')).toBe(true);
  });
});
