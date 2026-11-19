# drone-real-vision:20261007 — 비전 worker 기반 (ultralytics 8.4.102 · TensorRT 11.3 cu12 등)
# 원본: 서버 ~/deploy_vision.sh (10-07) · 빌드 문맥에 requirements-vision.txt (= drone_yolo/deploy/vision_worker/requirements-vision.txt)
#   docker build -f 01_drone-real-vision.Dockerfile -t drone-real-vision:20261007 <requirements-vision.txt 있는 폴더>
FROM drone-sandbox:20261003
USER root
COPY requirements-vision.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements-vision.txt \
 && pip install --no-cache-dir --no-deps ultralytics==8.4.102 \
 && pip freeze > /opt/requirements-vision.lock
USER 1001:1001
