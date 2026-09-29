// Drive Microsoft Edge (headless) through the DevTools protocol: open a page, run JavaScript in it, take screenshots, print PDFs.
// Nothing is installed; Node's built-in fetch and WebSocket are used.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = ms => new Promise(r => setTimeout(r, ms));

// a small seeded random generator (mulberry32) that replaces Math.random in every page; __seed(n) restarts it
export const SEED_SCRIPT = `(() => {
  let s = 1;
  const next = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = next;
  window.__seed = n => { s = n >>> 0; };
})();`;

export async function launch(port = 9333) {
  const dir = mkdtempSync(join(tmpdir(), "edge-report-"));
  const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--no-first-run", "--disable-gpu", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
  let list = null;
  for (let t = 0; t < 60 && !list; t++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { } }
  const pageT = list.find(x => x.type === "page");
  const ws = new WebSocket(pageT.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const wait = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const { res, rej } = wait.get(m.id); wait.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; wait.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: SEED_SCRIPT });
  const api = {
    send,
    async open(file, ready = "typeof $ === 'function'") {
      await send("Page.navigate", { url: "file:///" + file.replace(/\\/g, "/") });
      for (let t = 0; t < 200; t++) { await sleep(100); try { if (await api.eval(`document.readyState === 'complete' && (${ready})`)) break; } catch { } }
      await sleep(300);
    },
    async eval(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
      return r.result.value;
    },
    async viewport(w, h, dpr = 2, mobile = true) { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile }); },
    async shot(path, clip) {
      const p = clip ? { format: "png", clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : { format: "png", captureBeyondViewport: true };
      const r = await send("Page.captureScreenshot", p); writeFileSync(path, Buffer.from(r.data, "base64"));
    },
    async pdf(path, opts = {}) {
      const r = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, ...opts }); writeFileSync(path, Buffer.from(r.data, "base64"));
    },
    close() { try { ws.close(); } catch { } proc.kill(); },
  };
  return api;
}
