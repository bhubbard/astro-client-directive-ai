// src/index.ts
function clientDirectiveAi(_options) {
  return {
    name: "astro-client-directive-ai",
    hooks: {
      "astro:config:setup": ({ addClientDirective }) => {
        addClientDirective({
          name: "ai-ready",
          entrypoint: "astro-client-directive-ai/client"
        });
      }
    }
  };
}
export {
  clientDirectiveAi as default
};
