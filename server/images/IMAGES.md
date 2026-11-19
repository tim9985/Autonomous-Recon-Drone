# 이미지 계보 — 다시 빌드하기

```
ubuntu:24.04@sha256:a853f94d…
 └─ 00 drone-sandbox:20261003  (= sha256:27ee4624… · torch 2.8.0+cu128 · requirements.lock)
     ├─ 01 drone-real-vision:20261007   (+ ultralytics 8.4.102 · TensorRT 11.3 cu12 · requirements-vision.txt)
     │   └─ 02 drone-vision:v12-20261014   (+ lap 0.5.12)            → REAL vision · SIM vision
     │       └─ 03 drone-vision:v12-school-pc-20261104 (+ rasterio · pyproj)  → SIM vision (compose.pc-sim.json)
     └─ 04 drone-school-map:20261007    (+ numpy · rasterio · pyproj · shapely) → dev map
drone-regional-base:20261022 (Dockerfile 없음 · 저장본에서)
 └─ 05 drone-regional-planner:20261022  → city-planner · regional-*
postgis/postgis:16-3.5@sha256:94146ac3…   (Docker Hub)
bluenviron/mediamtx:1.21.1@sha256:5ce2a948… (Docker Hub)
```

| 순서 | 명령 (저장소 루트에서) |
|---|---|
| 00 | `docker build -f server/images/00_drone-sandbox.Dockerfile -t drone-sandbox:20261003 server/drone-server` |
| 01 | `docker build -f server/images/01_drone-real-vision.Dockerfile -t drone-real-vision:20261007 server/images` |
| 02 | `docker build -f server/images/02_drone-vision-v12.Dockerfile -t drone-vision:v12-20261014 server/images` |
| 03 | `docker build -f server/images/03_drone-vision-school-pc.Dockerfile -t drone-vision:v12-school-pc-20261104 server/images` |
| 04 | `docker build -f server/images/04_drone-school-map.Dockerfile -t drone-school-map:20261007 server/images` |
| 05 | 기반을 load 한 뒤 `docker build -f server/images/05_drone-regional-planner.Dockerfile -t drone-regional-planner:20261022 server/images` |

- compose 는 기반 이미지를 **ID** 로 부른다 (`image: sha256:27ee4624…` · `pull_policy: never`) → 다시 빌드하면 ID 가 달라진다 → compose 의 그 줄을 `drone-sandbox:20261003` 으로 바꾼다 (drone-dev `compose.yml` · `compose.school.yml` · drone-real `compose.json`)
- 빌드 시점 PyPI 판이 바뀌어도 `requirements.lock` · `==` 고정이라 같게 깔린다. 단 torch cu128 휠은 PyTorch 색인에 남아 있어야 한다
- 서버 이미지와 **똑같이** 쓰려면 다시 빌드하지 말고 꾸러미의 `00_root/images/images.tar.zst` 를 `docker load`
