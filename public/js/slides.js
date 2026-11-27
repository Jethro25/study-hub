// Turn uploaded images / PDFs into compressed JPEG data URLs that can be shared via Socket.IO.

const MAX_W = 1600, MAX_H = 1200, QUALITY = 0.82;
let pdfjs = null;

async function loadPdfJs() {
  if (!pdfjs) {
    pdfjs = await import('/vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
  }
  return pdfjs;
}

function canvasToJpeg(canvas) {
  // white background so transparent PNGs don't turn black
  return canvas.toDataURL('image/jpeg', QUALITY);
}

function fitCanvas(srcW, srcH) {
  const s = Math.min(1, MAX_W / srcW, MAX_H / srcH);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(srcW * s));
  c.height = Math.max(1, Math.round(srcH * s));
  return c;
}

async function imageFileToSlide(file) {
  const bmp = await createImageBitmap(file);
  const c = fitCanvas(bmp.width, bmp.height);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return canvasToJpeg(c);
}

async function pdfFileToSlides(file, onProgress) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  const n = Math.min(doc.numPages, 80);
  for (let i = 1; i <= n; i++) {
    onProgress?.(`Rendering page ${i} of ${n}…`);
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(MAX_W / base.width, MAX_H / base.height);
    const viewport = page.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = Math.round(viewport.width);
    c.height = Math.round(viewport.height);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvas: c, canvasContext: g, viewport }).promise;
    out.push(canvasToJpeg(c));
    page.cleanup();
  }
  await doc.destroy();
  return out;
}

/** @param {FileList|File[]} files */
export async function filesToSlides(files, onProgress) {
  const list = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const slides = [];
  for (const f of list) {
    if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
      slides.push(...(await pdfFileToSlides(f, onProgress)));
    } else if (f.type.startsWith('image/')) {
      onProgress?.(`Processing ${f.name}…`);
      slides.push(await imageFileToSlide(f));
    }
    if (slides.length >= 80) break;
  }
  return slides.slice(0, 80);
}

// Small UI sounds made with WebAudio (no audio files needed).
let actx = null;
export function chime(kind = 'phase') {
  try {
    actx ||= new AudioContext();
    const now = actx.currentTime;
    const notes = kind === 'phase' ? [660, 880, 1320] : [880];
    notes.forEach((f, i) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.16);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.5);
      o.connect(g).connect(actx.destination);
      o.start(now + i * 0.16);
      o.stop(now + i * 0.16 + 0.55);
    });
  } catch { /* audio unavailable */ }
}
