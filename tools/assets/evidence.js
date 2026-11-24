// 근거 페이지 전용 — 제외 행 표 그리기·excluded_rows.csv 만들기 함수는 이 파일에 둔다.
// 저장소는 common.js의 loadData로 읽기만 한다(docs/design.md 2·3절). CSV를 다시 계산하지 않는다.

function showMsg(cls, text) {
  var m = document.getElementById("evidence-msg");
  m.className = cls;
  m.textContent = text;
}

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = String(text);
  return e;
}

// CSV 한 칸 — 쉼표·큰따옴표·줄바꿈이 있으면 큰따옴표로 감싸고, 안의 큰따옴표는 두 번 쓴다.
function csvCell(v) {
  var s = v === undefined || v === null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// excluded_rows.csv 내용(design.md 2절) — 첫 줄 원본행번호,사유,+머리글, 이어서 제외 행마다 한 줄.
// 화면 표와 같은 tally.excluded에서 만든다. 엑셀 한글용 UTF-8 BOM을 앞에 붙인다.
function buildCsv(tally) {
  var lines = [["원본행번호", "사유"].concat(tally.header).map(csvCell).join(",")];
  tally.excluded.forEach(function (x) {
    var cells = [x.row, x.reason];
    tally.header.forEach(function (name, i) {
      cells.push(x.values && x.values[i] !== undefined ? x.values[i] : "");
    });
    lines.push(cells.map(csvCell).join(","));
  });
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

// 만든 CSV 텍스트를 excluded_rows.csv 파일로 내려받는다(외부 전송 없음).
function downloadCsv(text) {
  var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "excluded_rows.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

// 저장된 tally의 제외 행 목록을 표로 그린다(값은 textContent로만 넣는다).
// 표의 행은 tally.excluded 그대로 — 원본 순서, 다시 계산하지 않음.
function render(tally) {
  var box = document.getElementById("evidence");
  box.innerHTML = "";
  box.className = "";

  box.appendChild(el("p", "",
    "집계한 때 " + tally.savedAt + " · 전체 " + tally.totalRows + "행 중 제외 " + tally.excluded.length + "행"));

  if (tally.excluded.length === 0) {
    box.appendChild(el("p", "notice", "제외된 행이 없습니다."));
    return;
  }

  var btnP = el("p");
  var btn = el("button", "", "excluded_rows.csv 내려받기");
  btn.type = "button";
  btn.id = "btn-csv";
  btn.addEventListener("click", function () { downloadCsv(buildCsv(tally)); });
  btnP.appendChild(btn);
  box.appendChild(btnP);

  var table = el("table");
  var head = el("tr");
  head.appendChild(el("th", "", "원본 행 번호"));
  head.appendChild(el("th", "", "사유"));
  tally.header.forEach(function (name) { head.appendChild(el("th", "", name)); });
  table.appendChild(head);

  tally.excluded.forEach(function (x) {
    var tr = el("tr");
    tr.appendChild(el("td", "num", x.row));
    var reason = el("td", "", x.reason);
    reason.appendChild(el("span", "review", "담당 검토 후 확정"));
    tr.appendChild(reason);
    tally.header.forEach(function (name, i) {
      var v = x.values && x.values[i] !== undefined ? x.values[i] : "";
      tr.appendChild(el("td", "", v));
    });
    table.appendChild(tr);
  });
  box.appendChild(table);
}

// 페이지를 열 때 저장된 집계 결과를 읽는다. 집계 전(tally = null)이면 안내만 한다.
(function init() {
  var t = loadData().tally;
  if (!t || typeof t !== "object" || !Array.isArray(t.excluded) || !Array.isArray(t.header)) {
    showMsg("notice", "집계 페이지에서 먼저 붙여 넣으세요. 아직 저장된 집계 결과가 없습니다.");
    return;
  }
  render(t);
})();
