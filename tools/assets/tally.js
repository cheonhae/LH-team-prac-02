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
  // 집계·표시·저장은 다음 라운드에서 붙인다.
  showMsg("notice", "머리글 확인 완료 — 데이터 " + parsed.totalRows + "행을 읽었습니다(집계는 아직 준비 중).");
});
