/**
 * Export utilities for generating crisp JPG images and high-fidelity PDF documents
 * with html2canvas and html2pdf.js.
 * 
 * Includes comprehensive layout, typography, CJK font-alignment, and color-parsing fixes
 * to eliminate text clipping, badge misalignment, and color parser errors during export.
 */

import html2canvas from 'html2canvas';
// @ts-ignore
import html2pdf from 'html2pdf.js';

// Offscreen 1x1 canvas for converting modern CSS color functions (oklch, oklab, lab, lch, color(), hwb) to standard RGBA
const tempCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (tempCanvas) {
  tempCanvas.width = 1;
  tempCanvas.height = 1;
}
const tempCtx = tempCanvas ? tempCanvas.getContext('2d', { willReadFrequently: true }) : null;

function parseOklchMathFallback(colorStr: string): string {
  try {
    const oklchMatch = colorStr.match(/oklch\(\s*([^)]+)\s*\)/i);
    if (oklchMatch) {
      const rawArgs = oklchMatch[1].trim().split(/[\s/]+/);
      if (rawArgs.length >= 3) {
        let L = rawArgs[0].endsWith('%') ? parseFloat(rawArgs[0]) / 100 : parseFloat(rawArgs[0]);
        let C = parseFloat(rawArgs[1]);
        let H = parseFloat(rawArgs[2]);
        let alpha = rawArgs[3] !== undefined ? (rawArgs[3].endsWith('%') ? parseFloat(rawArgs[3]) / 100 : parseFloat(rawArgs[3])) : 1;

        if (!isNaN(L) && !isNaN(C) && !isNaN(H)) {
          const hRad = (H * Math.PI) / 180;
          const a = C * Math.cos(hRad);
          const b_lab = C * Math.sin(hRad);

          const l_ = L + 0.3963377774 * a + 0.2158037573 * b_lab;
          const m_ = L - 0.1055613458 * a - 0.0638541728 * b_lab;
          const s_ = L - 0.0894841775 * a - 1.2914855480 * b_lab;

          const l = l_ * l_ * l_;
          const m = m_ * m_ * m_;
          const s = s_ * s_ * s_;

          const r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
          const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
          const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

          const toSRGB = (c: number) => {
            const clamped = Math.max(0, Math.min(1, c));
            return clamped <= 0.0031308
              ? 12.92 * clamped
              : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
          };

          const r = Math.round(toSRGB(r_lin) * 255);
          const g = Math.round(toSRGB(g_lin) * 255);
          const b = Math.round(toSRGB(b_lin) * 255);

          if (!isNaN(alpha) && alpha < 1) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
    }
  } catch {
    // Ignore
  }
  return 'rgb(100, 116, 139)';
}

export function cssColorToRgb(colorStr: string): string {
  if (!tempCtx) return parseOklchMathFallback(colorStr);
  try {
    tempCtx.clearRect(0, 0, 1, 1);
    tempCtx.fillStyle = '#000000';
    tempCtx.fillStyle = colorStr;
    tempCtx.fillRect(0, 0, 1, 1);
    const data = tempCtx.getImageData(0, 0, 1, 1).data;
    const r = data[0];
    const g = data[1];
    const b = data[2];
    const alphaVal = data[3] / 255;
    if (data[3] === 255) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${alphaVal.toFixed(3)})`;
    }
  } catch {
    return parseOklchMathFallback(colorStr);
  }
}

export function replaceUnsupportedColors(text: string): string {
  if (!text) return text;
  return text.replace(/(oklab|oklch|lab|lch|color|hwb)\([^)]+\)/gi, (m) => {
    return cssColorToRgb(m);
  });
}

export function fixColorsForHtml2Canvas(clonedDoc: Document) {
  // 1. Process style tags in cloned document
  const styleElements = clonedDoc.querySelectorAll('style');
  styleElements.forEach((styleEl) => {
    if (styleEl.textContent && /(oklab|oklch|lab|lch|color|hwb)/i.test(styleEl.textContent)) {
      styleEl.textContent = replaceUnsupportedColors(styleEl.textContent);
    }
  });

  // 2. Process stylesheet rules if accessible
  try {
    Array.from(clonedDoc.styleSheets).forEach((sheet) => {
      try {
        const rules = sheet.cssRules;
        if (rules) {
          for (let i = 0; i < rules.length; i++) {
            const rule = rules[i] as CSSStyleRule;
            if (rule && rule.cssText && /(oklab|oklch|lab|lch|color|hwb)/i.test(rule.cssText)) {
              if (rule.style && rule.style.cssText) {
                rule.style.cssText = replaceUnsupportedColors(rule.style.cssText);
              }
            }
          }
        }
      } catch {
        // Ignored if cross-origin
      }
    });
  } catch {
    // Ignored
  }

  // 3. Process all elements, replacing inline styles AND override computed styles containing oklch/oklab
  const allElements = clonedDoc.querySelectorAll('*');
  const win = clonedDoc.defaultView || window;

  const colorProps = [
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'fill',
    'stroke',
    'box-shadow',
    'text-shadow'
  ];

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;

    // Check & replace inline style attribute
    const styleAttr = htmlEl.getAttribute('style');
    if (styleAttr && /(oklab|oklch|lab|lch|color|hwb)/i.test(styleAttr)) {
      htmlEl.setAttribute('style', replaceUnsupportedColors(styleAttr));
    }

    // Check computed styles and override inline if needed
    try {
      const comp = win.getComputedStyle(htmlEl);
      if (comp) {
        colorProps.forEach((prop) => {
          const val = comp.getPropertyValue(prop);
          if (val && /(oklab|oklch|lab|lch|color|hwb)/i.test(val)) {
            const converted = replaceUnsupportedColors(val);
            htmlEl.style.setProperty(prop, converted, 'important');
          }
        });
      }
    } catch {
      // Ignore
    }
  });
}

/**
 * Prepares and normalizes the cloned DOM document before html2canvas rendering.
 * Fixes text clipping, font alignment, badge/pill vertical shifts, and container width limits.
 */
export function prepareClonedDocForExport(clonedDoc: Document, elementId: string) {
  // 1. First convert any unsupported CSS color syntax
  fixColorsForHtml2Canvas(clonedDoc);

  // 2. Inject global export-optimized CSS overrides into the cloned document
  const exportStyle = clonedDoc.createElement('style');
  exportStyle.setAttribute('type', 'text/css');
  exportStyle.textContent = `
    /* Enforce standardized, robust system font stack for accurate character metrics */
    * {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      text-rendering: geometricPrecision !important;
      box-sizing: border-box !important;
    }

    /* Prevent text truncation, ellipsis clipping, or overflow clipping */
    .truncate, [class*="truncate"] {
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
      word-break: break-word !important;
      max-width: none !important;
    }

    /* Ensure table cells don't clip text and have comfortable line spacing */
    table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
    }

    th, td {
      white-space: normal !important;
      overflow: visible !important;
      word-break: break-word !important;
      vertical-align: middle !important;
      line-height: 1.4 !important;
      padding: 8px 10px !important;
    }

    /* Expand all scrollable containers so content renders in full without scrollbars or clipped edges */
    .overflow-x-auto, .overflow-y-auto, .overflow-hidden {
      overflow: visible !important;
      max-width: none !important;
      max-height: none !important;
    }

    /* Status badges and tag pills styling override for export */
    /* Enforce inline-block with line-height 1.35 and explicit padding for pixel-perfect html2canvas text centering */
    .export-badge, span[class*="bg-"][class*="rounded"], span[class*="bg-"][class*="border"] {
      display: inline-block !important;
      vertical-align: middle !important;
      text-align: center !important;
      line-height: 1.35 !important;
      box-sizing: border-box !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      padding: 2px 8px !important;
    }

    /* Normalize small badge font sizes to 11px to eliminate canvas subpixel rounding offsets */
    .text-\[8px\], .text-\[9px\], .text-\[10px\] {
      font-size: 11px !important;
      line-height: 1.35 !important;
    }

    /* Adjust progress bar containers so background pill doesn't clip */
    div[class*="rounded-full"] {
      border-radius: 9999px !important;
      overflow: hidden !important;
    }

    /* Hide non-export interactive UI controls inside export area */
    .no-print, button, input, select, textarea {
      display: none !important;
    }
  `;
  clonedDoc.head.appendChild(exportStyle);

  // 3. Perform a JS normalization pass over badge elements in the cloned document
  const badgeSpans = clonedDoc.querySelectorAll('.export-badge, span[class*="bg-"][class*="rounded"]');
  const win = clonedDoc.defaultView || window;

  badgeSpans.forEach((span) => {
    const el = span as HTMLElement;
    el.style.setProperty('display', 'inline-block', 'important');
    el.style.setProperty('vertical-align', 'middle', 'important');
    el.style.setProperty('text-align', 'center', 'important');
    el.style.setProperty('line-height', '1.35', 'important');
    el.style.setProperty('box-sizing', 'border-box', 'important');
    el.style.setProperty('padding', '2px 8px', 'important');

    try {
      const comp = win.getComputedStyle(el);
      const fs = parseFloat(comp.fontSize || '11');
      if (fs < 11) {
        el.style.setProperty('font-size', '11px', 'important');
      }
    } catch {
      // Ignore
    }
  });

  // 4. Find target element in cloned document and optimize layout dimensions
  const targetEl = clonedDoc.getElementById(elementId);
  if (targetEl) {
    // Determine target width based on element ID
    let widthPx = 1024;
    if (elementId === 'print-area') {
      widthPx = 800;
    } else if (elementId === 'dashboard-export-area') {
      widthPx = 1024;
    } else if (elementId === 'overview-table-area') {
      widthPx = 1100;
    }

    targetEl.style.width = `${widthPx}px`;
    targetEl.style.minWidth = `${widthPx}px`;
    targetEl.style.maxWidth = `${widthPx}px`;
    targetEl.style.margin = '0 auto';
    targetEl.style.backgroundColor = '#ffffff';
    targetEl.style.boxSizing = 'border-box';
    targetEl.style.transform = 'none';
    targetEl.style.overflow = 'visible';

    // Ensure parents don't clip target element
    let curr: HTMLElement | null = targetEl.parentElement;
    while (curr && curr !== clonedDoc.body) {
      curr.style.overflow = 'visible';
      curr.style.maxWidth = 'none';
      curr.style.width = 'auto';
      curr = curr.parentElement;
    }
  }
}

/**
 * High-fidelity JPG Exporter using html2canvas
 */
export async function exportElementToJpg(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found for JPG export.`);
    return false;
  }

  try {
    const targetWidth = elementId === 'print-area' ? 840 : 1200;
    const canvas = await html2canvas(element, {
      scale: 2, // Crisp 2x retinal resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: false, // Disabling letterRendering prevents character splitting & box misalignments
      windowWidth: targetWidth, // Match target viewport width during capture
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc: Document) => {
        prepareClonedDocForExport(clonedDoc, elementId);
      }
    } as any);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('JPG Export Error:', err);
    return false;
  }
}

/**
 * High-fidelity PDF Exporter using html2pdf.js
 */
export async function exportElementToPdf(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found for PDF export.`);
    return false;
  }

  const targetWidth = elementId === 'print-area' ? 840 : 1200;

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      letterRendering: false, // Disabling letterRendering is crucial for CJK fonts!
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: targetWidth,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc: Document) => {
        prepareClonedDocForExport(clonedDoc, elementId);
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
  };

  try {
    await html2pdf().set(opt).from(element).save();
    return true;
  } catch (err) {
    console.error('PDF Export Error:', err);
    return false;
  }
}
