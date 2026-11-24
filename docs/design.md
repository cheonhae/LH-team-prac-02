# 설계 메모 — 1조 주간 민원대장 집계 검증 웹앱

> 팀 PRD ② 블록에서 작성(드라이버 세션, team_plan과 함께) · 목적은 둘 — **두 사람이 같은 파일을 동시에 고치지 않게** 경계를 정하고, **페이지끼리 주고받는 데이터 약속**을 먼저 고정하는 것. 길게 쓰지 않습니다.
> PRD(`prd/team_prd.md`)에 없는 것은 **[가정]**으로 적고 `docs/team_decisions.md`에도 남겼습니다.

## 1. 페이지 지도와 파일 경계

| 역할 | 페이지·하는 일 | 담당 파일 (이 사람만 고친다) | 읽기만 하는 파일 |
|---|---|---|---|
| ① 통합·화면 | 시작 페이지 — 메뉴, 저장된 데이터 요약(전체·제외·합계·판정), 백업 내보내기·가져오기, 비우기 | `tools/index.html`, `tools/assets/common.js`, `tools/assets/style.css`, `README.md`, `docs/demo_script.md` | ②·③의 파일 |
| ② 기능 A | 집계 페이지 — 민원대장 CSV 붙여 넣기 → 중복·빈칸 행 제외 → 유형별·처리상태별 건수표 + 합계 일치 판정 | `tools/pages/tally.html`, `tools/assets/tally.js` | `common.js`, `style.css`, `data/` |
| ③ 기능 B | 근거 페이지 — 제외 행(원본 행 번호·사유·원본 값) 표 + `excluded_rows.csv` 내려받기 | `tools/pages/evidence.html`, `tools/assets/evidence.js` | `common.js`, `style.css`, `data/` |
| ④ 검증·데이터 | — (표본 CSV·수용 기준·파일 검사) | `data/team_sample.*`, `tests/acceptance.md`, `tests/run_acceptance.py` | ①②③의 파일 |

- 페이지 이름은 [가정] `tally`(집계)·`evidence`(근거) — PRD 3.1의 가정 그대로.
- 겹치지 않게: `common.js`·`style.css`는 ①만 고친다. ②·③이 화면에 필요한 모양이 있으면 자기 페이지 안의 `<style>` 대신 ①에게 요청하거나, 클래스 이름만 정해 ①이 `style.css`에 넣는다. 페이지에 필요한 다른 함수는 자기 페이지 js에 둔다.
- `docs/design.md`·`docs/team_plan.md`·`docs/team_decisions.md`·`CLAUDE.md`는 공통 문서(커밋 머리 `[팀]`)다. 모양을 바꾸려면 먼저 이 문서를 고치는 PR을 낸다.

`CLAUDE.md` '파일 분담' 표도 이 표와 같게 맞췄습니다.

## 2. 데이터 약속

- localStorage 키: `team1_app` (이 키 하나만 씁니다 — 같은 PC 브라우저의 다른 웹앱과 섞이지 않게)
- 저장하는 JSON 모양: 최상위는 `tally` 한 칸. 아직 집계 전이면 `{"tally": null}`이다. **쓰는 곳은 ② 집계 페이지 하나**이고(집계를 다시 하면 통째로 덮어씀), ③·①은 읽기만 한다. 시작 페이지의 '가져오기'(`importJson`)와 '비우기'만 예외로 저장소를 바꾼다.

| 칸 이름 | 뜻 | 형식 | 쓰는 페이지 | 읽는 페이지 |
|---|---|---|---|---|
| `tally` | 마지막 집계 결과 묶음. 집계 전이면 `null` | 객체 또는 `null` | ② 집계 | ③ 근거, ① 시작 |
| `tally.savedAt` | 집계한 때 | 문자열, ISO 날짜시각 `"2026-11-24T09:00:00"` | ② | ① (요약에 표시) |
| `tally.header` | 붙여 넣은 CSV의 머리글(열 이름) | 문자열 배열 | ② | ③ (`excluded_rows.csv` 머리글) |
| `tally.totalRows` | 전체 행 = 머리글 줄을 뺀 데이터 행 수(완전히 빈 줄은 세지 않음) | 정수 | ② | ① |
| `tally.excluded` | 제외한 행 목록(원본 순서) | 배열, 한 건 = `{row, reason, values}` | ② | ③, ① (개수) |
| `tally.excluded[].row` | 원본 행 번호 = 붙여 넣은 텍스트의 줄 번호(머리글 = 1) | 정수 | ② | ③ |
| `tally.excluded[].reason` | 제외 사유 | `"중복"` 또는 `"빈칸"` | ② | ③ |
| `tally.excluded[].values` | 원본 값(열 순서는 `header`와 같음) | 문자열 배열 | ② | ③ |
| `tally.byType` | 남은 행의 유형별 건수 | 객체 `{유형: 건수}` | ② | ② (표시) |
| `tally.byStatus` | 남은 행의 처리상태별 건수 | 객체 `{처리상태: 건수}` | ② | ② (표시) |
| `tally.check` | 합계 일치 판정 근거 | `{expected, typeSum, statusSum, match}` | ② | ① (요약) |
| `tally.check.expected` | 전체 행 − 제외 행 | 정수 | ② | ① |
| `tally.check.typeSum` | 유형별 건수의 합 | 정수 | ② | ① |
| `tally.check.statusSum` | 처리상태별 건수의 합 | 정수 | ② | ① |
| `tally.check.match` | 세 값이 모두 같으면 `true`("일치"), 아니면 `false`("불일치") | 참/거짓 | ② | ① |

  - 제외 행 수는 따로 저장하지 않고 `tally.excluded.length`로 읽는다(저장값이 둘이 되어 어긋나는 일을 막음). 시작 페이지 요약의 '합계'는 `check.expected`(= 전체 − 제외)를, 판정은 `check.match`를 쓴다.
  - 근거 페이지와 시작 페이지는 CSV를 다시 계산하지 않는다. `tally`가 `null`이면 "집계 페이지에서 먼저 붙여 넣으세요"라고 안내한다.
  - [가정] 빈 값은 빈 문자열 `""`로 저장한다. 판정·사유 옆의 "담당 검토 후 확정" 문구는 화면에만 쓰고 저장하지 않는다.

- 예시 1건 (전체 6행 중 2행 제외, 남은 4행):

```json
{"tally":{"savedAt":"2026-11-24T09:00:00","header":["접수번호","접수일","유형","처리상태","내용요약"],"totalRows":6,"excluded":[{"row":5,"reason":"중복","values":["C-002","2026-11-03","소음","처리중","야간 소음 문의"]},{"row":7,"reason":"빈칸","values":["C-005","2026-11-05","","접수","가로등 문의"]}],"byType":{"도로":2,"소음":2},"byStatus":{"접수":1,"처리중":1,"완료":2},"check":{"expected":4,"typeSum":4,"statusSum":4,"match":true}}}
```

  (줄 번호는 머리글이 1이므로 데이터 6행은 2~7줄이다. 5줄은 3줄과 같아서 중복, 7줄은 유형이 비어서 빈칸. 숫자는 형식 설명용이고 실제 기대값은 ④ 표본으로 정한다.)

- 집계 규칙 ([가정] — PRD 3.2 그대로, 이유는 `docs/team_decisions.md`):
  - 빈칸 = 접수번호·유형·처리상태 중 하나라도 비어 있음. 중복 = 모든 열 값이 앞에 나온 행과 같음(처음 나온 행은 남김). 둘 다이면 사유는 `"빈칸"` 하나.
  - 입력 형식 = 쉼표(,)로 나눈 CSV 텍스트. 각 칸의 앞뒤 공백은 지운다. 완전히 빈 줄은 무시한다. 큰따옴표 안의 쉼표는 지원하지 않는다(표본에 쓰지 않음).
  - 머리글에 접수번호·유형·처리상태 열이 없거나 붙여 넣은 칸이 비어 있으면 안내만 하고 저장하지 않는다. 데이터 행의 칸 수가 머리글보다 적으면 모자란 칸을 빈 값으로 본다(→ 빈칸).
- `excluded_rows.csv` ([가정]): 첫 줄 `원본행번호,사유,` + `tally.header`의 열 이름, 이어서 `excluded`의 행마다 한 줄. UTF-8 BOM을 붙여 엑셀에서 한글이 깨지지 않게 한다.
- 표본 파일: `data/team_sample.csv` (가상, UTF-8) — 열은 [가정] `접수번호, 접수일, 유형, 처리상태, 내용요약`. 집계 페이지 텍스트 칸에 내용을 복사해 붙여 넣는다.
- 일부러 넣은 함정: 행 수와 위치·종류(중복·빈칸·빈칸이면서 중복)는 ④만 미리 앎, 수용 기준표 2절에 반영. 이 문서에는 적지 않는다.

## 3. 공통 함수 (`tools/assets/common.js`, ①이 뼈대 PR에서 고정)

| 함수 | 넣는 것 | 돌려주는 것 · 하는 일 |
|---|---|---|
| `loadData()` | — | `team1_app` 키의 JSON 전체를 객체로. 키가 없거나 깨졌으면 빈 모양 `{"tally": null}` |
| `saveData(data)` | JSON 전체(객체) | `team1_app` 키에 통째로 저장(부분 저장 없음). 돌려주는 값 없음 |
| `exportJson()` | — | 저장된 JSON 전체를 백업 파일(`team1_backup.json`)로 내려받는다. 돌려주는 값 없음 |
| `importJson(file)` | 백업 파일(`File`) | 파일을 읽고 모양(최상위 `tally`)을 확인한 뒤 `saveData`로 덮어쓴다. 결과는 `Promise` — 성공하면 저장한 객체, 모양이 틀리면 오류 메시지(`Error`)로 거절하고 저장하지 않는다 |
| `clearData()` | — | `team1_app` 키를 지운다('비우기'). 돌려주는 값 없음 |

모든 페이지는 이 함수로만 저장소를 씁니다(`localStorage` 직접 사용 금지 — F4 검사). 그 밖의 함수(CSV 나누기·집계·표 그리기·CSV 내려받기 등)는 각 페이지 js에 둡니다.

## 4. 여는 방법

- 배포: GitHub Pages `https://cheonhae.github.io/LH-team-prac-02/tools/index.html` (조직 = 레포 소유자 `cheonhae`, 레포 이름 `LH-team-prac-02`)
- 병합 전 확인: 브랜치 **Code → Download ZIP** → 압축을 풀고 `tools/index.html` 더블클릭
- 파일 검사: `python tests/run_acceptance.py`
