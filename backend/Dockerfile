FROM python:3.11-slim

WORKDIR /app

# System deps (tiny set; add build-essential only if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

ENV PYTHONUNBUFFERED=1

EXPOSE 8088
CMD ["gunicorn", "-b", "0.0.0.0:8088", "app:app"]
