# Dr.포스팅 리팩토링 기록

마틴 파울러 『리팩터링 2판』 절차를 따라 동작을 보존하는 작은 단계로 진행합니다.
각 단계는 `npm test`가 통과해야 다음 단계로 넘어갑니다.

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 안전망: 특성 테스트, 회귀 데이터셋, CI, 치명 버그 가드 | 완료 |
| 2 | 단계 쪼개기: 파일·모듈 분리, `auditPolicy` parse → check → score → render | 완료 |
| 3 | 캡슐화·기능 이동: `CampaignSpec`, `Draft`, `Keyword`, `Sponsorship` | 완료 |
| 4 | 조건부 로직 → `Rule` 객체, 매직 리터럴 → 정책팩, 잘못된 규칙 수정 | 완료 |
| 5 | 질의/변경 분리, `Runnable` 노드, 포트·어댑터, LLM 연결 | 예정 |

## 1단계 결과

### 테스트 구성

- `tests/harness.mjs`: 최소 DOM 스텁으로 앱을 만들어 핸들러를 실행합니다. 의존성이 없습니다. (2단계에서 `vm` 방식 → `createApp` 주입 방식으로 변경)
- `tests/characterization.test.mjs`: 현재 동작을 고정합니다. 알려진 버그를 담은 기대값에는 `KNOWN BUG` 주석을 달았습니다. 이런 기대값은 4단계에서 의도적으로 바꿉니다.
- `tests/fixtures/regressions.json`: 아키텍처 리뷰에서 찾은 버그를 재현하는 입력입니다. 각 항목의 `phase`보다 이전 단계에서는 `todo`로 보고되고 CI를 실패시키지 않습니다.
- `tests/__snapshots__/`: 출력 스냅샷입니다. 의도한 변경이면 `npm run test:update`로 갱신합니다.

### 고친 버그 (동작 변경)

- 메인 키워드가 비어 있으면 `ensureKw`가 끝나지 않아 탭이 멈추던 문제 → 키워드가 없으면 문장을 덧붙이지 않습니다.
- `kwTarget`의 `max=12`가 강제되지 않아 큰 값에서 사실상 멈추던 문제 → 1..12로 제한합니다.

### 코드 악취 목록

| 악취 (3장) | 위치 | 처리 단계 | 상태 |
|---|---|---|---|
| Long Function | `auditPolicy` (입력 읽기·규칙·점수·문자열·토스트) | 2 | 해결 |
| Duplicated Code | 탭 전환 로직 (`index.html` 59행, 65행) | 2 | 해결 (`showTab`) |
| Mysterious Name | `$`, `c`, `v`, `esc` | 2 | 해결 |
| Global Data | `variants`, `selected` | 3 | 해결 (`ReelSession`) |
| Insider Trading | `auditFromBlog`가 다른 탭의 DOM을 직접 읽음 | 3 | 해결: 마지막 초안과 그 spec 사용 |
| Primitive Obsession | 키워드·협찬 유형이 문자열, `'내돈내산'` 비교 | 3, 4 | 해결 (`Keyword`, `Sponsorship`) |
| Data Clumps | 브랜드·키워드·협찬·목표 횟수가 탭마다 따로 존재 | 3 | 부분 해결: `CampaignSpec`으로 묶음. 탭마다 입력칸이 따로 있는 화면 구조는 그대로 |
| Repeated Switches | `auditPolicy`의 if 체인 | 4 | 해결: 규칙 객체 + 레지스트리 |
| Magic Literals | 감점 25/10/12/15, 기준 500자·9회 | 4 | 해결: 정책팩 |
| 질의와 변경 혼합 | `ensureKw` (검사하면서 본문 수정) | 5 | 남음 |

## 2단계 결과

동작은 바꾸지 않았습니다. 1단계 스냅샷 3개가 한 글자도 바뀌지 않고 통과합니다.

### 파일 구조

```
index.html            마크업만 (onclick 속성은 유지)
styles.css            인라인 <style>을 옮김
src/main.js           조립 지점: 브라우저 전역을 주입하고 핸들러를 window에 노출
src/ui/app.js         Presentation: 입력 읽기, 도메인 호출, 결과 쓰기, showTab, toast
src/domain/keyword.js escapeRegExp, countKeyword
src/domain/audit.js   checkAudit → scoreAudit → renderAuditReport (auditPosting이 묶음)
src/domain/blog.js    normalizeBlogInput → buildBlogDraft, ensureKeyword
src/domain/reels.js   parseShots, buildReelVariants, applyReelEdits, formatReelScript
src/domain/waitlist.js buildWaitlistRecord, formatWaitlistConfirmation
```

의존 방향은 `main → ui → domain` 한 방향입니다. `domain/`은 DOM과 브라우저 전역을 쓰지 않습니다.

### `auditPolicy` 단계 쪼개기

| 단계 | 위치 | 하는 일 |
|---|---|---|
| parse | `ui/app.js` `handlers.auditPolicy` | 화면에서 `{text, keyword, sponsorship}` 읽기 |
| check | `domain/audit.js` `checkAudit` | 규칙 테이블을 순서대로 적용해 `findings` 반환 |
| score | `domain/audit.js` `scoreAudit` | 100에서 감점 합계를 빼고 0으로 하한 |
| render | `domain/audit.js` `renderAuditReport` | 진단표 문자열 생성 |

알려진 버그는 규칙마다 `KNOWN BUG` 주석으로 표시했고, 4단계에서 고칩니다.

### 테스트

- `tests/domain.test.mjs`: 도메인 함수 단위 테스트입니다. DOM 없이 import만 합니다.
- 회귀 케이스는 Worker 스레드에서 실행하고 2초가 지나면 종료합니다. 무한 루프가 테스트 전체를 멈추지 않습니다. 가드를 빼면 `empty-keyword-hang`이 시간 초과로 실패하는 것을 확인했습니다.

### 배포

Pages에는 앱 파일(`index.html`, `404.html`, `styles.css`, `src/`, `.nojekyll`)만 올립니다. `tests/`, `docs/`, `package.json`은 더 이상 공개되지 않습니다.

### 로컬 실행

ES 모듈은 `file://`로 열면 브라우저가 막습니다. 로컬에서는 정적 서버로 엽니다.

```
python3 -m http.server 8000   # http://localhost:8000
```

## 3단계 결과

『리팩터링』 7장(캡슐화)과 8장(기능 이동)을 적용했습니다. 커밋을 두 개로 나눴습니다. 첫 커밋은 구조만 바꿔서 스냅샷이 그대로이고, 두 번째 커밋만 출력(조사)을 바꿉니다.

### 새 도메인 객체

| 객체 | 파일 | 대체한 것 |
|---|---|---|
| `CampaignSpec` | `domain/campaign.js` | 탭마다 흩어진 업체명·키워드·목표 횟수·협찬 유형. 입력 정리와 목표 횟수 제한도 여기서 |
| `Keyword` | `domain/keyword.js` | 키워드 문자열. 개수 세기와 조사 선택을 가짐 |
| `Sponsorship` | `domain/sponsorship.js` | 협찬 유형 문자열과 `!== '내돈내산'` 비교. 공시 필요 여부와 유형별 공시 문구를 가짐 |
| `Draft` | `domain/blog.js` | 초안 문자열 하나. 제목·본문·공시를 나눠 담고 `draftToText`로 합침 |
| `Finding` | `domain/audit.js` | 감점 메모. 어떤 규칙에서 나왔는지 `ruleId`를 가짐 |
| `ReelSession` | `domain/reels.js` | 앱 상태의 `variants`, `selected` |

검사 규칙은 `domain/rules.js`로 옮겼습니다(함수 옮기기).

### 의도한 동작 변경

- **조사:** 받침에 따라 을/를, 은/는, 으로/로를 고릅니다(`domain/korean.js`). 받침이 없거나 한글이 아닌 끝 글자는 예전처럼 를/는/로를 씁니다. 기본 초안에서 `곳를→곳을`, `곳로→곳으로`, `광장마사지은→광장마사지는` 여섯 곳이 바뀌었고 스냅샷을 갱신했습니다. 회귀 케이스 `fixed-object-particle`이 통과합니다.
- **`auditFromBlog`:** 화면의 초안 칸과 키워드 칸을 읽지 않고, 마지막으로 만든 초안과 그 `CampaignSpec`을 씁니다.
  - 초안을 만든 뒤 키워드 칸을 고쳐도, 재진단은 초안을 만들 때의 키워드로 합니다.
  - 진단 탭의 협찬 유형을 초안의 협찬 유형으로 맞춥니다. 초안은 체험단 공시를 달고 나오는데 진단은 "내돈내산"으로 채점하던 불일치가 없어집니다.
  - 초안이 없으면 안내 문구 자리 글을 진단하지 않고 "먼저 초안을 만드세요"를 표시합니다.
- **진단 탭 키워드 앞뒤 공백:** `Keyword`가 앞뒤 공백을 지웁니다. 초안 탭은 원래 지웠고, 이제 진단 탭도 같은 방식으로 셉니다.

### 남은 알려진 버그 (주석 `KNOWN BUG`)

- 초안 탭에 협찬 유형 입력이 없어서 초안 공시는 항상 기본값(체험단)입니다. `Draft`와 `Sponsorship`은 준비됐으니 화면 입력만 추가하면 됩니다.
- "본문 키워드" 개수가 제목까지 셉니다. `Draft`가 제목을 나눠 담으므로 4단계에서 고치기 쉬워졌습니다.
- 키워드 개수를 맞추려고 정해진 문장을 덧붙이는 동작은 5단계에서 검사(질의)와 수정(변경)으로 나눕니다.

## 4단계 결과

『리팩터링』 9장(데이터 조직화)과 10장(조건부 로직 간소화)을 적용하고, 1단계부터 `KNOWN BUG`로 표시해 둔 잘못된 규칙을 고쳤습니다. 회귀 데이터셋 5건이 모두 통과합니다(todo 0건).

### 구조

| 변경 | 파일 | 기법 |
|---|---|---|
| 규칙 하나 = 파일 하나. 공통 모양 `{id, check(context, policy, facts)}` | `domain/rules/*.js`, `domain/rules/index.js` | 조건부 로직을 다형성으로 |
| 감점, 기준값, 정규식을 버전이 붙은 한 곳으로 | `domain/policy-pack.js` | 매직 리터럴 바꾸기 |
| 내돈내산은 `NoSponsorship` 객체 | `domain/sponsorship.js` | 특이 케이스 추가 |
| 정책팩 검증, 규칙 ID 중복 검사 (모듈 로드 시 실패) | `validatePolicyPack`, `rules/index.js` | 어서션 추가 |
| 입력 종류 판별과 공지 조건 추출 | `domain/notice.js` | 단계 쪼개기 |

규칙을 추가하려면 `rules/`에 파일을 하나 만들고, `rules/index.js`에 한 줄, 정책팩 `penalties`에 감점 하나를 넣습니다. 감점을 빠뜨리면 페이지가 로드될 때 바로 오류가 납니다.

진단 결과 끝에 `정책팩 2026-10-04`처럼 어떤 정책으로 판정했는지 표시합니다.

### 고친 규칙 (동작 변경)

| 이전 | 이후 |
|---|---|
| 공지도 초안처럼 채점 (첫 화면 75점, 길이 감점) | 공지로 판별하면 점수 없이 조건 목록과 다음 단계를 보여줌. 조건은 공지 문장을 그대로 인용 |
| `협찬`, `체험단` 같은 단어만 있으면 공시로 인정. 자리표시자도 통과 | "받아/제공받" 같은 수령 표현이 있는 문장이나 `#광고` 해시태그만 공시로 인정. 자리표시자는 제외 |
| 공시 위치 무관 | 300자 뒤에 있으면 `disclosure-late` (−10) |
| 자리표시자 검사 없음 | `[... 삽입]`이 남아 있으면 `placeholder` (−10) |
| "AI" 글자만 있으면 감점 | 삭제. 초안의 AI 티는 스크립트로 판단할 수 없어 5단계 LLM 판정으로 넘김. 공지의 "AI 자제"는 조건으로 표시 |
| 키워드 9회 초과만 감점 | 초안 재진단 때는 목표 대비 부족/초과(허용 +2) 모두 검사. 직접 진단할 때는 예전처럼 9회 초과만 |
| "본문 키워드"가 제목까지 셈 | 첫 줄(제목)은 세지 않음. 초안 생성도 본문 기준으로 목표를 채움 |
| 초안 공시가 글 맨 끝 | 제목 바로 아래 |
| 초안 탭에 협찬 유형 입력 없음 (항상 체험단 공시) | `#blogSpon` 추가. 원고료·제품 제공은 각자 문구, 내돈내산은 공시와 협찬 자리표시자 없음 |

공지 판별은 지시형 문장(`삽입`, `필수`, `부탁`, `반복`, `자제` 등)이 2개 이상이고 전체 문장의 절반 이상일 때입니다. 결정적인 기준선이며, 5단계에서 같은 인터페이스 뒤에 LLM 분류기를 둘 수 있습니다.

### 남은 알려진 문제

- 키워드 목표를 채우려고 정해진 문장을 덧붙이는 동작 (`blog.js`) → 5단계에서 검사와 수정으로 분리
- 릴스 컷을 입력 순서로 고르는 문제 (`reels.js`) → 5단계 LLM 플래너
- 직접 진단할 때는 키워드 목표를 알 수 없음. 공지에서 추출한 목표를 진단 탭에 연결하는 것은 다음 작업 후보
