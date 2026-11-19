FROM drone-regional-base:20261022
USER 0:0
RUN pip install --no-cache-dir numpy==2.5.3 scipy==1.18.1 shapely==2.1.2 rasterio==1.5.1 pyproj==3.8.0 numba==0.68.0 affine==3.0.1
USER 2101:2101
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /workspace
CMD ["python", "-m", "server_integration.regional_search.worker", "--queue", "/queue", "--packages", "/packages"]
