import type { AICapabilityAvailability, AICapabilities } from './chrome-ai.js';

export type AIFeature = 'languageModel' | 'summarizer' | 'writer' | 'rewriter' | 'translator';

export type AIFallbackStrategy = 'hydrate' | 'ignore' | 'visible' | 'idle';

export interface DirectiveOptions {
  /**
   * Chrome AI feature to check capability for.
   * @default 'languageModel'
   */
  feature?: AIFeature;

  /**
   * Strategy to use when Chrome AI is unavailable ('no') or readiness check times out.
   * - 'hydrate': Hydrate component anyway (default, ensures graceful degradation).
   * - 'ignore': Do not hydrate the component if AI is unavailable.
   * - 'visible': Fall back to hydrating when the component enters viewport.
   * - 'idle': Fall back to hydrating when the browser is idle.
   * @default 'hydrate'
   */
  fallbackStrategy?: AIFallbackStrategy;

  /**
   * Maximum duration in milliseconds to wait for the AI model to become 'readily' available.
   * @default 10000
   */
  timeout?: number;

  /**
   * Polling interval in milliseconds when checking for readiness during 'after-download'.
   * @default 1000
   */
  pollInterval?: number;

  /**
   * Whether to automatically initiate model creation/download if status is 'after-download'.
   * @default true
   */
  triggerDownload?: boolean;
}

export type ClientAiReadyValue = boolean | string | DirectiveOptions;

declare global {
  namespace Astro {
    interface ClientDirectives {
      /**
       * Delays hydrating component until Chrome Built-in AI (Gemini Nano) is ready.
       */
      'client:ai-ready'?: ClientAiReadyValue;
    }
  }
}
