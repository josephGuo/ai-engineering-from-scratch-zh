'use strict';

// pagedjs-cli 0.4.3 does not wait for fonts before measuring and fragmenting text.
class ManualPrintReady extends Paged.Handler {
  async beforeParsed() {
    for (const family of ['Manual Noto Sans', 'Manual Noto Mono', 'Manual Noto Symbols', 'Manual Noto Emoji']) {
      const loaded = await document.fonts.load(`400 10pt "${family}"`, '中文ABC✅✗❌');
      if (!loaded.length) throw new Error(`Missing print font: ${family}`);
    }
    await document.fonts.ready;
  }

  afterRendered() {
    // Paged.js has already fragmented the DOM. Native print columns/break rules can
    // otherwise re-fragment it and clip the last line of a paragraph or table cell.
    const style = document.createElement('style');
    style.textContent = '@media print { .pagedjs_page_content { column-width: auto !important; column-count: auto !important; } .pagedjs_page_content * { break-before: auto !important; break-after: auto !important; break-inside: auto !important; orphans: 1 !important; widows: 1 !important; } }';
    document.head.appendChild(style);
  }
}
Paged.registerHandlers(ManualPrintReady);
