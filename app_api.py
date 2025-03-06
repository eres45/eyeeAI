from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
import torch
import tensorflow as tf
from PIL import Image
import io
import numpy as np
from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="EyeAI API",
    description="API for Eye Disease Detection using PyTorch and Keras models",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model loading from Hugging Face Hub
def load_models():
    try:
        # Download models from Hugging Face Hub
        pytorch_path = hf_hub_download(
            repo_id="eressss/EYEAI",
            filename="model_epoch26_acc94.76.pt",
            token=os.getenv('HF_TOKEN')
        )
        keras_path = hf_hub_download(
            repo_id="eressss/EYEAI",
            filename="model_after_testing.keras",
            token=os.getenv('HF_TOKEN')
        )
        
        # Load models
        pytorch_model = torch.load(pytorch_path, map_location=torch.device('cpu'))
        keras_model = tf.keras.models.load_model(keras_path)
        
        pytorch_model.eval()
        return pytorch_model, keras_model
    except Exception as e:
        print(f"Error loading models: {e}")
        return None, None

# Load models at startup
pytorch_model, keras_model = load_models()

def preprocess_image(image_bytes, target_size=(224, 224)):
    # Open image
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize
    image = image.resize(target_size)
    
    # Convert to numpy array
    image_array = np.array(image)
    
    # Normalize
    image_array = image_array / 255.0
    
    return image_array

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        # Check if models are loaded
        if pytorch_model is None or keras_model is None:
            raise HTTPException(status_code=500, detail="Models not loaded properly")
            
        # Read and preprocess image
        image_bytes = await file.read()
        processed_image = preprocess_image(image_bytes)
        
        # PyTorch prediction
        with torch.no_grad():
            pytorch_input = torch.FloatTensor(processed_image).permute(2, 0, 1).unsqueeze(0)
            pytorch_output = pytorch_model(pytorch_input)
            pytorch_pred = torch.softmax(pytorch_output, dim=1)
            pytorch_result = pytorch_pred.argmax().item()
        
        # Keras prediction
        keras_input = np.expand_dims(processed_image, axis=0)
        keras_pred = keras_model.predict(keras_input)
        keras_result = np.argmax(keras_pred[0])
        
        # Combine predictions
        conditions = ["Healthy Eye", "Eye Flu Detected"]
        final_result = "Eye Flu Detected" if (pytorch_result == 1 or keras_result == 1) else "Healthy Eye"
        
        return {
            "status": "success",
            "prediction": {
                "result": final_result,
                "pytorch_confidence": float(pytorch_pred.max()),
                "keras_confidence": float(keras_pred.max())
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": pytorch_model is not None and keras_model is not None
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to EyeAI API",
        "docs_url": "/docs",
        "health_check": "/health",
        "predict_endpoint": "/predict"
    }
