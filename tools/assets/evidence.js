// 근거 페이지 전용 — 제외 행 표 그리기·excluded_rows.csv 만들기 함수는 이 파일에 둔다.
// 저장소는 common.js의 loadData로 읽기만 한다(docs/design.md 2·3절). CSV를 다시 계산하지 않는다.

function showMsg(cls, text) {
  var m = document.getElementById("evidence-msg");
  m.className = cls;
  m.textContent = text;
}

// 페이지를 열 때 저장된 집계 결과를 읽는다. 집계 전(tally = null)이면 안내만 한다.
(function init() {
  var t = loadData().tally;
  if (!t || typeof t !== "object" || !Array.isArray(t.excluded) || !Array.isArray(t.header)) {
    showMsg("notice", "집계 페이지에서 먼저 붙여 넣으세요. 아직 저장된 집계 결과가 없습니다.");
    return;
  }
})();
