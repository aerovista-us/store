FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8088

CMD ["gunicorn", "-b", "0.0.0.0:8088", "app:app", "--workers", "2", "--threads", "4", "--timeout", "60"]