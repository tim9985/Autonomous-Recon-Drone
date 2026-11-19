# drone-vision:v12-school-pc-20261104 — SIM vision (PC SIM 판 · DEM 좌표용 GIS 읽기)
# 원본: drone-dev/deployment/releases/20261104-pc-sim-v1/Dockerfile.vision
FROM drone-vision:v12-20261014
USER root
# Add georeferenced DEM readers only; never resolve/replace torch, TRT, numpy or the active model.
RUN python -m pip install --no-cache-dir --no-deps rasterio==1.4.3 pyproj==3.7.0 affine==2.4.0 attrs==25.4.0 click==8.1.8 cligj==0.7.2 click-plugins==1.1.1.2
RUN python -c "import rasterio,pyproj,torch; print(rasterio.__version__,pyproj.__version__,torch.__version__)"
