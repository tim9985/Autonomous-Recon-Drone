# 프론트엔드 담당자용 백엔드 연동 안내

- 작성일: 2026-10-05
- 대상: 구현된 SIM 백엔드 v0.1.0
- 정확한 요청 필드·형식·경로: [OpenAPI](openapi.json)
- 프론트엔드 구현·배포는 별도 담당자 범위다.

## 연결 및 인증

기존 SSH 터널의 `https://localhost:18443`과 같은 origin에서 API를 호출한다. 현재 CORS는 열지 않았다. 별도 개발 서버에서는 API와 WSS를 해당 HTTPS origin으로 프록시하고 인증 쿠키·Origin 처리까지 확인해야 한다. `http://localhost`에서는 Secure 쿠키를 전송할 수 없다. 외부 휴대폰망 공개 연결은 아직 구성하지 않았다.

로그인에는 기존 관제 전용 개발 계정을 사용한다. 계정·비밀번호, 인증서 개인 키, 서비스 토큰은 코드나 브라우저 번들에 넣지 않는다. 기존 상태 페이지의 Basic 인증과 새 업무 API 세션은 별도이며 업무 API는 다음 JSON 로그인으로 시작한다.

```javascript
// HTTPS 게이트웨이와 같은 origin에서 호출하는 예시. UI 구현 코드는 아니다.
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST', credentials: 'same-origin',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({login_id, password})
});
if (!loginResponse.ok) throw new Error('로그인 실패');
const {csrf_token: csrfToken, permissions} = await loginResponse.json();

const dronesResponse = await fetch('/api/v1/drones', {credentials: 'same-origin'});
const drones = await dronesResponse.json();

async function post(path, body) {
  const response = await fetch(path, {
    method: 'POST', credentials: 'same-origin',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
    body: JSON.stringify(body)
  });
  if (!response.ok) throw await response.json();
  return response.json();
}
```

로그인 응답에 CSRF 토큰을 반환하고 세션은 `drone_session` HttpOnly/Secure/SameSite=Strict 쿠키로 설정한다. 브라우저에서 쿠키 값을 읽거나 토큰을 localStorage에 저장할 필요가 없다. 변경 요청에는 CSRF 헤더와 허용 Origin이 필요하며 로그아웃은 `POST /api/v1/auth/logout`이다. 만료/철회 시 401을 처리하고 재로그인한다.

브라우저가 백엔드의 서비스 인증을 직접 수행하지 않는다. 서버 HTTPS 게이트웨이가 자체 mTLS 인증서와 서비스 토큰으로 백엔드에 연결하고 사용자 세션을 전달한다. `Authorization`이나 인증서 식별 헤더를 브라우저에서 꾸며 보내도 서비스 신원으로 인정하지 않는다.

## 관제 API

| 목적 | 메서드·경로 |
|---|---|
| 내 세션·사용 권한 | `GET /api/v1/auth/me` |
| 업무 준비 상태 | `GET /api/v1/readiness` |
| 드론 목록·최근 상태 | `GET /api/v1/drones`, `GET /api/v1/drones/{did}` |
| 임무 생성·목록·단건 | `POST/GET /api/v1/missions`, `GET /api/v1/missions/{mid}` |
| 임무 초안·승인 | `POST /api/v1/missions/{mid}/revisions`, `/approve` |
| SIM 설정 참조 | `GET /api/v1/configs` |
| 수동 공간 데이터 | `GET/POST /api/v1/missions/{mid}/regions`, `/plans`, `/observation-cells` |
| 제어권 | `POST /api/v1/drones/{did}/control/acquire`, `/control/release` |
| SIM 명령 요청·상태 | `POST /api/v1/drones/{did}/commands`, `GET /api/v1/commands/{cid}` |
| 일관된 초기 조회 | `GET /api/v1/missions/{mid}/snapshot` |
| 누락 사건 재생 | `GET /api/v1/missions/{mid}/events?after_cursor=0&limit=50` |
| 후보·판정·재관측 | `GET /api/v1/missions/{mid}/candidates`, `POST /api/v1/candidates/{cid}/judgements`, `/reobservations` |
| 알림·확인 | `GET /api/v1/missions/{mid}/alerts`, `POST /api/v1/alerts/{aid}/acknowledge` |
| 분석 요청 | `POST /api/v1/analysis-runs` |
| 저장된 파일 조회 | `GET /api/v1/media-assets/{aid}/content` |

`/device/v1/*`와 `/internal/v1/*`는 Pi·AI 서비스 전용이며 관제 게이트웨이에 노출하지 않는다. 파일 업로드는 Pi 계약으로만 제공한다. 현재 재관측은 요청 저장이며 자동 비행 실행이 아니다.

## 임무·개정·재시도

`mission_id` 등의 새 UUID는 `crypto.randomUUID()`로 만든다. 같은 논리 요청을 재전송할 때 같은 ID와 같은 내용으로 보낸다. 내용이 달라지면 409 ID_CONFLICT를 처리한다. 무조건 새 ID로 재시도하면 중복 업무가 될 수 있다.

```javascript
const missionId = crypto.randomUUID();
await post('/api/v1/missions', {
  mission_id: missionId, drone_id: 'sim-pi-01', environment: 'SIM'
});
```

개정 요청은 `expected_draft_revision`과 `area_geom` GeoJSON, grid/config 참조를 포함한다. `/api/v1/configs`에서 SIM 설정 ID를 가져온다. 승인 요청은 해당 `expected_draft_revision`을 보낸다. 제어권은 `expected_control_revision`, 판정은 `expected_row_version`을 사용한다. 409 REVISION_CONFLICT 시 최신 상태를 조회해 사용자 의도를 다시 확인한다.

## WebSocket·재접속

로그인 후 snapshot의 `event_cursor`를 얻고 WSS에 한 번 구독 메시지를 보낸다.

```javascript
const snapshot = await fetch(`/api/v1/missions/${missionId}/snapshot`, {
  credentials: 'same-origin'
}).then(r => r.json());
const ws = new WebSocket(`wss://${location.host}/api/v1/ws`);
ws.onopen = () => ws.send(JSON.stringify({
  mission_id: missionId, after_cursor: snapshot.event_cursor
}));
ws.onmessage = ({data}) => {
  const message = JSON.parse(data);
  if (message.events) {
    // event_id로 중복 제거 → 적용 완료 후 next_cursor 보관.
    // 사건에 필요한 상태가 없으면 해당 조회 API를 다시 호출한다.
  }
};
```

응답은 `{events, next_cursor, has_more}` 또는 `{type: "heartbeat", cursor}`다. 서버는 매 주기 세션·대상 권한을 재확인한다. 재접속 시 마지막 적용 cursor로 REST replay 또는 WSS 구독을 시작한다. 1008 종료는 인증·권한·계약 문제로 취급한다. 이 WebSocket은 관제 사건 전달용이며 영상 스트림이 아니다.

## 데이터 해석과 오류

- `sequence`, `event_seq`, `control_epoch`, `control_revision`, `frame_seq`, `row_version`, cursor는 **십진수 문자열**이다. JS Number로 변환하면 정밀도가 손실될 수 있다.
- 시간은 timezone을 포함하는 ISO 8601을 사용한다. 좌표가 유효하지 않은 후보를 지도에 실제 위치로 그리지 않는다.
- 미검증 `belief: null`은 미계산 상태다. 탐지 신뢰도와 공간 belief를 같은 값으로 사용하지 않는다.
- 202는 SIM 명령 요청 접수다. ACCEPTED/EXECUTING/COMPLETED/FAILED/UNCONFIRMED는 조회·사건으로 확인한다.
- 401: 미로그인/만료, 403: Origin·CSRF·주체 범위 거부, 404: 없음/객체 접근 불허, 409: 상태·ID·개정 충돌, 413: 크기 초과, 422: 입력 계약 오류, 503: 미준비/DB 일시 불가.
- 오류 JSON은 `{error: {code, ...}}`다. 필드 오류는 `fields`로 제공하며 비밀번호·입력 원문은 반환하지 않는다.

현재 `model_loaded=false`, `flight_enabled=false`, `real_device_enabled=false`가 정상이다. `/start`와 `/resume`은 503 `MODEL_AND_REAL_FLIGHT_NOT_READY`를 반환한다. 실제 모델·Pi·안전 검증 완료 전에는 프론트에서 비행 가능 상태로 표시하지 않는다.
