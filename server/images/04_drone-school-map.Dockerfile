# drone-school-map:20261007 — dev map (지도 구역 · 타일 · 지형 조회)
# 원본: drone-dev/archives/staging/school-stage-20261007/Dockerfile.map (FROM sha256:27ee4624… = drone-sandbox:20261003)
FROM drone-sandbox:20261003
USER 0:0
RUN pip install --no-cache-dir numpy==2.2.6 rasterio==1.4.3 pyproj==3.7.1 shapely==2.1.1
USER 2106:2106
