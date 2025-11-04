FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY train.py service.py util_report.py ./

# Build-time train — write versioned artifact in /app/models
ENV MODEL_DIR=/app/models
RUN mkdir -p $MODEL_DIR && python train.py

EXPOSE 8001
CMD ["python", "service.py"]
