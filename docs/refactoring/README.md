# Dr.포스팅 리팩토링 기록

마틴 파울러 『리팩터링 2판』 절차를 따라 동작을 보존하는 작은 단계로 진행합니다.
각 단계는 `npm test`가 통과해야 다음 단계로 넘어갑니다.

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 안전망: 특성 테스트, 회귀 데이터셋, CI, 치명 버그 가드 | 완료 |
| 2 | 단계 쪼개기: 파일·모듈 분리, `auditPolicy` parse → check → score → render | 완료 |
| 3 | 캡슐화·기능 이동: `CampaignSpec`, `Draft`, `Keyword`, `Sponsorship` | 예정 |
| 4 | 조건부 로직 → `Rule` 객체, 매직 리터럴 → 정책팩, 잘못된 규칙 수정 | 예정 |
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
| Global Data | `variants`, `selected` | 3 | 부분 해결: 전역 → `createApp` 내부 상태 |
| Insider Trading | `auditFromBlog`가 다른 탭의 DOM을 직접 읽음 | 3 | 남음 |
| Primitive Obsession | 키워드·협찬 유형이 문자열, `'내돈내산'` 비교 | 3, 4 | 남음 |
| Data Clumps | 브랜드·키워드·협찬·목표 횟수가 탭마다 따로 존재 | 3 | 남음 |
| Repeated Switches | `auditPolicy`의 if 체인 | 4 | 부분 해결: if 체인 → 규칙 테이블 |
| Magic Literals | 감점 25/10/12/15, 기준 500자·9회 | 4 | 남음 (규칙 테이블에 모임) |
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
