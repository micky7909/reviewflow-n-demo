# Dr.포스팅 리팩토링 기록

마틴 파울러 『리팩터링 2판』 절차를 따라 동작을 보존하는 작은 단계로 진행합니다.
각 단계는 `npm test`가 통과해야 다음 단계로 넘어갑니다.

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 안전망: 특성 테스트, 회귀 데이터셋, CI, 치명 버그 가드 | 완료 |
| 2 | 단계 쪼개기: 파일·모듈 분리, `auditPolicy` parse → check → score → render | 예정 |
| 3 | 캡슐화·기능 이동: `CampaignSpec`, `Draft`, `Keyword`, `Sponsorship` | 예정 |
| 4 | 조건부 로직 → `Rule` 객체, 매직 리터럴 → 정책팩, 잘못된 규칙 수정 | 예정 |
| 5 | 질의/변경 분리, `Runnable` 노드, 포트·어댑터, LLM 연결 | 예정 |

## 1단계 결과

### 테스트 구성

- `tests/harness.mjs`: `index.html`의 인라인 스크립트를 Node `vm`에서 최소 DOM 스텁과 함께 실행합니다. 의존성이 없습니다.
- `tests/characterization.test.mjs`: 현재 동작을 고정합니다. 알려진 버그를 담은 기대값에는 `KNOWN BUG` 주석을 달았습니다. 이런 기대값은 4단계에서 의도적으로 바꿉니다.
- `tests/fixtures/regressions.json`: 아키텍처 리뷰에서 찾은 버그를 재현하는 입력입니다. 각 항목의 `phase`보다 이전 단계에서는 `todo`로 보고되고 CI를 실패시키지 않습니다.
- `tests/__snapshots__/`: 출력 스냅샷입니다. 의도한 변경이면 `npm run test:update`로 갱신합니다.

### 고친 버그 (동작 변경)

- 메인 키워드가 비어 있으면 `ensureKw`가 끝나지 않아 탭이 멈추던 문제 → 키워드가 없으면 문장을 덧붙이지 않습니다.
- `kwTarget`의 `max=12`가 강제되지 않아 큰 값에서 사실상 멈추던 문제 → 1..12로 제한합니다.

### 코드 악취 목록 (2단계 이후 처리)

| 악취 (3장) | 위치 | 처리 단계 |
|---|---|---|
| Long Function | `auditPolicy` (입력 읽기·규칙·점수·문자열·토스트) | 2 |
| Duplicated Code | 탭 전환 로직 (`index.html` 59행, 65행) | 2 |
| Mysterious Name | `$`, `c`, `v`, `esc` | 2 |
| Global Data | `variants`, `selected` | 3 |
| Insider Trading | `auditFromBlog`가 다른 탭의 DOM을 직접 읽음 | 3 |
| Primitive Obsession | 키워드·협찬 유형이 문자열, `'내돈내산'` 비교 | 3, 4 |
| Data Clumps | 브랜드·키워드·협찬·목표 횟수가 탭마다 따로 존재 | 3 |
| Repeated Switches | `auditPolicy`의 if 체인 | 4 |
| Magic Literals | 감점 25/10/12/15, 기준 500자·9회 | 4 |
| 질의와 변경 혼합 | `ensureKw` (검사하면서 본문 수정) | 5 |
