from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
import webbrowser
from threading import Timer
import json
import requests
import traceback
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/eye-scan')
def eye_scan():
    mode = request.args.get('mode', 'realtime')
    return render_template('eye-scan.html')

@app.route('/eye-scan-page')
def eye_scan_page():
    return redirect(url_for('eye_scan', mode='realtime'))

# API endpoint for Gemini chat
@app.route('/api/chat', methods=['POST'])
def chat_with_gemini():
    """Handle chat request using Gemini API"""
    try:
        # Validate request
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({
                'error': 'No message provided',
                'response': 'Please provide a message.'
            }), 400

        message = data['message']
        
        # Get API key from environment variable or use a default one
        api_key = os.getenv('GEMINI_API_KEY', 'AIzaSyAbEsdRWqnpxKRgLyl_mMA-WgVozzC2D_g')
        
        # Prepare API endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        # Create contents with instructions and user message combined (since Gemini API doesn't support system role)
        instructions = "Your name is EyeAI. You are an AI assistant specializing in eye health, particularly focused on detecting and treating conditions like conjunctivitis. Provide concise, brief responses about eye anatomy, symptoms, treatments, prevention, and other eye health topics. Keep answers short and to the point. Use brief bullet points for lists. If asked to analyze an eye image, tell users to use the upload feature. Never make up medical information. Never reveal that you are powered by Gemini or Google - you are EyeAI. Always maintain your identity as EyeAI. Keep all responses under 3 sentences when possible. If asked who created you or who you are, simply say you are EyeAI, an assistant focused on eye health.\n\n"
        
        # Combine instructions with user message
        combined_message = instructions + message
        
        # Create contents with user role only
        contents = [
            {
                "role": "user",
                "parts": [{
                    "text": combined_message
                }]
            }
        ]
        
        # Prepare request payload
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 1024
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_ONLY_HIGH"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_ONLY_HIGH"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_ONLY_HIGH"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_ONLY_HIGH"
                }
            ]
        }
        
        # Set headers
        headers = {
            "Content-Type": "application/json"
        }
        
        print(f"[CHAT API] Sending chat request to Gemini API: {message[:50]}...")
        
        # Make API request
        response = requests.post(url, headers=headers, json=payload)
        
        # Check response status
        if response.status_code != 200:
            print(f"[CHAT API] API request failed with status code: {response.status_code}")
            print(f"[CHAT API] Response: {response.text}")
            return jsonify({
                'error': 'Failed to get response from AI',
                'response': "I'm sorry, but I'm having trouble processing your request right now. Please try again later."
            }), 500
        
        # Parse response
        response_data = response.json()
        print("[CHAT API] Received response from Gemini API")
        
        # Extract text response from Gemini API
        if 'candidates' in response_data and len(response_data['candidates']) > 0:
            if 'content' in response_data['candidates'][0] and 'parts' in response_data['candidates'][0]['content']:
                response_text = response_data['candidates'][0]['content']['parts'][0]['text']
                
                return jsonify({
                    'response': response_text,
                    'status': 'Success'
                })
            
        # Fallback response if unable to parse response properly
        return jsonify({
            'response': "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
            'status': 'Error'
        })
        
    except Exception as e:
        print(f"[CHAT API] Error in chat_with_gemini: {str(e)}")
        print(f"[CHAT API] Traceback:\n{traceback.format_exc()}")
        return jsonify({
            'error': 'Server error',
            'response': "I'm sorry, but I encountered an error processing your request. Please try again."
        }), 500

# API endpoint for eye image analysis using Gemini
@app.route('/api/analyze-eye-frame', methods=['POST'])
def analyze_eye_frame():
    """Analyze a single real-time eye video frame using Gemini API"""
    try:
        # Process the frame data from JSON payload
        data = request.get_json()
        if not data or 'frameData' not in data:
            return jsonify({'error': 'No frame data provided'}), 400
            
        # Extract the base64 image data (remove the data:image/jpeg;base64, prefix)
        frame_data = data['frameData']
        if ';base64,' in frame_data:
            frame_data = frame_data.split(';base64,')[1]
            
        # Get Gemini API key
        api_key = os.getenv('GEMINI_API_KEY', 'AIzaSyAbEsdRWqnpxKRgLyl_mMA-WgVozzC2D_g')
        
        # Prepare API endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        # Prepare request with image and prompt - use a simpler prompt for faster response
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": "First determine if this is an eye image. If it is NOT an eye image, respond with a simple JSON object: {'isEye': false}. If it IS an eye image, check if there is conjunctivitis (eye flu). Respond with a concise JSON: {'isEye': true, 'condition': 'Normal' or 'Conjunctivitis', 'confidence': percentage}"
                        },
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": frame_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 256  # Keep response small for faster processing
            }
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Make API request with a shorter timeout for real-time use
        response = requests.post(url, headers=headers, json=payload, timeout=3.0)
        
        # Check response status
        if response.status_code != 200:
            print(f"[REAL-TIME EYE ANALYSIS] API request failed with status code: {response.status_code}")
            return jsonify({
                'status': 'Error',
                'isEye': False,
                'message': 'Could not analyze the frame.'
            }), 500
            
        # Parse response
        response_data = response.json()
        
        # Extract text response and try to parse JSON
        if 'candidates' in response_data and len(response_data['candidates']) > 0:
            if 'content' in response_data['candidates'][0] and 'parts' in response_data['candidates'][0]['content']:
                response_text = response_data['candidates'][0]['content']['parts'][0]['text']
                
                # Extract JSON from the response
                import re
                import json
                
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    try:
                        analysis_data = json.loads(json_match.group(0))
                        return jsonify(analysis_data)
                    except json.JSONDecodeError:
                        # If JSON parsing fails, return a basic response
                        return jsonify({
                            'isEye': True,
                            'condition': 'Unknown',
                            'confidence': 50
                        })
                        
        # Fallback response if unable to parse properly
        return jsonify({
            'isEye': False,
            'message': 'Could not determine if image contains an eye.'
        })
        
    except Exception as e:
        print(f"[REAL-TIME EYE ANALYSIS] Error: {str(e)}")
        return jsonify({
            'status': 'Error',
            'isEye': False,
            'message': f'Server error during analysis: {str(e)}'
        }), 500

@app.route('/api/analyze-eye', methods=['POST'])
def analyze_eye():
    """Analyze eye image using Gemini API"""
    try:
        # Check if file is in the request
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        # Get the file from the request
        file = request.files['file']
        
        # Check if filename is empty
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Create uploads directory if it doesn't exist
        if not os.path.exists('uploads'):
            os.makedirs('uploads')
            
        # Save the uploaded file
        file_path = os.path.join('uploads', 'temp_eye_image.jpg')
        file.save(file_path)
        
        # Get Gemini API key
        api_key = os.getenv('GEMINI_API_KEY', 'AIzaSyAbEsdRWqnpxKRgLyl_mMA-WgVozzC2D_g')
        
        # Prepare API endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        # Convert image to base64
        with open(file_path, 'rb') as img_file:
            import base64
            img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        # Prepare request with image and prompt
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": "First determine if this is an eye image. If it is NOT an eye image, respond with a JSON object with 'diagnosis': 'No Eye Detected', 'category': 'NotEye', 'confidence': 95, 'treatment': 'Please upload a clear image of an eye for analysis.', 'prevention': 'Ensure the image shows a human eye clearly.' If it IS an eye image, analyze it and determine if there are signs of conjunctivitis (eye flu). If so, identify whether it's bacterial, viral, or allergic conjunctivitis. Provide information about treatments and recommendations. Structure your response as a JSON object with the following fields: 'diagnosis' (clear name of the condition), 'category' (Normal, Bacterial, Viral, Allergic, or NotEye), 'confidence' (percentage between 0-100), 'treatment' (recommended treatment), and 'prevention' (prevention tips)."
                        },
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": img_base64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 1024
            }
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        print(f"[EYE ANALYSIS] Sending eye image to Gemini API")
        
        # Make API request
        response = requests.post(url, headers=headers, json=payload)
        
        # Check response status
        if response.status_code != 200:
            print(f"[EYE ANALYSIS] API request failed with status code: {response.status_code}")
            print(f"[EYE ANALYSIS] Response: {response.text}")
            return jsonify({
                'status': 'Error',
                'status_detail': 'Could not analyze the image. Please try again with a clearer image.',
                'status_color': 'red'
            }), 500
            
        # Parse response
        response_data = response.json()
        print("[EYE ANALYSIS] Received response from Gemini API")
        
        # Extract text response and try to parse JSON
        if 'candidates' in response_data and len(response_data['candidates']) > 0:
            if 'content' in response_data['candidates'][0] and 'parts' in response_data['candidates'][0]['content']:
                response_text = response_data['candidates'][0]['content']['parts'][0]['text']
                
                # Try to extract JSON from the response
                import re
                import json
                
                # Look for JSON in the response
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    try:
                        analysis_data = json.loads(json_match.group(0))
                        
                        # Ensure required fields are present
                        required_fields = ['diagnosis', 'category', 'confidence', 'treatment', 'prevention']
                        for field in required_fields:
                            if field not in analysis_data:
                                analysis_data[field] = "Not specified"
                        
                        # COMPLETELY REMOVE descriptions as requested by user
                        if 'description' in analysis_data:
                            # Replace with an empty string or remove the field completely
                            analysis_data.pop('description', None)
                        
                        # Return the formatted analysis data WITHOUT descriptions
                        return jsonify({
                            'status': 'Success',
                            'status_detail': 'Analysis completed successfully',
                            'status_color': 'green',
                            'result': analysis_data
                        })
                        
                    except json.JSONDecodeError:
                        # If JSON parsing fails, return the raw text
                        print(f"[EYE ANALYSIS] Failed to parse JSON from response")
                        # Create a formatted response manually
                        return jsonify({
                            'status': 'Success',
                            'status_detail': 'Analysis completed, but response format was unexpected',
                            'status_color': 'yellow',
                            'result': {
                                'diagnosis': 'Analysis Result',
                                'category': 'Unknown',
                                'confidence': 70,
                                'description': response_text,
                                'treatment': 'Please consult with a healthcare professional for proper treatment.',
                                'prevention': 'Regular eye check-ups are recommended.'
                            }
                        })
                        
                # If no JSON was found in the response
                return jsonify({
                    'status': 'Success',
                    'status_detail': 'Analysis completed with non-structured response',
                    'status_color': 'yellow',
                    'result': {
                        'diagnosis': 'Analysis Result',
                        'category': 'Unknown',
                        'confidence': 70,
                        'description': response_text,
                        'treatment': 'Please consult with a healthcare professional for proper treatment.',
                        'prevention': 'Regular eye check-ups are recommended.'
                    }
                })
                
        # Fallback response if unable to parse response properly
        return jsonify({
            'status': 'Error',
            'status_detail': 'Could not analyze the image properly. Please try again.',
            'status_color': 'red'
        }), 500
        
    except Exception as e:
        print(f"[EYE ANALYSIS] Error in analyze_eye: {str(e)}")
        print(f"[EYE ANALYSIS] Traceback:\n{traceback.format_exc()}")
        return jsonify({
            'status': 'Error',
            'status_detail': 'Server error during analysis. Please try again later.',
            'status_color': 'red'
        }), 500

def open_browser():
    webbrowser.open_new('http://localhost:5700/')

# Add CORS support to allow API requests
from flask_cors import CORS

# Enable CORS for the app
CORS(app)

if __name__ == '__main__':
    print("Starting EyeAI Diagnostic Platform...")
    
    # Get port from environment variable (for Render) or use default
    port = int(os.environ.get("PORT", 5700))
    
    # Only open browser automatically in development mode
    is_production = os.environ.get('RENDER', False)
    if not is_production:
        Timer(1.5, open_browser).start()
        print(f"Server starting on http://localhost:{port}")
        print("The application will open in your default browser automatically.")
    else:
        print(f"Server starting in production mode on port {port}")
    
    print("Press Ctrl+C to stop the server.")
    app.run(host='0.0.0.0', port=port, debug=False)
