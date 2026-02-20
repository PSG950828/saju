# 로컬 개발 실행

## 한 번에 실행 (추천)

프로젝트 루트(`/Users/psg/saju`)에서:

- 프론트 + 백엔드를 동시에 실행
  - 프론트: http://localhost:3001
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
npm run dev:frontend
```

백엔드만:

```bash
npm run dev:backend
```

## VS Code Tasks로 실행

VS Code Command Palette에서 `Tasks: Run Task`를 실행한 뒤 아래 중 선택하세요.

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

```bash
kill <PID>
```

### 백엔드에서 `No module named 'app'`

이 프로젝트는 `PYTHONPATH`를 `backend`로 고정해서 실행하도록 구성되어 있어요.
위의 `npm run dev` 또는 `npm run dev:backend`를 사용하면 자동으로 처리됩니다.
