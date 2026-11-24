// 집계 페이지 전용 — CSV 나누기·집계·표 그리기 함수는 이 파일에 둔다.
// 저장소는 common.js의 loadData·saveData로만 쓴다(docs/design.md 3절).

var REQUIRED_COLUMNS = ["접수번호", "접수일", "유형", "처리상태"];

// 붙여 넣은 CSV 텍스트를 머리글과 데이터 행으로 나눈다(design.md 2절 입력 형식).
// - 쉼표로 나누고 각 칸 앞뒤 공백을 지운다. 큰따옴표 안 쉼표는 지원하지 않는다.
// - 완전히 빈 줄은 무시한다. 줄 번호는 붙여 넣은 텍스트 기준(머리글 = 1).
// - 칸 수가 머리글보다 모자라면 모자란 칸을 ""로 채운다.
// 돌려주는 값: {header, rows:[{line, values}], totalRows}. 머리글 줄이 없으면 null.
function splitCsv(text) {
  var lines = String(text).replace(/^﻿/, "").split(/\r\n|\r|\n/);
  var header = null;
  var rows = [];
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    var cells = lines[i].split(",").map(function (c) { return c.trim(); });
    if (header === null) {
      header = cells;
      continue;
    }
    while (cells.length < header.length) cells.push("");
    rows.push({ line: i + 1, values: cells });
  }
  if (header === null) return null;
  return { header: header, rows: rows, totalRows: rows.length };
}

// 머리글에 없는 필수 열 이름 목록을 돌려준다(없으면 빈 배열).
function checkHeader(header) {
  return REQUIRED_COLUMNS.filter(function (name) { return header.indexOf(name) === -1; });
}

// 지금 때를 "2026-11-24T09:00:00" 모양(로컬 시각)으로.
function nowIso() {
  var d = new Date();
  function two(n) { return (n < 10 ? "0" : "") + n; }
  return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) +
    "T" + two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds());
}

// 나눈 CSV로 design.md 2절의 tally 객체를 만든다.
// - 빈칸 = 필수 4열 중 하나라도 빈 값. 중복 = 모든 열 값이 앞에 나온 행과 같음(처음 행은 남김).
// - 둘 다이면 사유는 "빈칸" 하나.
function buildTally(parsed) {
  var header = parsed.header;
  var reqIdx = REQUIRED_COLUMNS.map(function (name) { return header.indexOf(name); });
  var typeIdx = header.indexOf("유형");
  var statusIdx = header.indexOf("처리상태");
  var seen = {};
  var excluded = [];
  var byType = {};
  var byStatus = {};

  parsed.rows.forEach(function (r) {
    var key = JSON.stringify(r.values);
    var isDup = seen[key] === true;
    seen[key] = true;
    var isBlank = reqIdx.some(function (i) { return r.values[i] === ""; });
    if (isBlank) {
      excluded.push({ row: r.line, reason: "빈칸", values: r.values });
    } else if (isDup) {
      excluded.push({ row: r.line, reason: "중복", values: r.values });
    } else {
      var t = r.values[typeIdx];
      var s = r.values[statusIdx];
      byType[t] = (byType[t] || 0) + 1;
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
  });

  function sum(obj) {
    return Object.keys(obj).reduce(function (a, k) { return a + obj[k]; }, 0);
  }
  var expected = parsed.totalRows - excluded.length;
  var typeSum = sum(byType);
  var statusSum = sum(byStatus);

  return {
    savedAt: nowIso(),
    header: header,
    totalRows: parsed.totalRows,
    excluded: excluded,
    byType: byType,
    byStatus: byStatus,
    check: {
      expected: expected,
      typeSum: typeSum,
      statusSum: statusSum,
      match: expected === typeSum && typeSum === statusSum
    }
  };
}

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = String(text);
  return e;
}

// {이름: 건수} 객체를 건수표로 그린다. 끝에 합계 줄.
function countTable(title, obj, total) {
  var table = el("table");
  var head = el("tr");
  head.appendChild(el("th", "", title));
  head.appendChild(el("th", "", "건수"));
  table.appendChild(head);
  var keys = Object.keys(obj);
  if (keys.length === 0) {
    var empty = el("tr");
    var td = el("td", "", "남은 행이 없습니다");
    td.colSpan = 2;
    empty.appendChild(td);
    table.appendChild(empty);
  }
  keys.forEach(function (k) {
    var tr = el("tr");
    tr.appendChild(el("td", "", k));
    tr.appendChild(el("td", "num", obj[k]));
    table.appendChild(tr);
  });
  var sumRow = el("tr");
  sumRow.appendChild(el("th", "", "합계"));
  sumRow.appendChild(el("th", "num", total));
  table.appendChild(sumRow);
  return table;
}

// tally 객체를 결과 영역에 그린다(값은 textContent로만 넣는다).
function render(tally) {
  var box = document.getElementById("result");
  box.innerHTML = "";
  box.className = "";
  var c = tally.check;

  box.appendChild(el("h2", "", "합계 판정"));
  var t = el("table");
  [["전체 행", tally.totalRows], ["제외 행", tally.excluded.length], ["합계 (전체 − 제외)", c.expected]]
    .forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("th", "", r[0]));
      tr.appendChild(el("td", "num", r[1]));
      t.appendChild(tr);
    });
  var tr = el("tr");
  tr.appendChild(el("th", "", "판정"));
  var td = el("td");
  td.appendChild(el("span", c.match ? "match" : "mismatch", c.match ? "일치" : "불일치"));
  td.appendChild(document.createTextNode(
    " (전체 − 제외 " + c.expected + " · 유형별 합계 " + c.typeSum + " · 처리상태별 합계 " + c.statusSum + ")"));
  td.appendChild(el("span", "review", "담당 검토 후 확정"));
  tr.appendChild(td);
  t.appendChild(tr);
  box.appendChild(t);

  box.appendChild(el("h2", "", "유형별 건수"));
  box.appendChild(countTable("유형", tally.byType, c.typeSum));
  box.appendChild(el("h2", "", "처리상태별 건수"));
  box.appendChild(countTable("처리상태", tally.byStatus, c.statusSum));

  box.appendChild(el("h2", "", "제외 행 (원본 행 번호·사유)"));
  if (tally.excluded.length === 0) {
    box.appendChild(el("p", "notice", "제외된 행이 없습니다."));
  } else {
    var ex = el("table");
    var h = el("tr");
    h.appendChild(el("th", "", "원본 행 번호"));
    h.appendChild(el("th", "", "사유"));
    ex.appendChild(h);
    tally.excluded.forEach(function (x) {
      var r = el("tr");
      r.appendChild(el("td", "num", x.row));
      var rc = el("td", "", x.reason);
      rc.appendChild(el("span", "review", "담당 검토 후 확정"));
      r.appendChild(rc);
      ex.appendChild(r);
    });
    box.appendChild(ex);
    box.appendChild(el("p", "", "원본 값 전체와 excluded_rows.csv는 근거 페이지에서 봅니다."));
  }
}

function showMsg(cls, text) {
  var m = document.getElementById("tally-msg");
  m.className = cls;
  m.textContent = text;
}

// [집계] — 실패하면 이유만 알리고 저장하지 않는다.
document.getElementById("btn-tally").addEventListener("click", function () {
  var text = document.getElementById("csv-input").value;
  var parsed = splitCsv(text);
  if (parsed === null) {
    showMsg("error", "붙여 넣은 내용이 없습니다. CSV 내용을 텍스트 칸에 붙여 넣으세요. 저장하지 않았습니다.");
    return;
  }
  var missing = checkHeader(parsed.header);
  if (missing.length > 0) {
    showMsg("error", "머리글에 필요한 열이 없습니다: " + missing.join(", ") + ". 저장하지 않았습니다.");
    return;
  }
  var tally = buildTally(parsed);
  // 저장은 common.js 함수로만 — 다시 집계하면 tally를 통째로 덮어쓴다.
  var data = loadData();
  data.tally = tally;
  saveData(data);
  render(tally);
  showMsg("notice", "집계 결과를 저장했습니다(집계한 때 " + tally.savedAt + "). 다시 집계하면 덮어씁니다.");
});

// 페이지를 열 때 저장된 결과가 있으면 그대로 보여 준다(CSV를 다시 계산하지 않음).
(function showSaved() {
  var t = loadData().tally;
  if (t && typeof t === "object" && Array.isArray(t.excluded) && t.check) {
    render(t);
    showMsg("notice", "저장된 집계 결과입니다(집계한 때 " + t.savedAt + "). 새로 붙여 넣고 [집계]를 누르면 덮어씁니다.");
  }
})();
