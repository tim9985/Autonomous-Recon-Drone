"""
vlm_color_sidecar.py — VLM 상의 색 확인 (worker 1.4 그림자 모드의 ③ · 11-13 · Qwen3-VL-4B-Instruct · 로컬)

  worker 가 VISION_VERIFY_DIR/<임무>/vlm_req.jsonl 에 내놓은 후보 크롭 + 찾는 색 → 12색 확률 (다음 글자 확률 · 생성 안 함)
  → 같은 폴더 vlm_ans.jsonl (crop · probs · top · query_p) · 관제로는 아무것도 보내지 않음 (그림자)
  worker 이미지에 transformers 를 넣지 않으려고 서버 밖 (state 환경) 에서 돎 — 비행 중 --watch · 또는 비행 뒤 한 번

  평가 (켜기 전 · 판정 기준 = _학습 큐 「11-13 V14」)  --eval P|V|D|U72   color_lab 평가셋 → 색 균형 1순위 · SigLIP 2 제로샷 (배포) 과 짝 비교
실행  /home/se/venvs/state/bin/python vlm_color_sidecar.py <verify 폴더> [--watch]
      /home/se/venvs/state/bin/python vlm_color_sidecar.py --eval P
"""
import argparse, json, pickle, time
from pathlib import Path

import numpy as np

BASE = Path(__file__).resolve().parent
COLORS = ("red", "orange", "yellow", "green", "blue", "navy", "purple", "pink", "white", "gray", "black", "brown")
Q = ("Look at the person in this aerial drone image. What is the main color of the clothing on their upper body (shirt, jacket or top)? "
     "Answer with exactly one word from: red, orange, yellow, green, blue, navy, purple, pink, white, gray, black, brown.")


class QwenColor:
    name = "Qwen3-VL-4B-Instruct"

    def __init__(self):
        import torch
        from transformers import AutoModelForImageTextToText, AutoProcessor
        mid = "Qwen/Qwen3-VL-4B-Instruct"; self.torch = torch
        self.proc = AutoProcessor.from_pretrained(mid)
        self.model = AutoModelForImageTextToText.from_pretrained(mid, dtype=torch.bfloat16, device_map="cuda").eval()
        tok = self.proc.tokenizer
        self.ids = [tok.encode(w, add_special_tokens=False)[0] for w in COLORS]
        assert len(set(self.ids)) == len(COLORS), dict(zip(COLORS, self.ids))       # 첫 글자 조각이 겹치면 확률을 못 나눔

    def probs(self, bgr):
        from PIL import Image
        h, w = bgr.shape[:2]; s = 448 / max(h, w)                              # 작은 크롭은 키움 (VLM 최소 해상도)
        img = Image.fromarray(bgr[:, :, ::-1]).resize((max(28, round(w * s)), max(28, round(h * s))), Image.BICUBIC)
        msgs = [{"role": "user", "content": [{"type": "image", "image": img}, {"type": "text", "text": Q}]}]
        inp = self.proc.apply_chat_template(msgs, tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors="pt").to("cuda")
        with self.torch.inference_mode():
            lg = self.model(**inp).logits[0, -1].float()
        return self.torch.softmax(lg[self.ids], 0).cpu().numpy()


def serve(root, watch):
    import cv2
    m = QwenColor(); root = Path(root)
    while True:
        n = 0
        for req in root.glob("*/vlm_req.jsonl"):
            ans = req.with_name("vlm_ans.jsonl"); done = {json.loads(l)["crop"] for l in open(ans)} if ans.exists() else set()
            for l in open(req):
                r = json.loads(l)
                if r["crop"] in done:
                    continue
                img = cv2.imread(str(req.parent / r["crop"]))
                if img is None:
                    continue
                t0 = time.perf_counter(); p = m.probs(img); ms = (time.perf_counter() - t0) * 1000
                qs = [r["query"]] if isinstance(r["query"], str) else list(r["query"] or [])
                out = {"crop": r["crop"], "candidate_id": r["candidate_id"], "t": r["t"], "probs": {c: round(float(v), 4) for c, v in zip(COLORS, p)},
                       "top": [COLORS[i] for i in np.argsort(-p)[:3]], "query_p": {q: round(float(p[COLORS.index(q)]), 4) for q in qs if q in COLORS},
                       "base_top": r.get("base_top"), "ms": round(ms, 1), "model": m.name}
                with open(ans, "a") as f:
                    f.write(json.dumps(out, ensure_ascii=False) + "\n")
                done.add(r["crop"]); n += 1
        print(time.strftime("%H:%M:%S"), "답", n, flush=True)
        if not watch:
            return
        time.sleep(2)


def evaluate(set_name):
    """color_lab 평가셋 (frame · box · primary) → VLM 1순위 · 색 균형 정확도 · SigLIP 배포판 (G2 잔디문장) 과 같은 항목 짝 비교"""
    import sys; sys.path.insert(0, str(BASE))
    import color_lab as L
    items = pickle.load(open(L.LAB / f"{set_name}.pkl", "rb")) if (L.LAB / f"{set_name}.pkl").exists() else L.get_items(set_name)
    cache = L.LAB / "preds" / f"VLM_qwen3vl4b_{set_name}.pkl"
    if cache.exists():
        P, ms = pickle.load(open(cache, "rb"))
    else:
        P, ms = _run(items); pickle.dump((P, ms), open(cache, "wb"))
    _report(set_name, items, np.array(P), ms, L)


def _run(items):
    m = QwenColor(); P, ms = [], []
    for it in items:
        x1, y1, x2, y2 = [int(v) for v in it["box"]]; pad = max(8, int(0.3 * max(x2 - x1, y2 - y1)))
        fr = it["frame"]; crop = fr[max(0, y1 - pad):y2 + pad, max(0, x1 - pad):x2 + pad]
        t0 = time.perf_counter(); P.append(m.probs(crop)); ms.append((time.perf_counter() - t0) * 1000)
    return P, ms


def _report(set_name, items, P, ms, L):
    y = np.array([COLORS.index(it["primary"]) for it in items])
    bal = lambda pred: float(np.mean([np.mean(pred[y == k] == k) for k in np.unique(y)]))
    res = {"set": set_name, "n": len(items), "VLM 색 균형 1순위": round(bal(P.argmax(1)), 3), "ms 중앙": round(float(np.median(ms)), 1)}
    ref = L.LAB / "preds" / f"G2_잔디문장_1.0_{set_name}.pkl"
    if ref.exists():
        S = np.array(pickle.load(open(ref, "rb"))[0]); res["SigLIP 배포 색 균형 1순위"] = round(bal(S.argmax(1)), 3)
        # 짝 부트스트랩 (사람 단위 블록이 없으면 항목 단위) — 색 균형 정확도 차
        rng = np.random.default_rng(0); grp = np.array([str(it.get("person", i)) for i, it in enumerate(items)]); ug = np.unique(grp)
        idx = {g: np.where(grp == g)[0] for g in ug}; d = []
        for _ in range(2000):
            s = np.concatenate([idx[g] for g in rng.choice(ug, len(ug))]); ys = y[s]
            f = lambda pred: np.mean([np.mean(pred[s][ys == k] == k) for k in np.unique(ys)])
            d.append(f(P.argmax(1)) - f(S.argmax(1)))
        res["VLM − SigLIP 95%"] = [round(float(np.percentile(d, 2.5)), 3), round(float(np.percentile(d, 97.5)), 3)]
        res["둘이 다를 때 VLM 맞음 · SigLIP 맞음"] = [int(((P.argmax(1) != S.argmax(1)) & (P.argmax(1) == y)).sum()), int(((P.argmax(1) != S.argmax(1)) & (S.argmax(1) == y)).sum())]
    if ref.exists() and all("h" in it and it["h"] for it in items[:5]):
        hs = np.array([it["h"] for it in items])
        res["키별 VLM · SigLIP"] = {int(h): [round(float(np.mean([np.mean(P.argmax(1)[(hs == h) & (y == k)] == k) for k in np.unique(y[hs == h])])), 3),
                                            round(float(np.mean([np.mean(S.argmax(1)[(hs == h) & (y == k)] == k) for k in np.unique(y[hs == h])])), 3)] for h in sorted(set(hs))}
    out = BASE / "metrics" / "vlm_color_eval.json"; allr = json.load(open(out)) if out.exists() else {}
    allr[set_name] = res; out.write_text(json.dumps(allr, ensure_ascii=False, indent=1)); print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("root", nargs="?"); ap.add_argument("--watch", action="store_true"); ap.add_argument("--eval")
    a = ap.parse_args()
    evaluate(a.eval) if a.eval else serve(a.root, a.watch)
