// 공통 저장 함수 — docs/design.md 3절 그대로. 저장소(localStorage)는 이 파일의 함수로만 쓴다.
// 키는 team1_app 하나만 쓴다(design.md 2절). 이 파일에는 저장 함수만 둔다.
var STORAGE_KEY = "team1_app";

// team1_app 키의 JSON 전체를 객체로 돌려준다. 키가 없거나 깨졌으면 {"tally": null}.
function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tally: null };
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data) || !("tally" in data)) {
      return { tally: null };
    }
    return data;
  } catch (e) {
    return { tally: null };
  }
}

// JSON 전체를 team1_app 키에 통째로 저장한다(부분 저장 없음).
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 저장된 JSON 전체를 team1_backup.json 파일로 내려받는다.
function exportJson() {
  var text = JSON.stringify(loadData(), null, 2);
  var blob = new Blob([text], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "team1_backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

// 백업 파일(File)을 읽어 모양(최상위 tally = 객체 또는 null)을 확인한 뒤 saveData로 덮어쓴다.
// 성공하면 저장한 객체로, 모양이 틀리면 Error로 거절하고 저장하지 않는다.
function importJson(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      reject(new Error("백업 파일을 고르세요. 저장하지 않았습니다."));
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(String(reader.result).replace(/^﻿/, ""));
      } catch (e) {
        reject(new Error("JSON 형식이 아닌 파일입니다. 저장하지 않았습니다."));
        return;
      }
      var okTop = data && typeof data === "object" && !Array.isArray(data) && ("tally" in data);
      var okTally = okTop && (data.tally === null ||
        (typeof data.tally === "object" && !Array.isArray(data.tally)));
      if (!okTally) {
        reject(new Error("백업 파일 모양이 틀립니다(최상위 tally 칸이 없거나 형식이 다름). 저장하지 않았습니다."));
        return;
      }
      saveData(data);
      resolve(data);
    };
    reader.onerror = function () {
      reject(new Error("파일을 읽지 못했습니다. 저장하지 않았습니다."));
    };
    reader.readAsText(file, "utf-8");
  });
}

// team1_app 키를 지운다('비우기').
function clearData() {
  localStorage.removeItem(STORAGE_KEY);
}
