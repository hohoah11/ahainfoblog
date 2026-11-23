/* 아하서식 거래 문서 엔진 (견적서·거래명세서·청구서·발주서 등 공통)
   페이지에서 window.DOC 설정을 정의한 뒤 이 파일을 불러온다.
   입력값은 서버로 보내지 않는다. 공급자 정보만 사용자가 원할 때 localStorage에 저장한다. */
(function () {
  var C = window.DOC; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var rows = [], stampURL = '';
  var SUP = [['s_no', '사업자등록번호', '123-45-67890'], ['s_name', '상호', '예: 한결상사'], ['s_ceo', '대표자', ''], ['s_tel', '연락처', '02-000-0000'], ['s_addr', '사업장 주소', ''], ['s_type', '업태', '도소매'], ['s_item', '종목', '사무용품']];
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function won(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function num(v) { v = String(v || '').replace(/[^0-9.\-]/g, ''); return parseFloat(v) || 0; }
  function kor(n) {
    n = Math.floor(n); if (n <= 0) return '영';
    var d = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'], u = ['', '십', '백', '천'], b = ['', '만', '억', '조'], s = '', g = 0;
    while (n > 0) { var part = n % 10000; if (part) { var p = '', x = part; for (var i = 0; i < 4; i++) { var k = x % 10; if (k) p = d[k] + u[i] + p; x = Math.floor(x / 10); } s = p + b[g] + s; } n = Math.floor(n / 10000); g++; }
    return s;
  }
  function fmtDate(v) { if (!v) return ''; var p = v.split('-'); return p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일'; }
  function field(f, type) {
    var t = f[3] || type || 'text';
    if (t === 'textarea') return '<label for="' + f[0] + '">' + f[1] + '</label><textarea id="' + f[0] + '" placeholder="' + esc(f[2] || '') + '"></textarea>';
    return '<label for="' + f[0] + '">' + f[1] + '</label><input type="' + t + '" id="' + f[0] + '" placeholder="' + esc(f[2] || '') + '">';
  }
  function grid(list) { var h = ''; for (var i = 0; i < list.length; i += 2) { h += '<div class="row2"><div>' + field(list[i]) + '</div><div>' + (list[i + 1] ? field(list[i + 1]) : '') + '</div></div>'; } return h; }

  /* 입력 패널 */
  var basic = [['date', C.dateLabel || '작성일자', '', 'date'], ['docno', '문서번호(선택)', '예: 2026-001']].concat(C.basic || []);
  var panel = '<div class="panel"><h2>' + C.name + ' 내용 입력</h2>' +
    '<fieldset><legend>기본 정보</legend>' + grid(basic) +
    '<label for="tax">부가세 처리</label><select id="tax"><option value="excl">단가에 부가세 별도 (단가 + 10%)</option><option value="incl">단가에 부가세 포함 (금액에서 역산)</option><option value="free">면세 (세액 0원)</option></select></fieldset>' +
    '<fieldset><legend>' + (C.supTitle || '공급자 (보내는 쪽)') + '</legend>' + grid(SUP) +
    '<label for="stamp">도장 이미지(선택)</label><input type="file" id="stamp" accept="image/*"><div class="hint">도장 이미지는 브라우저 안에서만 쓰입니다. 없으면 (인)으로 표시됩니다.</div>' +
    '<div class="actions"><button class="btn sm" type="button" id="saveCo">이 공급자 정보 기억하기</button><button class="btn sm" type="button" id="clearCo">기억한 정보 지우기</button></div></fieldset>' +
    '<fieldset><legend>' + C.recvTitle + '</legend>' + grid(C.recv) + '</fieldset>' +
    '<fieldset><legend>품목</legend><table class="items"><tbody id="itemRows"></tbody></table><div class="actions"><button class="btn sm" type="button" id="addRow">+ 품목 추가</button></div></fieldset>' +
    '<fieldset><legend>' + (C.termsTitle || '조건·비고') + '</legend>' + (C.terms || []).map(function (f) { return field(f); }).join('') + field(['memo', '비고', '', 'textarea']) + '</fieldset>' +
    '<div class="actions"><button class="btn primary" type="button" onclick="window.print()">인쇄 / PDF 저장</button><button class="btn" type="button" id="fillSample">예시로 채워 보기</button><button class="btn" type="button" id="reset">새로 쓰기</button></div>' +
    '<div class="hint">PDF로 저장하려면 인쇄 창에서 대상을 "PDF로 저장"으로 고르세요.</div></div>';

  /* 미리보기 */
  var leftRows = C.recv.filter(function (f) { return !f[4]; }).map(function (f) { return '<tr><th>' + (f[5] || f[1].replace(/\(선택\)/, '')) + '</th><td id="p_' + f[0] + '"></td></tr>'; }).join('') +
    '<tr><th>' + (C.dateLabel || '작성일자') + '</th><td id="p_date"></td></tr>' +
    (C.basic || []).map(function (f) { return '<tr><th>' + f[1].replace(/\(선택\)/, '') + '</th><td id="p_' + f[0] + '"></td></tr>'; }).join('');
  var nLeft = (leftRows.match(/<tr>/g) || []).length;
  var termRows = (C.terms || []).map(function (f) { return '<tr><th style="width:16%">' + f[1].replace(/\(선택\)/, '') + '</th><td id="p_' + f[0] + '"></td></tr>'; }).join('');
  var sheet = '<div class="preview-wrap"><div id="sheet" aria-label="' + C.name + ' 미리보기">' +
    '<h3>' + C.title + '</h3><div class="sub">' + (C.sub || '') + ' <span id="p_docno"></span></div>' +
    '<div class="parties"><table><tr><th class="vlabel" rowspan="' + nLeft + '">' + C.recvLabel + '</th>' + leftRows.replace(/^<tr>/, '') + '</table>' +
    '<table><tr><th class="vlabel" rowspan="5">' + (C.supLabel || '공급자') + '</th><th>등록번호</th><td colspan="3" id="p_s_no"></td></tr><tr><th>상호</th><td id="p_s_name"></td><th>성명</th><td class="seal" id="p_s_ceo"></td></tr><tr><th>주소</th><td colspan="3" id="p_s_addr"></td></tr><tr><th>업태</th><td id="p_s_type"></td><th>종목</th><td id="p_s_item"></td></tr><tr><th>연락처</th><td colspan="3" id="p_s_tel"></td></tr></table></div>' +
    (C.intro ? '<p style="margin:6px 0 0">' + C.intro + '</p>' : '') +
    '<div class="total-box"><span>' + (C.totalLabel || '합계금액') + ' <b id="p_kor">금 영원정</b></span><b id="p_total">(₩0)</b></div>' +
    '<table><thead><tr><th style="width:5%">No</th><th>품목</th><th style="width:12%">규격</th><th style="width:9%">수량</th><th style="width:14%">단가</th><th style="width:16%">공급가액</th><th style="width:13%">세액</th></tr></thead><tbody id="p_items"></tbody><tfoot><tr><th colspan="5">합 계</th><td class="num" id="p_sup"></td><td class="num" id="p_vat"></td></tr></tfoot></table>' +
    '<table style="margin-top:8px">' + termRows + '<tr><th style="width:16%">비고</th><td id="p_memo" style="height:40px"></td></tr></table>' +
    '<div class="sign"><span>' + (C.closing || '') + '</span>' + (C.sign ? '<span>' + C.sign + ': ____________ (인)</span>' : '') + '</div></div></div>';
  $('tool').innerHTML = panel + sheet;

  function calc(r, mode) {
    var amt = num(r.qty) * num(r.price);
    if (mode === 'incl') { var sup = Math.round(amt / 1.1); return { sup: sup, vat: amt - sup }; }
    if (mode === 'free') return { sup: Math.round(amt), vat: 0 };
    return { sup: Math.round(amt), vat: Math.floor(amt * 0.1) };
  }
  function blank() { return { name: '', spec: '', qty: '', price: '' }; }
  function renderRows() {
    var tb = $('itemRows'); tb.innerHTML = '';
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="width:34%"><input data-k="name" placeholder="품목" value="' + esc(r.name) + '"></td><td style="width:16%"><input data-k="spec" placeholder="규격" value="' + esc(r.spec) + '"></td><td style="width:13%"><input data-k="qty" inputmode="numeric" placeholder="수량" value="' + esc(r.qty) + '"></td><td style="width:27%"><input data-k="price" inputmode="numeric" placeholder="단가" value="' + esc(r.price) + '"></td><td><button class="btn sm" type="button" aria-label="삭제">×</button></td>';
      tr.querySelectorAll('input').forEach(function (inp) { inp.addEventListener('input', function () { r[inp.dataset.k] = inp.value; update(); }); });
      tr.querySelector('button').addEventListener('click', function () { rows.splice(i, 1); if (!rows.length) rows.push(blank()); renderRows(); update(); });
      tb.appendChild(tr);
    });
  }
  var textIds = SUP.map(function (f) { return f[0]; }).filter(function (k) { return k !== 's_ceo'; })
    .concat(C.recv.filter(function (f) { return !f[4]; }).map(function (f) { return f[0]; }))
    .concat((C.terms || []).map(function (f) { return f[0]; })).concat(['memo']);
  function update() {
    var mode = $('tax').value;
    textIds.forEach(function (k) { var p = $('p_' + k); if (p) p.textContent = $(k).value; });
    $('p_date').textContent = fmtDate($('date').value);
    (C.basic || []).forEach(function (f) { $('p_' + f[0]).textContent = f[3] === 'date' ? fmtDate($(f[0]).value) : $(f[0]).value; });
    $('p_docno').textContent = $('docno').value ? 'No. ' + $('docno').value : '';
    $('p_s_ceo').innerHTML = esc($('s_ceo').value) + (stampURL ? '<img src="' + stampURL + '" alt="">' : ' <span style="float:right">(인)</span>');
    var html = '', ts = 0, tv = 0, n = 0;
    rows.forEach(function (r) {
      if (!r.name && !r.qty && !r.price) return;
      var c = calc(r, mode); ts += c.sup; tv += c.vat; n++;
      html += '<tr><td class="c">' + n + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.spec) + '</td><td class="num">' + (r.qty ? won(num(r.qty)) : '') + '</td><td class="num">' + (r.price ? won(num(r.price)) : '') + '</td><td class="num">' + won(c.sup) + '</td><td class="num">' + won(c.vat) + '</td></tr>';
    });
    for (var e = n; e < 8; e++) html += '<tr><td class="c">&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
    $('p_items').innerHTML = html;
    $('p_sup').textContent = won(ts); $('p_vat').textContent = won(tv);
    $('p_kor').textContent = '금 ' + kor(ts + tv) + '원정';
    $('p_total').textContent = '(₩' + won(ts + tv) + ')';
  }
  var coKeys = SUP.map(function (f) { return f[0]; });
  $('saveCo').addEventListener('click', function () {
    var o = {}; coKeys.forEach(function (k) { o[k] = $(k).value; });
    try { localStorage.setItem('aha_company', JSON.stringify(o)); this.textContent = '저장했습니다'; } catch (e) { this.textContent = '이 브라우저에서는 저장할 수 없습니다'; }
  });
  $('clearCo').addEventListener('click', function () { try { localStorage.removeItem('aha_company'); } catch (e) { } this.textContent = '지웠습니다'; });
  try { var saved = JSON.parse(localStorage.getItem('aha_company') || 'null'); if (saved) coKeys.forEach(function (k) { if (saved[k]) $(k).value = saved[k]; }); } catch (e) { }
  $('stamp').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) { stampURL = ''; update(); return; }
    var rd = new FileReader(); rd.onload = function () { stampURL = rd.result; update(); }; rd.readAsDataURL(f);
  });
  $('addRow').addEventListener('click', function () { rows.push(blank()); renderRows(); update(); });
  $('fillSample').addEventListener('click', function () {
    var s = C.sample || {}; for (var k in s.fields) if ($(k)) $(k).value = s.fields[k];
    rows = (s.items || []).map(function (r) { return { name: r[0], spec: r[1], qty: String(r[2]), price: String(r[3]) }; });
    if (s.tax) $('tax').value = s.tax;
    renderRows(); update();
  });
  $('reset').addEventListener('click', function () {
    ['docno', 'memo'].concat(C.recv.map(function (f) { return f[0]; })).concat((C.terms || []).map(function (f) { return f[0]; })).concat((C.basic || []).map(function (f) { return f[0]; })).forEach(function (k) { if ($(k)) $(k).value = ''; });
    rows = [blank(), blank()]; renderRows(); update();
  });
  document.querySelectorAll('#tool input, #tool select, #tool textarea').forEach(function (el) { if (el.id !== 'stamp') el.addEventListener('input', update); });
  $('tax').addEventListener('change', update);
  var t = new Date(); $('date').value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  rows = [blank(), blank()]; renderRows(); update();
})();
