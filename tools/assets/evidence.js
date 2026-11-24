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
