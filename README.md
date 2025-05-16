# EyeAI Diagnostic Platform

An AI-powered web application for detecting and classifying eye flu conditions using real-time eye detection and the Gemini API.

## Features

- AI-powered eye flu detection using Gemini API
- Real-time webcam eye analysis
- Guided positioning for optimal eye scanning
- Image upload analysis
- Intelligent chatbot for eye health questions
- Comprehensive condition reports
- Privacy-focused design

## Project Structure

```
eyeai/
├── static/             # Static files (CSS, JS)
│   ├── eye-scan.js     # Eye scan functionality
│   ├── eye-scan-realtime.js # Real-time eye detection
│   ├── chatbot.js      # Chatbot functionality
│   └── style.css       # Main styles
├── templates/          # HTML templates
│   ├── index.html      # Homepage
│   └── eye-scan.html   # Eye scanning page
├── run_server.py       # Flask application
├── gemini_api.py       # Gemini API integration
├── requirements.txt    # Python dependencies
├── Procfile            # For Render deployment
└── runtime.txt         # Python version for Render
```

## Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Unix/MacOS:
     ```bash
     source venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. Make sure your virtual environment is activated

2. Run the application:
   ```bash
   python run_server.py
   ```

3. Open your browser and navigate to http://localhost:5700

## Deploying to Render

This application is configured for easy deployment to Render.com:

1. Create a new Web Service on Render

2. Connect your GitHub repository

3. Use the following settings:
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn run_server:app`

4. Add the following environment variables:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `RENDER`: `true` (to enable production mode)

5. Deploy!

## Usage

1. Click on "Upload Image & Analyze" on the homepage
2. Upload an eye image or use the camera to take a photo
3. Wait for the AI analysis to complete
4. View the results and recommendations
5. Download or share the report if needed

## Security and Privacy

- All images are processed securely and not stored permanently
- Data transmission is encrypted
- Compliant with HIPAA and GDPR regulations
- Regular security audits and updates

## Technologies Used

- Frontend: HTML5, CSS3, JavaScript
- Backend: Python, Flask
- AI/ML: TensorFlow, Keras
- Security: Flask-CORS, Werkzeug

## Support

For support, email support@eyehealthai.com or visit our Knowledge Base.

## License

Copyright © 2024 Eye Flu Classification System. All rights reserved.
