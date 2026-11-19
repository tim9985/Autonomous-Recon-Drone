"""
tests_verify.py — worker 1.4 2차 검증 (그림자 모드) 시험 (11-13)

  ① 관절점 같음   worker 의 KeypointPosture 관절 ↔ 연구 kp_models vitpose_b (K3 와 같은 크롭 30장) · 특징 4개 차 · P(누움)
  ② 그림자 불변   tests_v1_2 (UE S1_a16 · 백엔드 계약) 를 배포 판 + 1.3 + 1.4 패치로 → 관제로 가는 수치가 1.3 기록과 **같아야** 함
                  verify.jsonl 줄 수 · 관절 P(누움) 채워짐 · 색 확장 점수 · VLM 요청 크롭 · verify_dropped · ms
실행  /home/se/miniconda3/envs/drone/bin/python tests_verify.py [real|dev]   (GPU · 학습 없을 때)
"""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
SANDBOX = {"dev": Path("/home/se/sandboxes/drone-dev"), "real": Path("/home/se/sandboxes/drone-real")}
PACK = REPO / "drone_yolo" / "runs_person" / "_pack_v12w_real"


def overlay(env):
    tmp = Path(tempfile.mkdtemp(prefix=f"v14_{env}_"))
    shutil.copytree(SANDBOX[env] / "app" / "vision_core", tmp / "app" / "vision_core", ignore=shutil.ignore_patterns("*.bak-*", "__pycache__"))
    for f in (HERE / "app" / "vision_core").glob("*.py"):
        shutil.copy2(f, tmp / "app" / "vision_core" / f.name)
    subprocess.run(["patch", "-p1", "-d", str(tmp), "-i", str(HERE / f"ingest_{env}.patch")], check=True, capture_output=True)
    return tmp


def unit(env):
    tmp = overlay(env); sys.path.insert(0, str(tmp)); sys.path.insert(0, str(REPO / "drone_yolo"))
    import cv2
    from app.vision_core.verify import KeypointPosture
    import kp_k3 as K, kp_models as KM
    kp = KeypointPosture(PACK / "verify_v14", Path(tempfile.mkdtemp()))
    ref = KM.REGISTRY["vitpose_b"]()
    ue = K.crops(K.UE, K.UE / "crops.csv", "crops")[::150][:30]
    d, P, Pr = [], [], []
    for r in ue:
        img = cv2.imread(r["path"]); box, side, c = K.crop_box(img, r)
        a, _ = kp.keypoints(img, box); b = ref(img, box)[0]
        d.append(np.abs(np.array(K.geom(a, side)) - np.array(K.geom(b, side))).max())
        P.append(kp(img, box)[0]); kp.keypoints = (lambda b_: (lambda f, bx: (b_, None)))(b); Pr.append(kp(img, box)[0]); del kp.keypoints
    dp = max(abs(a - b) for a, b in zip(P, Pr) if a is not None)
    res = {"크롭": len(ue), "특징 최대 차": round(float(np.max(d)), 5), "P(누움) 최대 차 (연구 관절 대비)": round(float(dp), 4), "P(누움) 범위": [round(float(np.nanmin([p for p in P if p is not None])), 3), round(float(np.nanmax([p for p in P if p is not None])), 3)]}
    print(json.dumps(res, ensure_ascii=False)); assert res["P(누움) 최대 차 (연구 관절 대비)"] < 0.03   # TensorRT 엔진 빌드마다 FP32 전술 차 (특징 ~0.01)


def e2e(env):
    tmp = overlay(env)
    sys.path.insert(0, str(REPO / "drone_yolo" / "deploy" / "vision_worker" / "integration_v1_2"))
    import tests_v1_2 as T
    T.HERE = tmp
    mpath = REPO / "drone_yolo" / "metrics" / "integration_v1_2_S1_a16.json"
    keep = mpath.read_bytes() if mpath.exists() else None
    sys.argv = ["tests_v1_2.py", "--engine", "--backend", "/home/se/sandboxes/drone-real"]
    os.environ["VISION_COLOR"] = "siglip"; os.environ["VISION_COLOR_PACK"] = str(PACK / "color_siglip2")
    out_dir = Path(tempfile.mkdtemp(prefix=f"verify_{env}_"))
    os.environ.update(VISION_VERIFY="shadow", VISION_VERIFY_PACK=str(PACK / "verify_v14"), VISION_VERIFY_DIR=str(out_dir), VISION_VERIFY_VLM_EVERY_S="5")
    try:
        T.main(); out = json.load(open(mpath))
    finally:
        if keep is not None:
            mpath.write_bytes(keep)
    import time; time.sleep(5)                                              # 검증 스레드가 마지막 장을 쓰도록
    ref = json.load(open(REPO / "drone_yolo" / "metrics" / f"integration_v1_3_{env}_S1_a16.json"))
    keys = ("frames_validated", "cand_per_actor", "query_green_match", "query_other_match")
    same = {k: {kk: (out[k][kk], ref[k][kk]) for kk in keys if kk in out[k] and kk in ref.get(k, {})} for k in out}
    lines = [json.loads(l) for p in out_dir.glob("*/verify.jsonl") for l in open(p)]
    kp = [l["posture"]["p_lying_kp"] for l in lines if l["posture"]["p_lying_kp"] is not None]
    res = {"관제 수치 (1.4, 1.3)": same, "verify 줄": len(lines), "관절 판정 줄": len(kp), "색 확장 줄": sum("color" in l for l in lines),
           "VLM 요청": sum(1 for p in out_dir.glob("*/vlm_req.jsonl") for _ in open(p)), "ms 중앙": round(float(np.median([l["ms"] for l in lines])), 1) if lines else None}
    print(env, json.dumps(res, ensure_ascii=False))
    (REPO / "drone_yolo" / "metrics" / f"integration_v1_4_{env}_verify.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    assert all(a == b for v in same.values() for a, b in v.values()), "그림자 모드인데 관제 수치가 달라짐"
    assert len(lines) > 0 and len(kp) > 0
    shutil.rmtree(out_dir)                                                  # 시험이 만든 크롭 (사람 그림) 은 지움


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] in ("--unit", "--e2e"):
        (unit if sys.argv[1] == "--unit" else e2e)(sys.argv[2]); sys.exit()
    envs = sys.argv[1:] or ["real", "dev"]
    py = sys.executable
    for env in envs:
        for mode in ("--unit", "--e2e"):
            r = subprocess.run([py, __file__, mode, env])
            if r.returncode:
                sys.exit(f"{env} {mode} 실패")
    print("tests_verify 통과", envs)
