// Gerador mínimo de PDF (texto, A4 paisagem, Helvetica/WinAnsi), sem dependências, para o espelho de ponto (Card 11).
// Recebe o mesmo modelo de tabela do CSV (timeTracking.mirrorTable), então os dois exportam o mesmo conteúdo.

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 36;
const LINE = 13;
const COL_WIDTHS = [64, 32, 96, 96, 96, 96, 78, 62, 70];   // soma 690 (cabe nos 770 úteis)

// Unicode -> byte WinAnsi. Latin-1 passa direto; alguns sinais ficam na faixa 0x80-0x9F.
const WIN = { '—': 0x97, '–': 0x96, '“': 0x93, '”': 0x94, '‘': 0x91, '’': 0x92, '•': 0x95, '…': 0x85 };
function winAnsi(text) {
  let out = '';
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    if (WIN[ch]) out += String.fromCharCode(WIN[ch]);
    else if (code === 0x28 || code === 0x29 || code === 0x5c) out += `\\${ch}`;
    else if (code >= 0x20 && code <= 0xff) out += ch;
    else out += '?';
  }
  return out;
}

// Quebra por largura aproximada (Helvetica média ~0.5 do corpo).
function wrap(text, size, width) {
  const per = Math.max(10, Math.floor(width / (size * 0.5)));
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= per) cur += ` ${w}`;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

export function buildPdf(table) {
  const pages = [];
  let ops = [];
  let y = PAGE_H - MARGIN;
  const usable = PAGE_W - 2 * MARGIN;

  const newPage = () => { if (ops.length) pages.push(ops.join('\n')); ops = []; y = PAGE_H - MARGIN; };
  const need = (h) => { if (y - h < MARGIN) { newPage(); drawHeaderRow(); } };
  const text = (x, size, bold, s) => ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${winAnsi(s)}) Tj ET`);
  const rule = () => ops.push(`0.5 w ${MARGIN} ${y} m ${MARGIN + usable} ${y} l S`);

  // posições x acumuladas
  const colX = []; let acc = MARGIN;
  for (const w of COL_WIDTHS) { colX.push(acc); acc += w; }

  function drawHeaderRow() {
    table.columns.forEach((c, i) => text(colX[i], 8, true, c));
    y -= 5; rule(); y -= LINE - 3;
  }

  // Cabeçalho do documento
  text(MARGIN, 15, true, table.title); y -= 18;
  text(MARGIN, 9, false, table.subtitle); y -= 22;
  drawHeaderRow();

  for (const row of table.rows) {
    need(LINE);
    row.forEach((cell, i) => text(colX[i], 8.5, false, cell));
    y -= LINE;
  }
  if (!table.rows.length) { text(MARGIN, 9, false, 'Sem marcações neste mês.'); y -= LINE; }

  y -= 6; need(LINE * (table.totals.length + 2));
  text(MARGIN, 9, true, 'Totais'); y -= LINE;
  for (const t of table.totals) { need(LINE); text(MARGIN, 9, false, t); y -= LINE; }

  if (table.flagged.length) {
    y -= 6; need(LINE * 3);
    text(MARGIN, 9, true, table.flaggedTitle); y -= LINE;
    for (const f of table.flagged) {
      for (const part of wrap(f, 8.5, usable)) { need(LINE); text(MARGIN, 8.5, false, part); y -= LINE; }
    }
  }

  y -= 8; need(LINE * 2);
  for (const part of wrap(table.note, 8, usable)) { need(LINE); text(MARGIN, 8, false, part); y -= LINE; }
  newPage();

  // Objetos: 1 catálogo, 2 páginas, 3 Helvetica, 4 Helvetica-Bold, depois (página, conteúdo) por página.
  const objs = [];
  const kids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((content, i) => {
    const pageId = 5 + i * 2;
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objs[pageId + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let id = 1; id < objs.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objs[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objs.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // Todos os caracteres são <= 0xFF: um byte por caractere.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
