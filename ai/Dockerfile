FROM python:3.11-slim

WORKDIR /app

# Install dependencies first for Docker caching
COPY ai/requirements.txt ./ai/requirements.txt
RUN pip install --no-cache-dir -r ./ai/requirements.txt

# Copy AI service source and prompts
COPY ai/ ./ai/

WORKDIR /app/ai

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
