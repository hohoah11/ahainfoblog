/* 아하서식 계산기 엔진. window.CALC = { name, inputs, compute(v, H), sample }
   inputs 항목: [id, 라벨, 종류(number|date|select|text), 기본값, 선택지배열, 도움말]
   compute는 { rows: [[라벨, 값, 'main'?]], note: '...' } 를 돌려준다. 입력값은 서버로 보내지 않는다. */
(function () {
  var C = window.CALC; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var H = {
    num: function (v) { v = String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''); return parseFloat(v) || 0; },
    won: function (n) { return Math.round(n).toLocaleString('ko-KR') + '원'; },
    n: function (n, d) { return Number(n).toLocaleString('ko-KR', { maximumFractionDigits: d == null ? 2 : d }); },
    date: function (v) { if (!v) return null; var d = new Date(v + 'T00:00:00'); return isNaN(d) ? null : d; },
    fmt: function (d) { return d ? d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일' : ''; },
    days: function (a, b) { return Math.round((b - a) / 86400000); },
    today: function () { var t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); },
    floor10: function (n) { return Math.floor(n / 10 + 1e-7) * 10; }
  };
  window.AHA = H;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function field(f) {
    var id = f[0], label = f[1], type = f[2] || 'number', def = f[3], hint = f[5];
    var h = '<label for="' + id + '">' + label + '</label>';
    if (type === 'select') h += '<select id="' + id + '">' + (f[4] || []).map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(def) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>';
    else if (type === 'textarea') h += '<textarea id="' + id + '" style="min-height:160px">' + esc(def || '') + '</textarea>';
    else h += '<input id="' + id + '" type="' + (type === 'date' || type === 'time' ? type : 'text') + '"' + (type === 'number' ? ' inputmode="decimal"' : '') + ' value="' + esc(def === 'today' ? H.today() : (def == null ? '' : def)) + '">';
    if (hint) h += '<div class="hint">' + hint + '</div>';
    return h;
  }
  $('tool').className = 'calc';
  $('tool').innerHTML = '<div class="panel"><h2>' + C.name + ' 입력</h2>' + C.inputs.map(field).join('') +
    '<div class="actions" style="margin-top:12px"><button class="btn" type="button" id="fillSample">예시 값 넣기</button><button class="btn" type="button" onclick="window.print()">결과 인쇄</button></div></div>' +
    '<div class="result" aria-live="polite"><h2>계산 결과</h2><div id="calcout"></div></div>';
  function run() {
    var v = {};
    C.inputs.forEach(function (f) { v[f[0]] = $(f[0]).value; });
    var r;
    try { r = C.compute(v, H) || {}; } catch (e) { r = { rows: [], note: '입력값을 확인해 주세요.' }; }
    var h = '';
    if (r.rows && r.rows.length) h += '<table>' + r.rows.map(function (x) { return '<tr' + (x[2] === 'main' ? ' class="main"' : '') + '><td>' + x[0] + '</td><td class="v">' + x[1] + '</td></tr>'; }).join('') + '</table>';
    if (r.note) h += '<div class="rnote">' + r.note + '</div>';
    $("calcout").innerHTML = h || '<div class="rnote">값을 입력하면 바로 계산됩니다.</div>';
  }
  C.inputs.forEach(function (f) { $(f[0]).addEventListener('input', run); $(f[0]).addEventListener('change', run); });
  $('fillSample').addEventListener('click', function () { var s = C.sample || {}; for (var k in s) if ($(k)) $(k).value = s[k]; run(); });
  run();
})();
