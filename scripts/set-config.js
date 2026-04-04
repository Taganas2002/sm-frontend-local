// scripts/set-config.js
// Usage examples:
//   node scripts/set-config.js TRIAL 14
//   node scripts/set-config.js TRIAL 7
//   node scripts/set-config.js FULL 0
const fs = require("fs");
const path = require("path");

const MODE = (process.argv[2] || "TRIAL").toUpperCase(); // TRIAL | FULL
const DAYS = Number(process.argv[3] || 14);

const cfg = { licenseMode: MODE, trialDays: DAYS };
const out = path.join(__dirname, "..", "electron-resources", "config.json");

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(cfg, null, 2));
console.log("Wrote config:", out, cfg);
