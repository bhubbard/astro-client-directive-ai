import type { AstroIntegration } from 'astro';
import type { DirectiveOptions } from './types.js';

export * from './types.js';
export * from './chrome-ai.js';

/**
 * Astro integration to provide the custom client directive `client:ai-ready`.
 * Delays hydrating components until Chrome Built-in AI (Gemini Nano) is ready.
 *
 * @param _options Optional default directive options
 * @returns AstroIntegration
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { defineConfig } from 'astro/config';
 * import clientDirectiveAi from 'astro-client-directive-ai';
 *
 * export default defineConfig({
 *   integrations: [clientDirectiveAi()]
 * });
 * ```
 */
export default function clientDirectiveAi(_options?: DirectiveOptions): AstroIntegration {
  return {
    name: 'astro-client-directive-ai',
    hooks: {
      'astro:config:setup': ({ addClientDirective }) => {
        addClientDirective({
          name: 'ai-ready',
          entrypoint: 'astro-client-directive-ai/client',
        });
      },
    },
  };
}
