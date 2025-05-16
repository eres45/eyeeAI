import os
import requests
import base64
import json
from PIL import Image
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment variable or use the one provided
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyAbEsdRWqnpxKRgLyl_mMA-WgVozzC2D_g')

def encode_image_to_base64(image_path):
    """Convert image to base64 string for API request"""
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    return encoded_string

def analyze_eye_with_gemini(image_path):
    """
    Use Gemini API to analyze eye images for disease detection and classification
    Returns: dict with condition, severity, confidence, symptoms, recommendations
    """
    try:
        # Encode image to base64
        image_base64 = encode_image_to_base64(image_path)
        
        # Prepare API endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        
        # Prepare prompt that specifically asks for eye disease analysis
        prompt = """
        You are a medical AI assistant specialized in ophthalmology. Analyze this eye image and:
        1. Determine if any eye condition is present
        2. If a condition is present, identify it (focusing on conjunctivitis types: Bacterial, Viral, or Allergic)
        3. Assess the severity (Mild, Moderate, or Severe)
        4. Provide key symptoms visible in the image
        5. Suggest appropriate recommendations or treatments
        
        Provide your analysis in the following JSON format:
        {
            "has_eye_condition": true/false,
            "condition": "Bacterial Conjunctivitis/Viral Conjunctivitis/Allergic Conjunctivitis/Normal",
            "confidence_percentage": 85,
            "severity": "Mild/Moderate/Severe/None",
            "severity_confidence": 80,
            "visible_symptoms": ["redness", "discharge", etc],
            "detailed_analysis": "detailed description of what you see in the image",
            "recommendations": ["specific recommendation 1", "specific recommendation 2"]
        }
        
        Be accurate, precise, and provide confidence scores that reflect certainty. If you cannot clearly analyze the image, indicate this in your response.
        """
        
        # Prepare request payload
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64
                        }
                    }
                ]
            }]
        }
        
        # Set headers
        headers = {
            "Content-Type": "application/json"
        }
        
        # Make API request
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        
        # Check response status
        if response.status_code != 200:
            print(f"API request failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return {"error": f"API request failed: {response.text}"}
        
        # Parse response
        response_data = response.json()
        
        # Extract text response from Gemini API
        if 'candidates' in response_data:
            text_response = response_data['candidates'][0]['content']['parts'][0]['text']
            
            # Parse JSON from text response
            # Find JSON object in the text (in case there's additional text)
            import re
            json_match = re.search(r'({.*?})', text_response.replace('\n', ''), re.DOTALL)
            if json_match:
                text_response = json_match.group(1)
            
            try:
                # Parse the JSON response
                analysis_result = json.loads(text_response)
                return analysis_result
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON from response: {e}")
                print(f"Raw response: {text_response}")
                # Return a formatted response with the raw text
                return {
                    "error": "Failed to parse structured data from API response",
                    "raw_response": text_response
                }
        else:
            return {"error": "No valid response content from API"}
    
    except Exception as e:
        print(f"Error in analyze_eye_with_gemini: {str(e)}")
        return {"error": f"Analysis failed: {str(e)}"}
