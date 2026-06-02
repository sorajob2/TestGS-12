// ===== ตั้งค่า PDF.js Worker =====
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const PDF_PATH = 'GS12.pdf';
const TARGET_WIDTH = 794;

// ===== โหลดและ Render PDF =====
async function loadPDF() {
  const pdfDoc = await pdfjsLib.getDocument(PDF_PATH).promise;
  console.log('จำนวนหน้า:', pdfDoc.numPages);
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    await renderPage(pdfDoc, pageNum);
  }
}

async function renderPage(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);

  const viewport = page.getViewport({ scale: 1 });
  const scale = TARGET_WIDTH / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.getElementById(`canvas${pageNum}`);
  const ctx = canvas.getContext('2d');
  canvas.width  = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const wrapper = document.getElementById(`page${pageNum}`);

  const wasHidden = !wrapper.classList.contains('active');
  if (wasHidden) {
    wrapper.style.visibility = 'hidden';
    wrapper.style.display = 'block';
  }

  wrapper.style.width  = scaledViewport.width  + 'px';
  wrapper.style.height = scaledViewport.height + 'px';

  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

  if (wasHidden) {
    wrapper.style.display = '';
    wrapper.style.visibility = '';
  }
}

// ===== สลับแท็บ =====
function initTabs() {
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      const pageNum = btn.dataset.page;
      document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page-wrapper').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page${pageNum}`).classList.add('active');
    });
  });
}

// ===== Export PDF (ชัด 100%) =====
async function exportPDF() {
  const { jsPDF } = window.jspdf;

  // โหลด PDF ต้นฉบับ
  const pdfDoc = await pdfjsLib.getDocument(PDF_PATH).promise;
  const totalPages = pdfDoc.numPages;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);

    // Render PDF หน้านั้นลง offscreen canvas ความละเอียดสูง
    const EXPORT_SCALE = 3;
    const viewport = page.getViewport({ scale: EXPORT_SCALE });
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width  = viewport.width;
    offCanvas.height = viewport.height;

    await page.render({ canvasContext: offCtx, viewport }).promise;

    // วาดข้อความจาก input/div ทับลงบน offCanvas
    drawFieldsOnCanvas(offCtx, pageNum, viewport.width, viewport.height, EXPORT_SCALE);

    // แปลงเป็น PNG แล้วใส่ใน PDF
    const imgData = offCanvas.toDataURL('image/png');
    if (pageNum > 1) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  }

  pdf.save('GS12_filled.pdf');
}

function drawPrefixStrike(ctx, ratioX, ratioY, scale, pageNum) {

    let pos;

    if (pageNum === 1) {

        pos = {
            y: 352.5 * ratioY,

            นาย: {
                x: 360 * ratioX,
                width: 20 * ratioX
            },

            นาง: {
                x: 390 * ratioX,
                width: 20 * ratioX
            },

            นางสาว: {
                x: 410 * ratioX,
                width: 42 * ratioX
            }
        };

    } else if (pageNum === 2) {

        pos = {
            y: 312.5 * ratioY,

            นาย: {
                x: 185 * ratioX,
                width: 20 * ratioX
            },

            นาง: {
                x: 215 * ratioX,
                width: 20 * ratioX
            },

            นางสาว: {
                x: 245 * ratioX,
                width: 42 * ratioX
            }
        };

    } else {
        return;
    }
const selectedPrefix =
    pageNum === 1
        ? selectedPrefixP1
        : selectedPrefixP2;
    ['นาย','นาง','นางสาว'].forEach(prefix => {

if (prefix === selectedPrefix) {
        return;
    }

        const p = pos[prefix];

        ctx.beginPath();

        ctx.moveTo(
            p.x,
            pos.y
        );

        ctx.lineTo(
            p.x + p.width,
            pos.y
        );

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1.5;

        ctx.stroke();
    });
}

// ===== วาด fields ลงบน canvas โดยตรง =====
function drawFieldsOnCanvas(ctx, pageNum, canvasW, canvasH, scale) {
  const wrapper = document.getElementById(`page${pageNum}`);
  const wrapperW = parseFloat(wrapper.style.width)  || TARGET_WIDTH;
  const wrapperH = parseFloat(wrapper.style.height) || 1123;

  // อัตราส่วน canvas export vs wrapper บนหน้าจอ
  const ratioX = canvasW / wrapperW;
  const ratioY = canvasH / wrapperH;

  ctx.font = `${17 * scale}px 'TH Sarabun New', Sarabun, sans-serif`;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';

  // ดึง fields ทั้งหมดใน wrapper
  const fields = wrapper.querySelectorAll('.field');
  fields.forEach(el => {
    const top  = parseFloat(el.style.top)  || 0;
    const left = parseFloat(el.style.left) || 0;

    let text = '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      text = el.value;
    } else if (el.isContentEditable) {
      text = el.innerText.replace(/\n/g, '');
    }

    if (!text) return;

    const x = left * ratioX;
    const y = top  * ratioY;

    ctx.fillText(text, x, y);



  });
  if (pageNum === 1 || pageNum === 2) {
  drawPrefixStrike(
    ctx,
    ratioX,
    ratioY,
    scale,
    pageNum
);
}
}

// ===== Setup Two-line flow =====
function setupReqFlow(ids, hiddenId) {
  const lines = ids.map(id => document.getElementById(id));
  const hidden = document.getElementById(hiddenId);

  if (lines.some(l => !l) || !hidden) return;

  function syncValue() {
    hidden.value = lines
      .map(l => l.innerText.replace(/\n/g, ''))
      .join('');
  }

  function moveCursorToEnd(el) {
    el.focus();

    const range = document.createRange();
    const sel = window.getSelection();

    range.selectNodeContents(el);
    range.collapse(false);

    sel.removeAllRanges();
    sel.addRange(range);
  }

  function moveCursorToStart(el) {
    el.focus();

    const range = document.createRange();
    const sel = window.getSelection();

    if (el.childNodes.length > 0) {
      range.setStart(el.childNodes[0], 0);
    } else {
      range.selectNodeContents(el);
    }

    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);
  }

  lines.forEach((line, idx) => {

    line.addEventListener('input', function () {

      const next = lines[idx + 1];

      if (next) {

        while (line.scrollWidth > line.clientWidth) {

          let text = line.innerText;

          if (!text.length) break;

          // ย้ายทีละตัวจากท้ายบรรทัดไปต้นบรรทัดถัดไป
          const lastChar = text.slice(-1);

          line.innerText = text.slice(0, -1);

          next.innerText = lastChar + next.innerText;

          next.dispatchEvent(new Event('input'));
        }
      }

      syncValue();
    });

    line.addEventListener('keydown', function (e) {

      if (e.key === 'Enter') {

        e.preventDefault();

        const next = lines[idx + 1];

        if (next) {
          moveCursorToStart(next);
        }
      }

      if (
        e.key === 'Backspace' &&
        line.innerText === ''
      ) {

        e.preventDefault();

        const prev = lines[idx - 1];

        if (prev) {
          moveCursorToEnd(prev);
        }
      }
    });
  });
}

function initReqFlow() {
  setupReqFlow(
    ['p1_req_line1', 'p1_req_line2', 'p1_req_line3'],
    'p1_req_value'
  );

  setupReqFlow(
  ['p1_thesis1', 'p1_thesis2', 'p1_thesis3'],
  'p1_thesis_value'
);

  setupReqFlow(
    ['p2_req_line1', 'p2_req_line2'],
    'p2_req_value'
  );

setupReqFlow(
  ['p1_note_line1', 'p1_note_line2'],
  'p1_note_value'
);

setupReqFlow(
  ['p2_thesis1', 'p2_thesis2', 'p2_thesis3'],
  'p2_thesis_value'
);


}

// ===== เริ่มต้น =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  document.getElementById('btn-export').addEventListener('click', exportPDF);
  loadPDF();
  initReqFlow();
});
let selectedPrefixP1 = 'นาย';
let selectedPrefixP2 = 'นาย';
document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.strike-group').forEach(group => {

        group.querySelectorAll('.strike-item').forEach(item => {

            item.addEventListener('click', () => {

                const page = group.dataset.page;

                if (page === '1') {
                    selectedPrefixP1 = item.innerText;
                }

                if (page === '2') {
                    selectedPrefixP2 = item.innerText;
                }

                group.querySelectorAll('.strike-item')
                    .forEach(x => x.classList.remove('selected'));

                item.classList.add('selected');

            });

        });

    });

});

