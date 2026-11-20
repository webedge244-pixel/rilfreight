import fs from "node:fs";

const URL_TO_OPEN = "http://localhost:3000/map-check";
const OUT = "C:/Users/maseglo.com/AppData/Local/Temp/ril-map-check.png";

const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const page = targets.find((t) => t.type === "page");
if (!page) throw new Error("No page target");

const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
});

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve);
  ws.addEventListener("error", reject);
});

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: URL_TO_OPEN });
await new Promise((resolve) => setTimeout(resolve, 18000));

const state = await send("Runtime.evaluate", {
  expression: `JSON.stringify({
    readyState: document.readyState,
    canvases: document.querySelectorAll("canvas").length,
    title: document.title,
    text: document.body.innerText.slice(0, 800)
  })`,
  returnByValue: true,
});
console.log("page:", state.result.value);

const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  fromSurface: true,
  captureBeyondViewport: true,
});
fs.writeFileSync(OUT, Buffer.from(screenshot.data, "base64"));
console.log("screenshot:", OUT);

ws.close();
