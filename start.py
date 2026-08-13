import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

import uvicorn

port = int(os.getenv("PORT", 8000))
uvicorn.run("main:app", host="0.0.0.0", port=port)