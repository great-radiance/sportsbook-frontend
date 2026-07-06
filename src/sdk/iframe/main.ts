import { initSportsbookApp } from "@/core/sportsbookInit";
import { initIframeBridge } from "@/core/embed/iframeBridge";
import { parseEmbedQuery } from "@/core/embed/parseEmbedQuery";

function bootstrapIframeEmbed(): void {
  const container = document.getElementById("sportsbook-placeholder");
  if (!container) {
    console.error("[Sportsbook] iframe embed: #sportsbook-placeholder not found");
    return;
  }

  const options = parseEmbedQuery(window.location.search);
  const instance = initSportsbookApp(options);
  const teardownBridge = initIframeBridge();

  window.addEventListener("pagehide", () => {
    teardownBridge();
    instance.destroy();
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapIframeEmbed, {
      once: true,
    });
  } else {
    bootstrapIframeEmbed();
  }
}
