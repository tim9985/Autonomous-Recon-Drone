"""
verify.py — 임무별 2차 검증 · **그림자 모드** (worker 1.4 · 2026-11-13 · 사용자 결정 「그림자 모드」)

  관제로 가는 관측 · 후보 · 등급 · 색 일치는 **하나도 바꾸지 않는다** — 2차 판정을 따로 파일에 남기고, 비행 뒤 녹화와 정답으로 효과를 잰 다음
  기준을 넘는 것만 켠다 (판정 기준 = obsidian `_학습 큐` 「11-13 V14」 · 돌리기 전 기록)

  ① 자세 (모든 임무 · 등급 보조)  ViTPose-B (COCO · TensorRT FP32 · 후보 크롭) → 물리 특징 4 + 박스 2 → 로지스틱 P(누움)
     박스가 서기처럼 보일 때만 (h ≥ w · 긴 변 ≥ 45 px@1080) — 박스만으로 「시선 방향으로 누운 사람」 을 못 가르는 곳 (K3 · UE AUROC 0.611 → 0.789)
  ② 색 후보 확장 (찾는 색이 있는 임무)  P(정답 = 찾는 색 | 보인 색) 혼동 행렬 (UAV-Human 학습셋 · 배포 색 판정기) 로
     「빨강을 찾는데 분홍으로 보인 사람」 같은 후보를 놓치지 않게 점수를 다시 매김 (지금 규칙 SIMILAR 은 손으로 정한 이웃)
  ③ VLM 색 확인 요청 (찾는 색이 있는 임무)  후보 크롭 + 질의를 파일로 내놓음 → 서버 밖 `vlm_color_sidecar.py` (Qwen3-VL-4B) 가 답을 씀
     worker 이미지에 transformers 를 넣지 않으려고 따로 돎 (비행 중 실시간 · 또는 비행 뒤)
  좌표는 2차 판정 대상이 아님 — 실비행 기준점으로 잰다 (`real_flight_eval.py`)

  켜기     VISION_VERIFY=shadow   (기본 끔 · 그 밖의 값은 끔)
  꾸러미   VISION_VERIFY_PACK     (기본 $INGEST_MODEL_DIR/verify_v14 = /models/verify_v14 · `verify_model.json` 해시 선검사)
  출력     VISION_VERIFY_DIR      (기본 $INGEST_SCRATCH/verify = /scratch/verify) — <임무>/verify.jsonl · <임무>/vlm/<후보>_<시각>.jpg · vlm_req.jsonl · 엔진 캐시
  간격     VISION_VERIFY_EVERY_S  (후보마다 · 기본 1.0 초) · VISION_VERIFY_VLM_EVERY_S (기본 10 초)
  성능     분석 스레드를 막지 않음 — 큐 2장 · 꽉 차면 그 장은 버림 (stats verify_dropped) · 실패해도 분석은 그대로 (stats verify_error)
"""
import hashlib
import json
import os
import queue
import threading
import time
from pathlib import Path

import cv2
import numpy as np

from . import _rtmlib_vitpose as RV


def _sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


class _Trt:
    """ONNX → TensorRT FP32 엔진 (첫 실행에 한 번 · 캐시) · 배치 1"""

    def __init__(self, onnx, cache):
        import tensorrt as trt
        import torch
        self.torch, log = torch, trt.Logger(trt.Logger.ERROR)
        eng = Path(cache) / (Path(onnx).stem + f"_trt{trt.__version__}_fp32.engine")
        if not eng.exists():
            b = trt.Builder(log); net = b.create_network(0); p = trt.OnnxParser(net, log)
            if not p.parse_from_file(str(onnx)):
                raise RuntimeError(f"ONNX 읽기 실패 {[p.get_error(i) for i in range(p.num_errors)]}")
            c = b.create_builder_config(); c.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 2 << 30)
            inp = net.get_input(0); shp = [1 if d < 0 else d for d in inp.shape]
            prof = b.create_optimization_profile(); prof.set_shape(inp.name, shp, shp, shp); c.add_optimization_profile(prof)
            s = b.build_serialized_network(net, c)
            if s is None:
                raise RuntimeError("엔진 만들기 실패")
            eng.parent.mkdir(parents=True, exist_ok=True); tmp = eng.with_suffix(".tmp"); tmp.write_bytes(bytes(s)); tmp.replace(eng)
        self.e = trt.Runtime(log).deserialize_cuda_engine(eng.read_bytes()); self.ctx = self.e.create_execution_context()
        names = [self.e.get_tensor_name(i) for i in range(self.e.num_io_tensors)]
        self.inp = next(n for n in names if self.e.get_tensor_mode(n) == trt.TensorIOMode.INPUT)
        self.out = next(n for n in names if self.e.get_tensor_mode(n) == trt.TensorIOMode.OUTPUT)
        self.st = torch.cuda.Stream()

    def __call__(self, x):
        t = self.torch
        xi = t.from_numpy(np.ascontiguousarray(x, dtype=np.float32)).cuda()
        self.ctx.set_input_shape(self.inp, tuple(xi.shape)); self.ctx.set_tensor_address(self.inp, xi.data_ptr())
        o = t.empty(tuple(self.ctx.get_tensor_shape(self.out)), dtype=t.float32, device="cuda"); self.ctx.set_tensor_address(self.out, o.data_ptr())
        self.ctx.execute_async_v3(self.st.cuda_stream); self.st.synchronize()
        return o.cpu().numpy()


class KeypointPosture:
    """ViTPose-B 관절 → K3 물리 특징 → P(누움) · kp_k3.py · make_verify_pack.py 와 같은 정의"""

    def __init__(self, pack, cache):
        self.card = json.loads((Path(pack) / "posture_kp.json").read_text())
        km = self.card["keypoint_model"]
        self.size = (int(km["input"][3]), int(km["input"][2]))          # (w 192, h 256)
        self.mean, self.std, self.pad = np.array(km["mean"]), np.array(km["std"]), float(km["padding"])
        self.net = _Trt(Path(pack) / km["file"], cache)
        c = self.card
        self.im, self.mu, self.sd = np.array(c["impute_mean"]), np.array(c["scaler_mean"]), np.array(c["scaler_scale"])
        self.w, self.b = np.array(c["coef"]), float(c["intercept"])

    def keypoints(self, frame, box):
        center, scale = RV.bbox_xyxy2cs(np.array(box, np.float32), padding=self.pad)
        img, scale = RV.top_down_affine(self.size, scale, center, frame)
        x = ((img - self.mean) / self.std).transpose(2, 0, 1)[None]
        hm = self.net(x); N, K, H, W = hm.shape
        r = hm.reshape(N, K, -1); idx = np.argmax(r, 2)[..., None]; sc = np.max(r, 2)
        kp = np.tile(idx, (1, 1, 2)).astype(np.float32); kp[..., 0] %= W; kp[..., 1] //= W
        kp = RV.post_dark_udp(kp, hm, kernel=11)
        kp = kp / (np.array([W, H]) - 1) * scale + center - scale / 2
        return kp[0], sc[0]

    def __call__(self, frame, box):
        """→ (P(누움) 또는 None (범위 밖), 관절 찾음 여부)"""
        x1, y1, x2, y2 = box; H = frame.shape[0]; f = 1080.0 / H
        w, h = (x2 - x1) * f, (y2 - y1) * f; L = max(w, h)
        if h < w or L < 45:
            return None, None
        kp, sc = self.keypoints(frame, box)
        side = max(x2 - x1, y2 - y1)                                     # kp_k3.geom 의 side = 크롭 정사각 / 1.5 = 박스 긴 변 (같은 눈금)
        sm, hm, am = (kp[5] + kp[6]) / 2, (kp[11] + kp[12]) / 2, (kp[15] + kp[16]) / 2
        v, u = hm - sm, am - hm
        g = [abs(np.arctan2(v[0], v[1])), np.linalg.norm(v) / side, abs(np.arctan2(u[0], u[1])), np.linalg.norm(u) / side]
        found = bool(np.isfinite(g).all())
        z = np.r_[np.log(h / w), np.log(L), g]
        z = np.where(np.isfinite(z), z, self.im)
        s = float(((z - self.mu) / self.sd) @ self.w + self.b)
        return 1.0 / (1.0 + np.exp(-s)), found


class ColorExpand:
    """P(정답 = 찾는 색 | 보인 색) 로 다시 매긴 일치 점수 — 후보의 누적 색 확률 (probs) 에 곱해 더함"""

    def __init__(self, pack):
        self.card = json.loads((Path(pack) / "color_sim.json").read_text()); self.S = self.card["sim"]

    def __call__(self, probs, query):
        qs = [query] if isinstance(query, str) else list(query or [])
        sc = {q: sum(self.S.get(q, {}).get(c, 0.0) * p for c, p in (probs or {}).items()) for q in qs}
        return {"query": qs, "score": {q: round(v, 4) for q, v in sc.items()}, "best": round(max(sc.values()), 4) if sc else 0.0}


class ShadowVerifier:
    def __init__(self, stats):
        self.on = os.environ.get("VISION_VERIFY", "").lower() == "shadow"
        self.stats = stats
        if not self.on:
            return
        mdir = os.environ.get("INGEST_MODEL_DIR", "/models")
        self.pack = Path(os.environ.get("VISION_VERIFY_PACK", f"{mdir}/verify_v14"))
        self.out = Path(os.environ.get("VISION_VERIFY_DIR", f"{os.environ.get('INGEST_SCRATCH', '/scratch')}/verify"))
        self.every = float(os.environ.get("VISION_VERIFY_EVERY_S", "1.0")); self.vlm_every = float(os.environ.get("VISION_VERIFY_VLM_EVERY_S", "10"))
        self.q, self.last, self.vlast, self.ms = queue.Queue(maxsize=2), {}, {}, []
        self.kp = self.cx = None
        stats.update(verify="shadow", verify_ready=False, verify_n=0, verify_dropped=0)
        threading.Thread(target=self._run, daemon=True, name="verify").start()

    # ── 분석 스레드에서 부름 (막지 않음) ──
    def submit(self, mid, img, t, query, items):
        """items = [(candidate_id, (x1, y1, x2, y2), 색 누적 결과 dict, state dict 또는 None, 관측 appearance.match 또는 None)]"""
        if not self.on or not items:
            return
        try:
            self.q.put_nowait((mid, img, t, query, items))
        except queue.Full:
            self.stats["verify_dropped"] += 1

    # ── 검증 스레드 ──
    def _load(self):
        man = json.loads((self.pack / "verify_model.json").read_text())
        for f, h in man["sha256"].items():
            if f.endswith(".json") and _sha(self.pack / f) != h:
                raise ValueError(f"verify 꾸러미 해시 다름 {f}")
        self.out.mkdir(parents=True, exist_ok=True)
        self.cx = ColorExpand(self.pack)
        self.kp = KeypointPosture(self.pack, self.out / "_engine")
        self.stats.update(verify_ready=True, verify_pack=man["name"])

    def _run(self):
        try:
            self._load()
        except Exception as e:
            self.stats["verify_error"] = f"load {type(e).__name__}: {e}"[:200]; return
        while True:
            mid, img, t, query, items = self.q.get()
            try:
                self._one(mid, img, t, query, items)
            except Exception as e:
                self.stats["verify_error"] = f"{type(e).__name__}: {e}"[:200]

    def _one(self, mid, img, t, query, items):
        root = self.out / str(mid); root.mkdir(parents=True, exist_ok=True)
        lines = []
        for cid, box, col, st, match in items:
            if t - self.last.get((mid, cid), -1e9) < self.every:
                continue
            self.last[(mid, cid)] = t; t0 = time.perf_counter()
            p_kp, found = self.kp(img, box)
            rec = {"t": t, "candidate_id": cid, "bbox": [round(v, 1) for v in box],
                   "posture": {"p_lying_kp": None if p_kp is None else round(p_kp, 4), "kp_found": found,
                               "base": (st or {}).get("posture"), "base_grade": (st or {}).get("grade")}}
            if query:
                rec["color"] = {"expand": self.cx(col.get("probs"), query), "base_match": match, "top": col.get("top", [])[:3], "n_obs": col.get("n_obs", 0)}
                if t - self.vlast.get((mid, cid), -1e9) >= self.vlm_every:
                    self.vlast[(mid, cid)] = t; x1, y1, x2, y2 = box; pad = max(8, int(0.3 * max(x2 - x1, y2 - y1)))
                    crop = img[max(0, int(y1) - pad):int(y2) + pad, max(0, int(x1) - pad):int(x2) + pad]
                    if crop.size:
                        (root / "vlm").mkdir(exist_ok=True); name = f"{cid[:8]}_{t:.1f}.jpg"
                        cv2.imwrite(str(root / "vlm" / name), crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
                        with open(root / "vlm_req.jsonl", "a") as f:
                            f.write(json.dumps({"t": t, "candidate_id": cid, "crop": f"vlm/{name}", "query": query, "base_top": col.get("top", [])[:3]}, ensure_ascii=False) + "\n")
                        rec["color"]["vlm_req"] = f"vlm/{name}"
            ms = (time.perf_counter() - t0) * 1000; rec["ms"] = round(ms, 1); self.ms = (self.ms + [ms])[-200:]
            lines.append(json.dumps(rec, ensure_ascii=False, separators=(",", ":")))
        if lines:
            with open(root / "verify.jsonl", "a") as f:
                f.write("\n".join(lines) + "\n")
            self.stats["verify_n"] += len(lines); self.stats["verify_ms_p50"] = round(float(np.median(self.ms)), 1)
