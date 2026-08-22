# astro-client-directive-ai

[![npm version](https://img.shields.io/npm/v/astro-client-directive-ai.svg?style=flat-square)](https://www.npmjs.com/package/astro-client-directive-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Astro](https://img.shields.io/badge/Astro-5.0+-orange?style=flat-square&logo=astro&logoColor=white)](https://astro.build/)

> An Astro integration providing the custom client directive `client:ai-ready` that delays hydrating interactive UI components until the browser's local **Chrome Built-in AI** (Gemini Nano) model is fully initialized and available (`window.ai.languageModel.capabilities().available === 'readily'`).

---

## ✨ Features

- ⚡ **Zero-Jank AI Hydration**: Prevents interactive components from hydrating before Gemini Nano / on-device models are ready in Chrome.
- 🔄 **Smart Download Waiting & Polling**: Handles `after-download` states smoothly with background polling and automatic download triggering.
- 🛡️ **Graceful Fallbacks**: Configurable fallback strategies (`hydrate`, `visible`, `idle`, `ignore`) when Built-in AI is disabled or unsupported.
- 🧩 **Multi-API Support**: Supports `languageModel` (Gemini Nano Prompt API), `summarizer`, `writer`, `rewriter`, and `translator`.
- 🏷️ **Status Attributes & Custom Events**: Dispatches DOM events (`ai:ready`, `ai:downloading`, `ai:timeout`, `ai:unavailable`) and populates `data-ai-status` / `data-ai-hydrated` attributes.
- 📐 **Strict TypeScript Support**: Full ambient typing for `astro/astro-jsx` and Chrome Built-in AI API definitions.

---

## 📋 Prerequisites & Chrome Configuration

To run Chrome Built-in AI (Gemini Nano) on your machine, enable the following flags in Google Chrome (Chrome 127+ / Canary / Dev):

1. **Prompt API for Gemini Nano**:
   - Open `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to **Enabled**
2. **On-Device Model Optimization**:
   - Open `chrome://flags/#optimization-guide-on-device-model`
   - Set to **Enabled BypassPerfRequirement**
3. **Download Model Component**:
   - Open `chrome://components`
   - Locate **Optimization Guide On Device Model**
   - Click **Check for update** and confirm the status says *Up-to-date* (downloads ~1.5 GB model locally).

---

## 📦 Installation

```bash
# Using bun
bun add astro-client-directive-ai

# Using pnpm
pnpm add astro-client-directive-ai

# Using npm
npm install astro-client-directive-ai
```

---

## 🚀 Quick Setup

Add the integration to your `astro.config.mjs`:

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import clientDirectiveAi from 'astro-client-directive-ai';

export default defineConfig({
  integrations: [
    react(),
    clientDirectiveAi(),
  ],
});
```

---

## 💻 Usage & Template Examples

### Basic Usage

Use `client:ai-ready` directly on any Astro island component:

```astro
---
import ChatAssistant from '../components/ChatAssistant.tsx';
---

<!-- Hydrates only when Gemini Nano is ready -->
<ChatAssistant client:ai-ready />
```

### Specifying AI Features

You can specify specific Built-in AI features (`languageModel`, `summarizer`, `writer`, `rewriter`, `translator`):

```astro
---
import ArticleSummarizer from '../components/ArticleSummarizer.svelte';
import SmartWriter from '../components/SmartWriter.vue';
---

<!-- Delays hydration until the Summarizer API is ready -->
<ArticleSummarizer client:ai-ready="summarizer" />

<!-- Delays hydration until the Writer API is ready -->
<SmartWriter client:ai-ready="writer" />
```

### Polling & Timeout Syntax

Configure polling interval and timeout (in milliseconds) using `poll:<pollInterval>:<timeout>`:

```astro
---
import TranslatorWidget from '../components/TranslatorWidget.tsx';
---

<!-- Polls every 500ms for up to 30,000ms (30s) -->
<TranslatorWidget client:ai-ready="poll:500:30000" />
```

### Advanced Configuration Object

Pass a JSON configuration object or options directly:

```astro
---
import LocalCopilot from '../components/LocalCopilot.tsx';
---

<LocalCopilot
  client:ai-ready={{
    feature: 'languageModel',
    fallbackStrategy: 'visible',
    timeout: 8000,
    pollInterval: 500,
    triggerDownload: true,
  }}
/>
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `feature` | `'languageModel' \| 'summarizer' \| 'writer' \| 'rewriter' \| 'translator'` | `'languageModel'` | Built-in AI feature API to check. |
| `fallbackStrategy` | `'hydrate' \| 'ignore' \| 'visible' \| 'idle'` | `'hydrate'` | Action taken when AI is unavailable (`no`) or timed out. |
| `timeout` | `number` | `10000` | Max milliseconds to wait for model download / readiness. |
| `pollInterval` | `number` | `1000` | Polling check interval in ms when status is `'after-download'`. |
| `triggerDownload` | `boolean` | `true` | Automatically attempts to trigger download when in `'after-download'`. |

### Fallback Strategies

- `'hydrate'` *(default)*: Hydrates the component immediately if AI is unavailable so UI renders normally.
- `'ignore'`: Does not hydrate the component if AI is unavailable.
- `'visible'`: Falls back to hydrating when the element scrolls into view.
- `'idle'`: Falls back to hydrating when the browser is idle via `requestIdleCallback`.

---

## 📡 DOM Events & Dataset Attributes

The directive updates DOM dataset attributes and dispatches custom events on the island container element:

### Dataset Attributes
- `data-ai-status`: `'ready' | 'downloading' | 'unavailable' | 'timeout'`
- `data-ai-hydrated`: `'true'` (once hydration completes)

### Custom Events
```typescript
document.querySelector('astro-island')?.addEventListener('ai:ready', (event) => {
  console.log('AI ready:', event.detail.feature);
});

document.querySelector('astro-island')?.addEventListener('ai:downloading', (event) => {
  console.log('Downloading model for:', event.detail.feature);
});
```

---

## 🧪 Framework Examples

### React

```tsx
// src/components/ChatAssistant.tsx
import React, { useState } from 'react';

export default function ChatAssistant() {
  const [response, setResponse] = useState('');

  const askAi = async (prompt: string) => {
    if (!window.ai?.languageModel) return;
    const session = await window.ai.languageModel.create();
    const result = await session.prompt(prompt);
    setResponse(result);
  };

  return (
    <div className="chat-box">
      <button onClick={() => askAi("Explain Astro islands in 2 sentences")}>
        Ask Gemini Nano
      </button>
      <p>{response}</p>
    </div>
  );
}
```

```astro
---
// src/pages/index.astro
import ChatAssistant from '../components/ChatAssistant';
---
<ChatAssistant client:ai-ready />
```

---

## 🛠️ Development & Testing

```bash
# Run unit tests
bun test

# Run TypeScript typechecks
bun run typecheck

# Build the integration package
bun run build
```

---

## 📄 License

MIT © [bhubbard](https://github.com/bhubbard)
