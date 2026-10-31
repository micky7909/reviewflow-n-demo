# 교동마을 카카오톡 봇

공식 카카오 Bot API의 DISPATCH 웹훅과 비동기 메시지 콜백을 사용합니다.

- `POST /webhook`: 인증 후 1초 내 204 응답, `MESSAGE_CREATE`의 콜백 토큰으로 답변 전송
- `GET /healthz`: 프로세스 상태
- `GET /readyz`: 필수 설정과 지식파일 준비 여부 (실제 주문 조회·환불 실행 기능은 포함하지 않음)
- `npm start`, `npm test`

필수 비밀 설정: `OPENAI_API_KEY`, `BOT_TOKEN`, `WEBHOOK_AUTH`.
`BOT_TOKEN`은 카카오 봇 인증 토큰입니다. `WEBHOOK_AUTH`는 카카오 웹훅에 등록한 Authorization 헤더 값 전체와 일치해야 합니다.

기본 모델은 `gpt-5.4-mini`이며 `OPENAI_MODEL`로 변경할 수 있습니다. 지식은 28개 출처의 텍스트와 핵심 요약이며, 기본 지침·요약과 질문에 맞춘 텍스트 검색 결과를 함께 사용합니다. 임베딩 검색이나 모델 재학습을 수행한 것은 아닙니다.

대화 상태는 인스턴스 메모리에 24시간 이내로 유지되며 재시작 시 초기화됩니다. 실제 고객 주문·승인·환불·구독 조회 도구는 없습니다. API 키나 메시지 원문, 콜백 토큰은 로그에 쓰지 않습니다. 전체 공식 대회 문서·공개 테스트 본문은 아직 확인하지 못했습니다.

확인한 공식 문서:
- https://developers.kakao.com/docs/ko/bot/webhook
- https://developers.kakao.com/docs/ko/bot/rest-api
- https://developers.openai.com/api/docs/guides/text

카카오 문서는 로그인한 브라우저에서 본문을 확인했습니다. 기존 `/docs/in/bot/prerequisite` 링크는 오류가 발생했습니다.
