// src/client.ts
var DEFAULT_OPTIONS = {
  feature: "languageModel",
  fallbackStrategy: "hydrate",
  timeout: 1e4,
  pollInterval: 1000,
  triggerDownload: true
};
function parseDirectiveOptions(rawValue) {
  if (!rawValue || rawValue === true) {
    return { ...DEFAULT_OPTIONS };
  }
  if (typeof rawValue === "object") {
    const opts = rawValue;
    return {
      feature: opts.feature ?? DEFAULT_OPTIONS.feature,
      fallbackStrategy: opts.fallbackStrategy ?? DEFAULT_OPTIONS.fallbackStrategy,
      timeout: typeof opts.timeout === "number" ? opts.timeout : DEFAULT_OPTIONS.timeout,
      pollInterval: typeof opts.pollInterval === "number" ? opts.pollInterval : DEFAULT_OPTIONS.pollInterval,
      triggerDownload: typeof opts.triggerDownload === "boolean" ? opts.triggerDownload : DEFAULT_OPTIONS.triggerDownload
    };
  }
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseDirectiveOptions(parsed);
      } catch {}
    }
    const options = { ...DEFAULT_OPTIONS };
    if (trimmed.startsWith("poll:")) {
      const parts = trimmed.split(":");
      if (parts[1] && !isNaN(Number(parts[1]))) {
        options.pollInterval = Number(parts[1]);
      }
      if (parts[2] && !isNaN(Number(parts[2]))) {
        options.timeout = Number(parts[2]);
      }
      return options;
    }
    if (trimmed.startsWith("timeout:")) {
      const parts = trimmed.split(":");
      if (parts[1] && !isNaN(Number(parts[1]))) {
        options.timeout = Number(parts[1]);
      }
      return options;
    }
    switch (trimmed.toLowerCase()) {
      case "language-model":
      case "languagemodel":
        options.feature = "languageModel";
        break;
      case "summarizer":
        options.feature = "summarizer";
        break;
      case "writer":
        options.feature = "writer";
        break;
      case "rewriter":
        options.feature = "rewriter";
        break;
      case "translator":
        options.feature = "translator";
        break;
      case "ignore":
      case "skip":
        options.fallbackStrategy = "ignore";
        break;
      case "fallback":
      case "immediate-fallback":
        options.fallbackStrategy = "hydrate";
        options.timeout = 0;
        break;
      case "visible":
        options.fallbackStrategy = "visible";
        break;
      case "idle":
        options.fallbackStrategy = "idle";
        break;
      case "wait":
        options.fallbackStrategy = "hydrate";
        options.triggerDownload = true;
        break;
    }
    return options;
  }
  return { ...DEFAULT_OPTIONS };
}
async function getAICapability(feature) {
  if (typeof window === "undefined" || !window.ai) {
    return "no";
  }
  const factory = window.ai[feature];
  if (!factory || typeof factory.capabilities !== "function") {
    return "no";
  }
  try {
    const caps = await factory.capabilities();
    return caps.available || "no";
  } catch {
    return "no";
  }
}
function executeFallback(hydrate, strategy, el) {
  switch (strategy) {
    case "ignore":
      break;
    case "visible": {
      if (typeof IntersectionObserver !== "undefined") {
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              observer.disconnect();
              hydrate();
              break;
            }
          }
        });
        if (el.children.length > 0) {
          for (const child of el.children) {
            observer.observe(child);
          }
        } else {
          observer.observe(el);
        }
      } else {
        hydrate();
      }
      break;
    }
    case "idle": {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => hydrate(), { timeout: 2000 });
      } else {
        setTimeout(() => hydrate(), 200);
      }
      break;
    }
    case "hydrate":
    default:
      hydrate();
      break;
  }
}
var aiReadyDirective = (load, options, el) => {
  const parsed = parseDirectiveOptions(options.value);
  const hydrate = async () => {
    try {
      const init = await load();
      await init();
      el.dataset.aiHydrated = "true";
    } catch (err) {
      console.error("[astro-client-directive-ai] Hydration error:", err);
    }
  };
  (async () => {
    let capability;
    try {
      capability = await getAICapability(parsed.feature);
    } catch {
      capability = "no";
    }
    if (capability === "readily") {
      el.dataset.aiStatus = "ready";
      el.dispatchEvent(new CustomEvent("ai:ready", { bubbles: true, detail: { feature: parsed.feature } }));
      await hydrate();
      return;
    }
    if (capability === "after-download") {
      el.dataset.aiStatus = "downloading";
      el.dispatchEvent(new CustomEvent("ai:downloading", { bubbles: true, detail: { feature: parsed.feature } }));
      if (parsed.triggerDownload && window.ai && window.ai[parsed.feature]) {
        try {
          const factory = window.ai[parsed.feature];
          if (typeof factory?.create === "function") {
            const createPromise = parsed.feature === "translator" ? factory.create({ sourceLanguage: "en", targetLanguage: "en" }) : factory.create();
            if (createPromise && typeof createPromise.catch === "function") {
              createPromise.catch(() => {});
            }
          }
        } catch {}
      }
      const startTime = Date.now();
      const interval = parsed.pollInterval || 1000;
      const timeout = parsed.timeout || 1e4;
      const checkInterval = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        let currentCap = "no";
        try {
          currentCap = await getAICapability(parsed.feature);
        } catch {
          currentCap = "no";
        }
        if (currentCap === "readily") {
          clearInterval(checkInterval);
          el.dataset.aiStatus = "ready";
          el.dispatchEvent(new CustomEvent("ai:ready", { bubbles: true, detail: { feature: parsed.feature } }));
          await hydrate();
        } else if (elapsed >= timeout) {
          clearInterval(checkInterval);
          el.dataset.aiStatus = "timeout";
          el.dispatchEvent(new CustomEvent("ai:timeout", { bubbles: true, detail: { feature: parsed.feature } }));
          executeFallback(hydrate, parsed.fallbackStrategy, el);
        }
      }, interval);
      return;
    }
    el.dataset.aiStatus = "unavailable";
    el.dispatchEvent(new CustomEvent("ai:unavailable", { bubbles: true, detail: { feature: parsed.feature } }));
    executeFallback(hydrate, parsed.fallbackStrategy, el);
  })();
};
var client_default = aiReadyDirective;
export {
  parseDirectiveOptions,
  getAICapability,
  executeFallback,
  client_default as default
};
