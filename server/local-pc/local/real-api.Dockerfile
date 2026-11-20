FROM ubuntu:24.04@sha256:a853f94d226358a79c740cfc7bce0c289748f3fe3488d921d038ccd752c61b60
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip ffmpeg ca-certificates curl tini libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH
COPY requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir -c /tmp/requirements.lock \
    fastapi httpx 'psycopg[binary]' 'uvicorn[standard]' websockets && pip check
WORKDIR /workspace
ENTRYPOINT ["/usr/bin/tini", "--"]
