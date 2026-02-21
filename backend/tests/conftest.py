import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent

# 테스트는 "backend.app.*" 형태로 import 하므로, 프로젝트 루트(= backend/의 상위)를
# sys.path에 올려야 `import backend`가 정상 동작합니다.
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
