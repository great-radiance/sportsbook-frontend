export function applyThemeEditorData(
  rootNode: ShadowRoot | Document,
  themeEditorData?: string,
) {
  if (!themeEditorData) return;

  try {
    const data = JSON.parse(themeEditorData);
    const style = document.createElement("style");
    style.id = "sportsbook-theme-editor";

    let css = ":host, :root {";
    if (data.colors) {
      Object.entries(data.colors).forEach(([key, value]) => {
        css += `${key}: ${value};`;
      });
    }
    css += "}";

    style.textContent = css;

    if (rootNode instanceof ShadowRoot) {
      rootNode.appendChild(style);
    } else {
      const existing = document.getElementById("sportsbook-theme-editor");
      if (existing) {
        existing.replaceWith(style);
      } else {
        document.head.appendChild(style);
      }
    }
  } catch (e) {
    console.error("[applyThemeEditorData] Failed to parse theme data", e);
  }
}

export function injectCustomStyles(
  rootNode: ShadowRoot | Document,
  customStyles?: string,
) {
  if (!customStyles) return;

  const style = document.createElement("style");
  style.id = "sportsbook-custom-styles";
  style.textContent = customStyles;

  if (rootNode instanceof ShadowRoot) {
    rootNode.appendChild(style);
  } else {
    const existing = document.getElementById("sportsbook-custom-styles");
    if (existing) {
      existing.replaceWith(style);
    } else {
      document.head.appendChild(style);
    }
  }
}

type ThemeColors = Record<string, string>;

const THEME_STYLE_ID = "sportsbook-theme-editor";

export function initThemeColors(
  rootNode: ShadowRoot | Document,
  colorsData: string,
) {
  const themeColorsEnv = colorsData;
  // const baseTheme = (import.meta.env.VITE_BASE_THEME as string) || "light";
  // console.log("Initializing theme colors with base theme:", baseTheme);
  // window.localStorage.setItem("stoiximan-theme", baseTheme); // Set initial theme in localStorage for ThemeProvider to pick up
  // document.documentElement.setAttribute("data-theme", baseTheme);
  console.log("running initThemeColors, colorsData:", colorsData);
  if (!themeColorsEnv) return;

  let colors: ThemeColors | null = null;
  try {
    const parsed = JSON.parse(themeColorsEnv);
    if (parsed && typeof parsed === "object") {
      colors = parsed as ThemeColors;
    } else {
      console.error(
        "[initThemeColors] VITE_THEME_COLORS is not a valid object:",
        parsed,
      );
      return;
    }
  } catch (err) {
    console.error("[initThemeColors] Failed to parse VITE_THEME_COLORS:", err);
    return;
  }

  if (!colors || Object.keys(colors).length === 0) return;

  const style = document.createElement("style");
  style.id = THEME_STYLE_ID;

  const lightVars: string[] = [];
  const darkVars: string[] = [];

  // Support theme payloads that provide "--token" and "--token-dark".
  // "--token" is applied as default/light, "--token-dark" overrides in dark mode.
  Object.entries(colors).forEach(([key, value]) => {
    if (key.endsWith("-dark")) {
      const baseKey = key.slice(0, -5);
      darkVars.push(`${baseKey}: ${value};`);
      return;
    }
    lightVars.push(`${key}: ${value};`);
  });

  const lightCss = lightVars.join("\n");
  const darkCss = darkVars.join("\n");

  style.textContent = `
:host, :root {
${lightCss}
}

:host([data-theme="light"]), :root[data-theme="light"] {
${lightCss}
}

:host([data-theme="dark"]), :root[data-theme="dark"] {
${darkCss}
}
`;

  // ShadowRoot doesn't have getElementById, so query it
  if (rootNode instanceof ShadowRoot) {
    const existing = rootNode.querySelector<HTMLStyleElement>(
      `#${THEME_STYLE_ID}`,
    );
    if (existing) existing.replaceWith(style);
    else rootNode.appendChild(style);
  } else {
    const existing = document.getElementById(THEME_STYLE_ID);
    if (existing) existing.replaceWith(style);
    else document.head.appendChild(style);
  }
}
