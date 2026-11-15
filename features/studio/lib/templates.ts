import type {
  StudioFile,
  StudioTemplate,
  StudioTemplateDefinition,
} from "../types/studio.types";

const STARTER_RESET = `*,
*::before,
*::after {
  box-sizing: border-box;
}`;

/** Shared starter styling so every template preview looks like Focusy. */
const LEGACY_STARTER_STYLES = `:root {
  color-scheme: light dark;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #0b1220;
  color: #e8edf7;
}

.card {
  width: min(420px, 100%);
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  background: #121b2d;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8ea4c8;
}

h1 {
  margin: 0 0 10px;
  font-size: 24px;
  line-height: 1.2;
}

p {
  margin: 0 0 18px;
  line-height: 1.55;
  color: #b9c6dd;
}

button {
  cursor: pointer;
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  font: inherit;
  font-weight: 600;
  color: #ffffff;
  background: #3e5ceb;
}

button:hover {
  filter: brightness(1.1);
}

.count {
  margin: 14px 0 0;
  font-variant-numeric: tabular-nums;
  color: #e8edf7;
}

.highlight {
  color: #7dd3a0;
}
`;

const STARTER_STYLES = `${STARTER_RESET}\n${LEGACY_STARTER_STYLES}`;

/**
 * Projects created before the starter reset was added saved the old CSS
 * verbatim, which makes the preview's `body` overflow by its own padding.
 * Upgrade only that exact untouched file; customized styles stay untouched.
 */
export function upgradeLegacyStarterStyles(files: StudioFile[]): StudioFile[] {
  let changed = false;
  const upgraded = files.map((file) => {
    if (
      file.path !== "/styles.css" ||
      file.content !== LEGACY_STARTER_STYLES
    ) {
      return file;
    }
    changed = true;
    return { ...file, content: STARTER_STYLES };
  });
  return changed ? upgraded : files;
}

const STATIC_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Focusy Studio — HTML/CSS/JS</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">Focusy Studio · Static</p>
      <h1>Hello from HTML, CSS and JavaScript</h1>
      <p id="message">Edit <code>script.js</code> and this line updates live.</p>
      <button id="greet">Greet me</button>
    </main>
    <script src="./script.js"></script>
  </body>
</html>
`;

const STATIC_SCRIPT = `const button = document.getElementById("greet");
const message = document.getElementById("message");

button.addEventListener("click", function () {
  const now = new Date().toLocaleTimeString();
  message.textContent = "Hello from Focusy Studio at " + now + ".";
  message.classList.add("highlight");
});
`;

const VANILLA_INDEX = `import "./styles.css";

const app = document.getElementById("app");

app.innerHTML = [
  '<main class="card">',
  '<p class="eyebrow">Focusy Studio · Vanilla JS</p>',
  "<h1>Hello from plain JavaScript</h1>",
  "<p>Edit this file and save nothing — the preview picks it up.</p>",
  '<button id="tick">Add a second</button>',
  '<p id="count" class="count">Seconds: 0</p>',
  "</main>",
].join("");

let seconds = 0;
const count = document.getElementById("count");

document.getElementById("tick").addEventListener("click", function () {
  seconds += 1;
  count.textContent = "Seconds: " + seconds;
});
`;

const VANILLA_TS_INDEX = `import "./styles.css";

const app = document.getElementById("app");

if (app) {
  app.innerHTML = [
    '<main class="card">',
    '<p class="eyebrow">Focusy Studio · Vanilla TypeScript</p>',
    "<h1>Typed, in the browser</h1>",
    "<p>This file is compiled by the Sandpack runtime.</p>",
    '<button id="tick">Add a second</button>',
    '<p id="count" class="count">Seconds: 0</p>',
    "</main>",
  ].join("");
}

let seconds = 0;
const count = document.getElementById("count");

document.getElementById("tick")?.addEventListener("click", function () {
  seconds += 1;
  if (count) count.textContent = "Seconds: " + seconds;
});
`;

const REACT_APP = `import { useState } from "react";
import confetti from "canvas-confetti";
import "./styles.css";

export default function App() {
  const [count, setCount] = useState(0);

  const celebrate = () => {
    setCount((value) => value + 1);
    confetti({ particleCount: 60, spread: 65, origin: { y: 0.7 } });
  };

  return (
    <main className="card">
      <p className="eyebrow">Focusy Studio · React</p>
      <h1>Build while you learn</h1>
      <p>Edits hot-reload here. The confetti button uses an npm dependency.</p>
      <button onClick={celebrate}>Celebrate {count}</button>
    </main>
  );
}
`;

const REACT_INDEX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const REACT_TS_APP = `import { useState } from "react";
import confetti from "canvas-confetti";
import "./styles.css";

export default function App() {
  const [count, setCount] = useState(0);

  const celebrate = (): void => {
    setCount((value) => value + 1);
    confetti({ particleCount: 60, spread: 65, origin: { y: 0.7 } });
  };

  return (
    <main className="card">
      <p className="eyebrow">Focusy Studio · React + TypeScript</p>
      <h1>Types all the way down</h1>
      <p>TypeScript is compiled by the Sandpack runtime, not by Focusy.</p>
      <button onClick={celebrate}>Celebrate {count}</button>
    </main>
  );
}
`;

const REACT_TS_INDEX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container as HTMLElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const EXPRESS_INDEX = `const express = require("express");

const app = express();
const port = 3000;

app.get("/", (_req, res) => {
  res.send([
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<title>Focusy Studio — Express</title>',
    '<style>',
    '* { box-sizing: border-box; }',
    'body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #0b1220; color: #e8edf7; font-family: ui-sans-serif, system-ui, sans-serif; }',
    '.card { width: min(460px, 100%); padding: 28px; border: 1px solid rgba(255,255,255,.12); border-radius: 18px; background: #121b2d; }',
    '.eyebrow { margin: 0 0 10px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #8ea4c8; }',
    'h1 { margin: 0 0 10px; font-size: 24px; }',
    'p { margin: 0 0 18px; line-height: 1.55; color: #b9c6dd; }',
    'code { color: #7dd3a0; }',
    '</style>',
    '</head>',
    '<body>',
    '<main class="card">',
    '<p class="eyebrow">Focusy Studio · Express JS</p>',
    '<h1>Hello from Express</h1>',
    '<p>This page is rendered by a real Express route at <code>GET /</code>.</p>',
    '</main>',
    '</body>',
    '</html>',
  ].join(""));
});

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from Express" });
});

app.listen(port, () => {
  console.log("Express running at http://localhost:" + port);
});
`;

const EXPRESS_PACKAGE = JSON.stringify(
  {
    name: "focusy-express",
    private: true,
    main: "index.js",
    scripts: { start: "node index.js" },
  },
  null,
  2
);

const EXPRESS_TS_INDEX = `import express, { type Request, type Response } from "express";

const app = express();
const port: number = 3000;

app.get("/", (_req: Request, res: Response) => {
  res.send([
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<title>Focusy Studio — Express + TypeScript</title>',
    '<style>',
    '* { box-sizing: border-box; }',
    'body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #0b1220; color: #e8edf7; font-family: ui-sans-serif, system-ui, sans-serif; }',
    '.card { width: min(460px, 100%); padding: 28px; border: 1px solid rgba(255,255,255,.12); border-radius: 18px; background: #121b2d; }',
    '.eyebrow { margin: 0 0 10px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #8ea4c8; }',
    'h1 { margin: 0 0 10px; font-size: 24px; }',
    'p { margin: 0 0 18px; line-height: 1.55; color: #b9c6dd; }',
    'code { color: #7dd3a0; }',
    '</style>',
    '</head>',
    '<body>',
    '<main class="card">',
    '<p class="eyebrow">Focusy Studio · Express TS</p>',
    '<h1>Hello from typed Express</h1>',
    '<p>This page is rendered by an Express route written in TypeScript at <code>GET /</code>.</p>',
    '</main>',
    '</body>',
    '</html>',
  ].join(""));
});

app.get("/api/hello", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Express + TypeScript" });
});

app.listen(port, () => {
  console.log("Express + TypeScript running at http://localhost:" + port);
});
`;

const EXPRESS_TS_BOOTSTRAP = `const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const entry = path.join(process.cwd(), "index.ts");
const source = fs.readFileSync(entry, "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "index.ts",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

const compiled = new Module(entry, module);
compiled.filename = entry;
compiled.paths = module.paths;
compiled._compile(outputText, entry);
`;

const EXPRESS_TS_PACKAGE = JSON.stringify(
  {
    name: "focusy-express-ts",
    private: true,
    main: "index.js",
    scripts: { start: "node index.js" },
  },
  null,
  2
);

/**
 * Express TS projects created before the JavaScript bootstrap used a `ts-node`
 * or `tsx` start script, which Sandpack's Nodebox cannot run. Saved projects
 * are upgraded when they load so they don't stay stuck on the broken runner.
 */
export function upgradeLegacyExpressTs(
  files: StudioFile[],
  dependencies: Record<string, string>
): { files: StudioFile[]; dependencies: Record<string, string> } | null {
  const packageFile = files.find((file) => file.path === "/package.json");
  if (!packageFile) return null;

  let manifest: unknown;
  try {
    manifest = JSON.parse(packageFile.content);
  } catch {
    return null;
  }
  if (typeof manifest !== "object" || manifest === null) return null;

  const record = manifest as Record<string, unknown>;
  const scripts =
    typeof record.scripts === "object" && record.scripts !== null
      ? (record.scripts as Record<string, unknown>)
      : null;
  const start = scripts?.start;
  if (
    typeof start !== "string" ||
    !/\b(ts-node|tsx)\b/.test(start)
  ) {
    return null;
  }

  const nextManifest = {
    ...record,
    main: "index.js",
    scripts: { ...scripts, start: "node index.js" },
  };
  const nextDependencies = { ...dependencies };
  delete nextDependencies["ts-node"];
  delete nextDependencies.tsx;
  nextDependencies.typescript ??= "^5.7.2";

  const hasBootstrap = files.some((file) => file.path === "/index.js");
  return {
    files: [
      ...files.map((file) =>
        file.path === "/package.json"
          ? { ...file, content: JSON.stringify(nextManifest, null, 2) }
          : file
      ),
      ...(hasBootstrap
        ? []
        : [{ path: "/index.js", content: EXPRESS_TS_BOOTSTRAP }]),
    ],
    dependencies: nextDependencies,
  };
}

const EXPRESS_TS_CONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "commonjs",
      moduleResolution: "node",
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
    },
  },
  null,
  2
);

function files(...entries: StudioFile[]): StudioFile[] {
  return entries;
}

/**
 * Starter projects for every supported Studio template, wired to the matching
 * Sandpack template. Kept as plain data so workspace creation (and later,
 * templates) can reuse it without touching UI code.
 */
export const STUDIO_TEMPLATES: Record<StudioTemplate, StudioTemplateDefinition> = {
  static: {
    id: "static",
    label: "HTML / CSS / JS",
    description: "Static files served as-is",
    sandpackTemplate: "static",
    entryFile: "/index.html",
    files: files(
      { path: "/index.html", content: STATIC_HTML },
      { path: "/styles.css", content: STARTER_STYLES },
      { path: "/script.js", content: STATIC_SCRIPT }
    ),
    dependencies: {},
  },
  vanilla: {
    id: "vanilla",
    label: "Vanilla JS",
    description: "JavaScript bundled in the browser",
    sandpackTemplate: "vanilla",
    entryFile: "/index.js",
    files: files(
      { path: "/index.js", content: VANILLA_INDEX },
      { path: "/styles.css", content: STARTER_STYLES }
    ),
    dependencies: {},
  },
  "vanilla-ts": {
    id: "vanilla-ts",
    label: "Vanilla TS",
    description: "TypeScript compiled in the browser",
    sandpackTemplate: "vanilla-ts",
    entryFile: "/index.ts",
    files: files(
      { path: "/index.ts", content: VANILLA_TS_INDEX },
      { path: "/styles.css", content: STARTER_STYLES }
    ),
    dependencies: {},
  },
  react: {
    id: "react",
    label: "React JS",
    description: "React with JavaScript",
    sandpackTemplate: "react",
    entryFile: "/App.js",
    files: files(
      { path: "/App.js", content: REACT_APP },
      { path: "/index.js", content: REACT_INDEX },
      { path: "/styles.css", content: STARTER_STYLES }
    ),
    // Pre-installed to prove npm dependency resolution end to end.
    dependencies: { "canvas-confetti": "^1.9.3" },
  },
  "react-ts": {
    id: "react-ts",
    label: "React TS",
    description: "React with TypeScript",
    sandpackTemplate: "react-ts",
    entryFile: "/App.tsx",
    files: files(
      { path: "/App.tsx", content: REACT_TS_APP },
      { path: "/index.tsx", content: REACT_TS_INDEX },
      { path: "/styles.css", content: STARTER_STYLES }
    ),
    dependencies: { "canvas-confetti": "^1.9.3" },
  },
  express: {
    id: "express",
    label: "Express JS",
    description: "Express server running in the Node runtime",
    sandpackTemplate: "node",
    entryFile: "/index.js",
    files: files(
      { path: "/index.js", content: EXPRESS_INDEX },
      { path: "/package.json", content: EXPRESS_PACKAGE }
    ),
    dependencies: { express: "^4.21.2" },
  },
  "express-ts": {
    id: "express-ts",
    label: "Express TS",
    description: "Express server with TypeScript in the Node runtime",
    sandpackTemplate: "node",
    entryFile: "/index.ts",
    files: files(
      { path: "/index.ts", content: EXPRESS_TS_INDEX },
      { path: "/index.js", content: EXPRESS_TS_BOOTSTRAP },
      { path: "/package.json", content: EXPRESS_TS_PACKAGE },
      { path: "/tsconfig.json", content: EXPRESS_TS_CONFIG }
    ),
    dependencies: {
      express: "^4.21.2",
      typescript: "^5.7.2",
    },
  },
};

export const STUDIO_TEMPLATE_ORDER: StudioTemplate[] = [
  "static",
  "vanilla",
  "vanilla-ts",
  "react",
  "react-ts",
  "express",
  "express-ts",
];

/** Immutable copy of a template's starter files. */
export function createTemplateFiles(template: StudioTemplate): StudioFile[] {
  return STUDIO_TEMPLATES[template].files.map((file) => ({ ...file }));
}
