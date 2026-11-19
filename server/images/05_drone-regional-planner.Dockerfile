# drone-regional-planner:20261022 — city-planner · regional-planner/observer/preview (구역 경로 계산 · CPU)
# 원본: drone-dev/regional-search-code/server_integration/regional_search/Dockerfile
# ⚠ 기반 drone-regional-base:20261022 의 Dockerfile 은 서버에 없다 → 꾸러미 images.tar.zst 에서 load
FROM drone-regional-base:20261022
USER 0:0
RUN pip install --no-cache-dir numpy==2.5.3 scipy==1.18.1 shapely==2.1.2 rasterio==1.5.1 pyproj==3.8.0 numba==0.68.0 affine==3.0.1
USER 2101:2101
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /workspace
CMD ["python", "-m", "server_integration.regional_search.worker", "--queue", "/queue", "--packages", "/packages"]
