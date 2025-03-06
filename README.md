---
title: Eye Flu Detection API
emoji: 👁️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
app_file: app_api.py
---

# Eye Flu Detection System

This API provides endpoints for detecting eye flu using advanced deep learning models. The system uses both PyTorch and Keras models for accurate predictions.

## 🚀 Features

- Real-time eye flu detection
- Dual model architecture (PyTorch + Keras)
- High accuracy and reliability
- Fast API response times
- Simple REST API interface

## 📚 API Endpoints

- `POST /predict`: Upload an image for eye flu detection
- `GET /health`: Check API health status
- `GET /`: Welcome page with API information

## 🛠️ Tech Stack

- FastAPI
- PyTorch
- TensorFlow/Keras
- Docker
- Python 3.9

## 📝 Usage

Send a POST request to `/predict` with an image file to get predictions:

```bash
curl -X POST "https://eressss-eyeflu.hf.space/predict" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@your_image.jpg"
```

## 🔒 Security

- Environment variables for sensitive data
- Secure model loading from Hugging Face Hub
- CORS protection enabled

## 📊 Model Performance

- PyTorch Model Accuracy: 94.76%
- Combined Model Decision System for higher reliability

Made with ❤️ by EyeAI Team
