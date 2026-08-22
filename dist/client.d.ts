import type { ClientDirective } from 'astro';
import type { AIFeature, AIFallbackStrategy } from './types.js';
import type { AICapabilityAvailability } from './chrome-ai.js';
export interface ParsedAiDirectiveOptions {
    feature: AIFeature;
    fallbackStrategy: AIFallbackStrategy;
    timeout: number;
    pollInterval: number;
    triggerDownload: boolean;
}
/**
 * Parses directive attribute values (e.g. string keywords, JSON, or colon-separated options)
 */
export declare function parseDirectiveOptions(rawValue: unknown): ParsedAiDirectiveOptions;
/**
 * Checks the availability of the requested Chrome AI feature
 */
export declare function getAICapability(feature: AIFeature): Promise<AICapabilityAvailability>;
/**
 * Executes fallback hydration strategy
 */
export declare function executeFallback(hydrate: () => Promise<void>, strategy: AIFallbackStrategy, el: HTMLElement): void;
/**
 * Client directive entrypoint for client:ai-ready
 */
declare const aiReadyDirective: ClientDirective;
export default aiReadyDirective;
//# sourceMappingURL=client.d.ts.map