// src/utils/print.js
export function printNodeAsCard(rootEl, { pageWidthMm = 85.6, pageHeightMm = 54 } = {}) {
  if (!rootEl) return;

  // Clone the node we want to print
  const clone = rootEl.cloneNode(true);

  // Convert every <canvas> to <img> so graphics (QR) survive across windows
  const canvases = rootEl.querySelectorAll("canvas");
  const cloneCanvases = clone.querySelectorAll("canvas");
  canvases.forEach((cv, i) => {
    try {
      const dataUrl = cv.toDataURL("image/png");
      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.maxWidth = cv.style.maxWidth || "100%";
      img.style.maxHeight = cv.style.maxHeight || "100%";
      img.width = cv.width;   // keep sharpness
      img.height = cv.height;
      cloneCanvases[i].replaceWith(img);
    } catch (_) {
      // ignore
    }
  });

  const css = `
    <style>
      @page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }
      html, body { margin: 0; padding: 0; }
      /* Remove preview shadow on print */
      .preview-wrap { box-shadow: none !important; }
    </style>
  `;

  const win = window.open("", "_blank", "width=600,height=420");
  if (!win) return;

  win.document.open();
  win.document.write(`<html><head>${css}</head><body>${clone.outerHTML}</body></html>`);
  win.document.close();

  const afterReady = async () => {
    try {
      const imgs = Array.from(win.document.images || []);
      await Promise.all(imgs.map((img) => img.decode?.().catch(() => {})));
    } catch {}
    win.focus();
    win.print();
    win.close();
  };

  if (win.document.readyState === "complete") afterReady();
  else win.onload = afterReady;
}
