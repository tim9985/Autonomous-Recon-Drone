"""Independently supervised worker bootstrap; no model or flight logic is assumed."""
import json
import os
import time
from pathlib import Path
import torch

state = Path(os.environ.get("STORAGE_ROOT", "/data")) / "worker-status.json"
while True:
    status = {"worker": "vision", "updated_unix": time.time(),
              "cuda_available": torch.cuda.is_available(),
              "model_loaded": False, "flight_enabled": False,
              "state": "waiting_for_validated_model_and_video_pipeline"}
    temp = state.with_suffix(".tmp")
    temp.write_text(json.dumps(status), encoding="utf-8")
    temp.replace(state)
    time.sleep(5)
