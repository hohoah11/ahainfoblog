/* 아하서식 범용 서식 엔진 (사직서·재직증명서·지출결의서·회의록 등)
   window.DOC 설정: name, title, approval, sections, items, sheet, sample
   자리표시: {id} {id|date} {id|won} {id|kor} {sum} {sum|kor} {range:a,b} {days:a,b} {today}
   입력값은 서버로 보내지 않는다. */
(function () {
  var C = window.DOC; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var stampURL = '', rows = [];
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { v = String(v || '').replace(/[^0-9.\-]/g, ''); return parseFloat(v) || 0; }
  function won(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function kor(n) {
    n = Math.floor(n); if (n <= 0) return '영';
    var d = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'], u = ['', '십', '백', '천'], b = ['', '만', '억', '조'], s = '', g = 0;
    while (n > 0) { var part = n % 10000; if (part) { var p = '', x = part; for (var i = 0; i < 4; i++) { var k = x % 10; if (k) p = d[k] + u[i] + p; x = Math.floor(x / 10); } s = p + b[g] + s; } n = Math.floor(n / 10000); g++; }
    return s;
  }
  function fmtDate(v) { if (!v) return ''; var p = String(v).split('-'); if (p.length < 3) return v; return p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일'; }
  function dayDiff(a, b) { if (!a || !b) return 0; var d = (new Date(b) - new Date(a)) / 86400000; return isNaN(d) ? 0 : Math.round(d) + 1; }
  function today() { var t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function sum() { var k = C.items && C.items.sum; if (!k) return 0; return rows.reduce(function (s, r) { return s + num(r[k]); }, 0); }

  function fill(t) {
    return String(t).replace(/\{([^}]+)\}/g, function (m, key) {
      if (key === 'today') return fmtDate(today());
      if (key.indexOf('range:') === 0) { var ab = key.slice(6).split(','); var a = val(ab[0]), b = val(ab[1]); if (!a && !b) return ''; var n = dayDiff(a, b); return fmtDate(a) + ' ~ ' + fmtDate(b) + (n > 0 ? ' (' + n + '일간)' : ''); }
      if (key.indexOf('days:') === 0) { var cd = key.slice(5).split(','); var n2 = dayDiff(val(cd[0]), val(cd[1])); return n2 > 0 ? String(n2) : ''; }
      var parts = key.split('|'), id = parts[0], f = parts[1];
      var v;
      if (id.indexOf('expr:') === 0) {
        v = 0; id.slice(5).replace(/([+-]?)([a-z0-9_]+)/g, function (m2, sg, k) { var x = k === 'sum' ? sum() : num(val(k)); v += sg === '-' ? -x : x; return ''; });
        if (!f) f = 'won';
      } else v = id === 'sum' ? sum() : val(id);
      if (f === 'date') return esc(fmtDate(v));
      if (f === 'won') return v === '' ? '' : won(num(v));
      if (f === 'kor') return num(v) > 0 ? kor(num(v)) : '';
      return esc(v);
    });
  }
  function seal(html) { return html.replace(/\(인\)/g, stampURL ? '<img class="stamp" src="' + stampURL + '" alt="">' : '(인)'); }

  function field(f) {
    var id = f[0], label = f[1], ph = f[2] || '', type = f[3] || 'text';
    if (type === 'textarea') return '<label for="' + id + '">' + label + '</label><textarea id="' + id + '" placeholder="' + esc(ph) + '"></textarea>';
    if (type === 'select') return '<label for="' + id + '">' + label + '</label><select id="' + id + '">' + (f[4] || []).map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
    if (type === 'stamp') return '<label for="' + id + '">' + label + '</label><input type="file" id="' + id + '" accept="image/*"><div class="hint">이미지는 브라우저 안에서만 쓰입니다. 없으면 (인)으로 표시됩니다.</div>';
    return '<label for="' + id + '">' + label + '</label><input type="' + (type === 'number' ? 'text' : type) + '" ' + (type === 'number' ? 'inputmode="numeric" ' : '') + 'id="' + id + '" placeholder="' + esc(ph) + '">';
  }
  function grid(list) {
    var h = '', buf = [];
    list.forEach(function (f) {
      var wide = f[3] === 'textarea' || f[3] === 'stamp' || f[5] === 'wide';
      if (wide) { if (buf.length) { h += pair(buf); buf = []; } h += field(f); }
      else { buf.push(f); if (buf.length === 2) { h += pair(buf); buf = []; } }
    });
    if (buf.length) h += pair(buf);
    return h;
  }
  function pair(b) { return '<div class="row2"><div>' + field(b[0]) + '</div><div>' + (b[1] ? field(b[1]) : '') + '</div></div>'; }

  var panel = '<div class="panel"><h2>' + C.name + ' 내용 입력</h2>' +
    C.sections.map(function (s) { return '<fieldset><legend>' + s.legend + '</legend>' + grid(s.fields) + '</fieldset>'; }).join('') +
    (C.items ? '<fieldset><legend>' + (C.items.legend || '내역') + '</legend><div style="overflow-x:auto"><table class="items"><tbody id="itemRows"></tbody></table></div><div class="actions"><button class="btn sm" type="button" id="addRow">+ 줄 추가</button></div></fieldset>' : '') +
    '<div class="actions"><button class="btn primary" type="button" onclick="window.print()">인쇄 / PDF 저장</button><button class="btn" type="button" id="fillSample">예시로 채워 보기</button><button class="btn" type="button" id="reset">새로 쓰기</button></div>' +
    '<div class="hint">PDF로 저장하려면 인쇄 창에서 대상을 "PDF로 저장"으로 고르세요.</div></div>';
  $('tool').innerHTML = panel + '<div class="preview-wrap"><div id="sheet" class="docsheet" aria-label="' + C.name + ' 미리보기"></div></div>';

  function approvalHtml() {
    if (!C.approval) return '';
    return '<table class="approval"><tr><th rowspan="2" class="vlabel">결재</th>' + C.approval.map(function (a) { return '<th>' + a + '</th>'; }).join('') + '</tr><tr>' + C.approval.map(function () { return '<td></td>'; }).join('') + '</tr></table>';
  }
  function itemsHtml() {
    var cols = C.items.cols, h = '<table class="itable"><thead><tr><th style="width:6%">No</th>' + cols.map(function (c) { return '<th' + (c[3] ? ' style="width:' + c[3] + '"' : '') + '>' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>';
    var n = 0;
    rows.forEach(function (r) {
      if (!cols.some(function (c) { return r[c[0]]; })) return; n++;
      h += '<tr><td class="c">' + n + '</td>' + cols.map(function (c) { var v = r[c[0]] || ''; return c[2] === 'num' ? '<td class="num">' + (v === '' ? '' : won(num(v))) + '</td>' : c[2] === 'date' ? '<td class="c">' + esc(fmtDate(v)) + '</td>' : '<td>' + esc(v) + '</td>'; }).join('') + '</tr>';
    });
    for (var e = n; e < (C.items.rows || 5); e++) h += '<tr><td class="c">&nbsp;</td>' + cols.map(function () { return '<td></td>'; }).join('') + '</tr>';
    h += '</tbody>';
    if (C.items.sum) {
      var idx = cols.map(function (c) { return c[0]; }).indexOf(C.items.sum);
      h += '<tfoot><tr><th colspan="' + (idx + 1) + '">합 계</th><td class="num">' + won(sum()) + '</td>' + (cols.length - idx - 1 > 0 ? '<td colspan="' + (cols.length - idx - 1) + '"></td>' : '') + '</tr></tfoot>';
    }
    return h + '</table>';
  }
  function render() {
    var h = '<div class="dhead"><h3>' + C.title + '</h3>' + approvalHtml() + '</div>';
    C.sheet.forEach(function (b) {
      if (b.t === 'kv') {
        var per = b.cols || 1, rs = b.rows, t = '<table class="kv">';
        for (var i = 0; i < rs.length; i += per) {
          t += '<tr>';
          for (var j = 0; j < per; j++) { var r = rs[i + j]; if (r) t += '<th>' + r[0] + '</th><td' + (r[2] ? ' colspan="' + r[2] + '"' : '') + '>' + fill(r[1]) + '</td>'; else t += '<th></th><td></td>'; }
          t += '</tr>';
        }
        h += t + '</table>';
      } else if (b.t === 'p') {
        h += '<p class="dp' + (b.cls ? ' ' + b.cls : '') + '">' + seal(fill(b.text)) + '</p>';
      } else if (b.t === 'box') {
        h += '<table class="kv"><tr><th style="width:16%">' + b.label + '</th><td class="pre" style="height:' + (b.h || 90) + 'px;vertical-align:top">' + fill(b.text) + '</td></tr></table>';
      } else if (b.t === 'items') {
        h += itemsHtml();
      } else if (b.t === 'total') {
        h += '<div class="total-box"><span>' + (b.label || '합계금액') + ' <b>' + (sum() > 0 ? '금 ' + kor(sum()) + '원정' : '') + '</b></span><b>(₩' + won(sum()) + ')</b></div>';
      } else if (b.t === 'sign') {
        h += '<div class="dsign">' + b.lines.map(function (l) { return '<div>' + seal(fill(l)) + '</div>'; }).join('') + '</div>';
      } else if (b.t === 'to') {
        h += '<div class="dto">' + fill(b.text) + '</div>';
      }
    });
    $('sheet').innerHTML = h;
  }
  function renderRows() {
    if (!C.items) return;
    var tb = $('itemRows'); tb.innerHTML = '';
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      tr.innerHTML = C.items.cols.map(function (c) {
        var t = c[2] === 'date' ? 'date' : 'text';
        return '<td><input type="' + t + '" data-k="' + c[0] + '"' + (c[2] === 'num' ? ' inputmode="numeric"' : '') + ' placeholder="' + c[1] + '" value="' + esc(r[c[0]] || '') + '"></td>';
      }).join('') + '<td><button class="btn sm" type="button" aria-label="삭제">×</button></td>';
      tr.querySelectorAll('input').forEach(function (inp) { inp.addEventListener('input', function () { r[inp.dataset.k] = inp.value; render(); }); });
      tr.querySelector('button').addEventListener('click', function () { rows.splice(i, 1); if (!rows.length) rows.push({}); renderRows(); render(); });
      tb.appendChild(tr);
    });
  }
  var KEY = 'aha_doc_common';
  var memo = ['company', 'ceo', 'biz_no', 'company_addr'];
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) memo.forEach(function (k) { if ($(k) && saved[k]) $(k).value = saved[k]; }); } catch (e) { }
  document.querySelectorAll('#tool input, #tool select, #tool textarea').forEach(function (el) {
    if (el.type === 'file') {
      el.addEventListener('change', function () {
        var f = el.files && el.files[0]; if (!f) { stampURL = ''; render(); return; }
        var rd = new FileReader(); rd.onload = function () { stampURL = rd.result; render(); }; rd.readAsDataURL(f);
      });
    } else {
      el.addEventListener('input', function () {
        render();
        if (memo.indexOf(el.id) >= 0) { try { var o = {}; memo.forEach(function (k) { if ($(k)) o[k] = $(k).value; }); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }
      });
      el.addEventListener('change', render);
    }
  });
  if (C.items) $('addRow').addEventListener('click', function () { rows.push({}); renderRows(); render(); });
  $('fillSample').addEventListener('click', function () {
    var s = C.sample || {};
    for (var k in (s.fields || {})) if ($(k)) $(k).value = s.fields[k];
    if (C.items) { rows = (s.items || []).map(function (a) { var o = {}; C.items.cols.forEach(function (c, i) { o[c[0]] = a[i] == null ? '' : String(a[i]); }); return o; }); if (!rows.length) rows = [{}]; renderRows(); }
    render();
  });
  $('reset').addEventListener('click', function () {
    document.querySelectorAll('#tool input, #tool textarea').forEach(function (el) { if (memo.indexOf(el.id) < 0) el.value = ''; });
    (C.dateDefaults || []).forEach(function (k) { if ($(k)) $(k).value = today(); });
    stampURL = ''; rows = [{}, {}]; renderRows(); render();
  });
  (C.dateDefaults || []).forEach(function (k) { if ($(k) && !$(k).value) $(k).value = today(); });
  rows = [{}, {}]; renderRows(); render();
})();
