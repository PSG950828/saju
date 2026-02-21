# 로컬 개발 실행

> 참고: 이 프로젝트(Next.js 14)는 Node **20 LTS**에서 가장 안정적으로 동작합니다.
> 현재 워크스페이스에 `.nvmrc`를 추가해 두었으니, nvm을 쓰는 경우 `nvm use`로 맞춰주세요.

## 한 번에 실행 (추천)

프로젝트 루트(`/Users/psg/saju`)에서:

- 프론트 + 백엔드를 동시에 실행
  - 프론트: http://127.0.0.1:3001
  - 백엔드: http://127.0.0.1:8000

```bash
npm run dev
```

종료:

```bash
npm run stop
```

## 각각 실행

프론트만:

```bash
npm run start:frontend
```

프론트(프로덕션 모드로 확인: build + start):

```bash
npm run start:frontend:prod
```

프론트가 실제로 열렸는지 빠른 확인:

```bash
npm run smoke:frontend
```

백엔드만:

```bash
npm run dev:backend
```

## VS Code Tasks로 실행

VS Code Command Palette에서 `Tasks: Run Task`를 실행한 뒤 아래 중 선택하세요.


## (추천) UI가 깨지지 않게 켜는 방법

로컬에서 화면이 "기본 HTML처럼" 보이거나 스타일이 깨져 보일 때는 대부분 **CSS 문제가 아니라 서버가 꼬인 상태(포트 점유/프로세스 충돌)** 입니다.

가장 안정적인 흐름:

1) 포트 정리(자동)

- `npm run dev:clean`

2) 프론트/백엔드를 분리 실행 (VS Code Tasks 또는 각 터미널)

- 프론트: `npm run start:frontend` (3001)
- 백엔드: `npm run start:backend` (8000)

### 'dev:clean'이 하는 일

- 3001(프론트), 8000(백엔드), 3000(가끔 next가 자동으로 잡는 포트)
  에서 LISTEN 중인 프로세스를 찾아 종료(SIGTERM → 필요 시 SIGKILL)합니다.

> 주의: 개발용 포트만 대상으로 하며, 해당 포트를 다른 용도로 쓰고 있다면 종료될 수 있습니다.
- `dev: start all`
- `dev: stop all`
- `dev: frontend (local 3001)`
- `dev: backend (local 8000)`

## 트러블슈팅

### 포트가 이미 사용 중(EADDRINUSE)

3001 또는 8000 포트를 다른 프로세스가 사용 중일 수 있어요.

```bash
lsof -n -iTCP:3001 -sTCP:LISTEN
lsof -n -iTCP:8000 -sTCP:LISTEN
```

PID가 확인되면 종료:

### 백엔드에서 `No module named 'app'`

이 프로젝트는 `PYTHONPATH`를 `backend`로 고정해서 실행하도록 구성되어 있어요.
위의 `npm run dev` 또는 `npm run dev:backend`를 사용하면 자동으로 처리됩니다.
