# Use a lightweight Python image
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create a new user for security
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy dependencies and install them
COPY --chown=user requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the rest of the application
COPY --chown=user . .

# Set environment variables
ENV FLASK_ENV=development
ENV FLASK_DEBUG=1
ENV MODEL_REPO=eressss/EYEAI
ENV PYTORCH_MODEL=model_epoch26_acc94.76.pt
ENV KERAS_MODEL=model_after_testing.keras

# Expose the port
EXPOSE 7860

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--log-level", "info"]
