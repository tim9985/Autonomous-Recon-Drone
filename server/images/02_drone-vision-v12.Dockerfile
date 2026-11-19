# drone-vision:v12-20261014 — REAL · SIM vision (추적 BoT-SORT 용 lap 추가)
# 원본: drone-dev/archives/staging/vision-v12-review-20261014/Dockerfile (wheels/lap-0.5.12-cp312-…whl)
FROM drone-real-vision:20261007
USER root
RUN python -m pip install --no-cache-dir --no-deps lap==0.5.12
USER 2202:2202
