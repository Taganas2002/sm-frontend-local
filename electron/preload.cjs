const { contextBridge, ipcRenderer } = require("electron");
const base = ipcRenderer.sendSync("get-api-base-sync");
if (base) { contextBridge.exposeInMainWorld("__API_BASE__", base); }
