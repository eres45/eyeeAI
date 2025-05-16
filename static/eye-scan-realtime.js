/**
 * Real-time eye scan functionality with eye detection
 */

// Global variables for webcam and detection
let videoElement;
let stream = null;
let canvas;
let captureInProgress = false;
let faceDetectionCanvas;
let eyePosition = 'none'; // none, too-far, close, perfect
let detectionInterval = null;
let geminiAnalysisInterval = null;
let modelsLoaded = false;
let eyeTargetCircle;
let eyeDetectionStatus;
let lastGeminiAnalysis = null;
let isAnalyzing = false;
let framesSinceLastAnalysis = 0;
let analysisFrequency = 30; // Analyze every 30 frames (about 3 seconds at 10fps)

// DOM Elements for camera controls
document.addEventListener('DOMContentLoaded', function() {
    // Mode switching buttons
    const uploadOptionBtn = document.getElementById('upload-option-btn');
    const realtimeOptionBtn = document.getElementById('realtime-option-btn');
    const uploadArea = document.getElementById('upload-area');
    const realtimeArea = document.getElementById('realtime-area');
    
    // Camera control buttons
    const startCameraBtn = document.getElementById('start-camera');
    const captureCameraBtn = document.getElementById('capture-image');
    const stopCameraBtn = document.getElementById('stop-camera');
    
    // Video element and face detection canvas
    videoElement = document.getElementById('webcam');
    faceDetectionCanvas = document.getElementById('face-detection-canvas');
    eyeTargetCircle = document.getElementById('eye-target-circle');
    eyeDetectionStatus = document.getElementById('eye-detection-status');
    
    // Create a canvas element for capturing images
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.style.display = 'none';
    
    // Load face detection models
    loadFaceDetectionModels();
    
    // Add a prominent message about camera permissions
    const cameraContainer = document.querySelector('.camera-container');
    if (cameraContainer) {
        const permissionMessage = document.createElement('div');
        permissionMessage.className = 'camera-permission-message';
        permissionMessage.innerHTML = '<p><strong>Camera access required:</strong> Click "Start Camera" below to begin scanning</p>';
        permissionMessage.style.backgroundColor = '#f8f9fa';
        permissionMessage.style.border = '2px solid #28a745';
        permissionMessage.style.borderRadius = '8px';
        permissionMessage.style.padding = '10px';
        permissionMessage.style.margin = '10px 0';
        permissionMessage.style.textAlign = 'center';
        permissionMessage.style.color = '#212529';
        cameraContainer.insertBefore(permissionMessage, cameraContainer.firstChild);
    }
    
    // Make the Start Camera button more prominent
    if (startCameraBtn) {
        startCameraBtn.style.backgroundColor = '#28a745';
        startCameraBtn.style.color = 'white';
        startCameraBtn.style.padding = '12px 25px';
        startCameraBtn.style.fontSize = '1.1rem';
        startCameraBtn.style.fontWeight = 'bold';
        startCameraBtn.style.border = 'none';
        startCameraBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        startCameraBtn.innerHTML = '<i class="fas fa-play"></i> Start Camera (Click Here First)';
    }
    
    // Event listeners for mode switching
    uploadOptionBtn.addEventListener('click', function() {
        uploadOptionBtn.classList.add('active');
        realtimeOptionBtn.classList.remove('active');
        uploadArea.style.display = 'block';
        realtimeArea.style.display = 'none';
        
        // Stop camera and detection if running
        if (stream) {
            stopCamera();
        }
    });
    
    realtimeOptionBtn.addEventListener('click', function() {
        realtimeOptionBtn.classList.add('active');
        uploadOptionBtn.classList.remove('active');
        realtimeArea.style.display = 'block';
        uploadArea.style.display = 'none';
    });
    
    // Camera control event listeners
    startCameraBtn.addEventListener('click', startCamera);
    captureCameraBtn.addEventListener('click', captureEyeImage);
    stopCameraBtn.addEventListener('click', stopCamera);
    
    // Automatically click the real-time scan button if it's in the URL
    if (window.location.hash === '#realtime' || new URLSearchParams(window.location.search).get('mode') === 'realtime') {
        realtimeOptionBtn.click();
    }
});

/**
 * Load face detection models
 */
async function loadFaceDetectionModels() {
    try {
        // Update button to show loading state
        const startCameraBtn = document.getElementById('start-camera');
        if (startCameraBtn) {
            startCameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Models...';
            startCameraBtn.disabled = true;
        }
        
        // Load the required face-api.js models from CDN
        const modelBaseUrl = 'https://justadudewhohacks.github.io/face-api.js/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelBaseUrl);
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelBaseUrl);
        
        console.log('Face detection models loaded successfully');
        modelsLoaded = true;
        
        // Reset button state
        if (startCameraBtn) {
            startCameraBtn.innerHTML = '<i class="fas fa-play"></i> Start Camera';
            startCameraBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error loading face detection models:', error);
        alert('Could not load eye detection models. Please try again or refresh the page.');
        
        // Reset button state
        const startCameraBtn = document.getElementById('start-camera');
        if (startCameraBtn) {
            startCameraBtn.innerHTML = '<i class="fas fa-play"></i> Start Camera';
            startCameraBtn.disabled = false;
        }
    }
}

/**
 * Start the webcam and eye detection
 */
function startCamera() {
    if (!modelsLoaded) {
        alert('Eye detection models are still loading. Please wait a moment and try again.');
        return;
    }
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Request access to the webcam
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user', // Use front camera on mobile devices
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        })
        .then(function(mediaStream) {
            // Store the stream for later stopping
            stream = mediaStream;
            
            // Connect the stream to the video element
            videoElement.srcObject = mediaStream;
            videoElement.play();
            
            // Set initial eye position status
            updateEyePositionStatus('none');
            
            // Add status indicator for EyeAI analysis
            const geminiStatusIndicator = document.createElement('div');
            geminiStatusIndicator.id = 'gemini-status-indicator';
            geminiStatusIndicator.className = 'gemini-status-indicator';
            geminiStatusIndicator.innerHTML = '<span class="dot"></span> EyeAI analyzing...';
            document.querySelector('.eye-target-overlay').appendChild(geminiStatusIndicator);
            
            // Enable/disable buttons
            document.getElementById('start-camera').disabled = true;
            document.getElementById('capture-image').disabled = false;
            document.getElementById('stop-camera').disabled = false;
            
            console.log('Camera started successfully');
            
            // Start eye detection once video is playing
            videoElement.addEventListener('playing', function() {
                startEyeDetection();
                startGeminiAnalysis();
            });
        })
        .catch(function(error) {
            console.error('Error accessing camera:', error);
            alert('Could not access your camera. Please ensure you have a camera connected and have granted permission to use it.');
        });
    } else {
        alert('Your browser does not support camera access. Please try a different browser or upload an image instead.');
    }
}

/**
 * Start real-time Gemini eye analysis
 */
function startGeminiAnalysis() {
    if (!stream || geminiAnalysisInterval) return;
    
    // Create a temporary canvas for frame capture
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Function to analyze frames with Gemini API
    const analyzeFrame = async () => {
        // Only analyze if we're in a good eye position and not currently analyzing
        if ((eyePosition === 'perfect' || eyePosition === 'close') && !isAnalyzing) {
            framesSinceLastAnalysis++;
            
            // Only send for analysis every few frames to prevent overwhelming the API
            if (framesSinceLastAnalysis >= analysisFrequency) {
                framesSinceLastAnalysis = 0;
                isAnalyzing = true;
                
                // Update status indicator
                const statusIndicator = document.getElementById('gemini-status-indicator');
                if (statusIndicator) {
                    statusIndicator.className = 'gemini-status-indicator analyzing';
                }
                
                try {
                    // Draw current frame to canvas
                    tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
                    
                    // Get the image data as base64
                    const frameData = tempCanvas.toDataURL('image/jpeg', 0.8);
                    
                    // Send to server for analysis
                    const response = await fetch('/api/analyze-eye-frame', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ frameData })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    console.log('Gemini analysis result:', result);
                    
                    // Store the analysis result
                    lastGeminiAnalysis = result;
                    
                    // Update UI with analysis results
                    updateRealtimeAnalysisDisplay(result);
                    
                    // Update status indicator
                    if (statusIndicator) {
                        statusIndicator.className = 'gemini-status-indicator ' + 
                            (result.isEye ? (result.condition === 'Normal' ? 'normal' : 'detected') : 'no-eye');
                    }
                } catch (error) {
                    console.error('Error analyzing frame with Gemini:', error);
                    // Update status indicator
                    const statusIndicator = document.getElementById('gemini-status-indicator');
                    if (statusIndicator) {
                        statusIndicator.className = 'gemini-status-indicator error';
                    }
                } finally {
                    isAnalyzing = false;
                }
            }
        }
    };
    
    // Start periodic analysis
    geminiAnalysisInterval = setInterval(analyzeFrame, 100); // Check every 100ms (10fps)
    console.log('Gemini eye analysis started');
}

/**
 * Update the UI with real-time analysis results
 */
function updateRealtimeAnalysisDisplay(result) {
    if (!result || !result.isEye) return;
    
    // Create or update the analysis display
    let analysisDisplay = document.getElementById('realtime-analysis-display');
    
    if (!analysisDisplay) {
        // Create the display if it doesn't exist
        analysisDisplay = document.createElement('div');
        analysisDisplay.id = 'realtime-analysis-display';
        analysisDisplay.className = 'realtime-analysis-display';
        
        // Add it to the DOM
        const container = document.querySelector('.camera-container');
        if (container) {
            container.appendChild(analysisDisplay);
        }
    }
    
    // Determine the condition class
    let conditionClass = 'normal';
    let conditionText = 'Healthy Eye';
    
    if (result.condition && result.condition.toLowerCase() !== 'normal') {
        conditionClass = 'eye-flu';
        conditionText = 'Eye Flu Detected';
    }
    
    // Update the content
    analysisDisplay.innerHTML = `
        <div class="realtime-analysis-card ${conditionClass}">
            <div class="realtime-analysis-header">
                <span class="realtime-condition">${conditionText}</span>
                <span class="realtime-confidence">${result.confidence}% confidence</span>
            </div>
        </div>
    `;
}

/**
 * Start real-time eye detection
 */
function startEyeDetection() {
    if (!stream || detectionInterval) return;
    
    // Set canvas dimensions to match video
    faceDetectionCanvas.width = videoElement.videoWidth;
    faceDetectionCanvas.height = videoElement.videoHeight;
    
    // Start the detection interval
    detectionInterval = setInterval(detectEyes, 100); // Run detection 10 times per second
    console.log('Eye detection started');
}

/**
 * Detect eyes in the video stream
 */
async function detectEyes() {
    if (!videoElement || !stream || !faceDetectionCanvas) return;
    
    try {
        // Get face landmarks including eyes
        const detections = await faceapi.detectAllFaces(
            videoElement, 
            new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
        ).withFaceLandmarks();
        
        // Clear previous drawings
        const ctx = faceDetectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, faceDetectionCanvas.width, faceDetectionCanvas.height);
        
        // Process detections if we found any
        if (detections && detections.length > 0) {
            // Use the first detected face
            const face = detections[0];
            const landmarks = face.landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            
            // Calculate eye positions
            const leftEyeCenter = calculateEyeCenter(leftEye);
            const rightEyeCenter = calculateEyeCenter(rightEye);
            
            // Draw eye landmarks for debugging
            // ctx.fillStyle = 'blue';
            // leftEye.forEach(point => {
            //     ctx.beginPath();
            //     ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            //     ctx.fill();
            // });
            
            // Get center coordinates of the target circle
            const targetRect = eyeTargetCircle.getBoundingClientRect();
            const videoRect = videoElement.getBoundingClientRect();
            
            // Convert target position to video coordinates
            const targetCenterX = faceDetectionCanvas.width / 2; 
            const targetCenterY = faceDetectionCanvas.height / 2;
            const targetRadius = 75; // Half of the circle's width/height
            
            // Get the eye closest to the center of the target (for single-eye scan)
            const leftDistance = calculateDistance(leftEyeCenter, { x: targetCenterX, y: targetCenterY });
            const rightDistance = calculateDistance(rightEyeCenter, { x: targetCenterX, y: targetCenterY });
            const closestEye = leftDistance < rightDistance ? leftEyeCenter : rightEyeCenter;
            
            // Distance from closest eye to target center
            const distance = Math.min(leftDistance, rightDistance);
            
            // Determine position status
            if (distance < targetRadius * 0.4) {
                // Perfect position - eye is well-centered in the target
                updateEyePositionStatus('perfect');
                // Auto-capture after a short delay if we maintain perfect position
                if (eyePosition === 'perfect' && !captureInProgress) {
                    document.getElementById('capture-image').classList.add('pulse');
                }
            } else if (distance < targetRadius * 0.8) {
                // Close - eye is near the target but not perfectly centered
                updateEyePositionStatus('close');
            } else {
                // Too far - eye is outside the target area
                updateEyePositionStatus('too-far');
            }
            
            // Draw circle around detected eye
            ctx.beginPath();
            ctx.arc(closestEye.x, closestEye.y, 30, 0, 2 * Math.PI);
            ctx.strokeStyle = getStatusColor(eyePosition);
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // No face detected
            updateEyePositionStatus('none');
        }
    } catch (error) {
        console.error('Error in eye detection:', error);
    }
}

/**
 * Calculate the center point of an eye
 */
function calculateEyeCenter(eyePoints) {
    const sumX = eyePoints.reduce((sum, point) => sum + point.x, 0);
    const sumY = eyePoints.reduce((sum, point) => sum + point.y, 0);
    return {
        x: sumX / eyePoints.length,
        y: sumY / eyePoints.length
    };
}

/**
 * Calculate distance between two points
 */
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2.x - point1.x, 2) + 
        Math.pow(point2.y - point1.y, 2)
    );
}

/**
 * Update the eye position status with visual feedback
 */
function updateEyePositionStatus(status) {
    // Only update if status has changed
    if (eyePosition === status) return;
    
    eyePosition = status;
    
    // Remove all status classes
    eyeTargetCircle.classList.remove('too-far', 'close', 'perfect');
    
    // Add appropriate class based on status
    if (status !== 'none') {
        eyeTargetCircle.classList.add(status);
    }
    
    // Update status text
    let statusText = '';
    let enableCapture = false;
    
    switch(status) {
        case 'too-far':
            statusText = 'Move your eye closer to the circle';
            enableCapture = false;
            break;
        case 'close':
            statusText = 'Almost there! Adjust slightly';
            enableCapture = true;
            break;
        case 'perfect':
            statusText = 'Perfect position! Hold still';
            enableCapture = true;
            break;
        default:
            statusText = 'No eye detected. Position your eye in the circle';
            enableCapture = false;
    }
    
    eyeDetectionStatus.textContent = statusText;
    document.getElementById('capture-image').disabled = !enableCapture;
    
    // Add color to status text
    eyeDetectionStatus.style.backgroundColor = getStatusColor(status, true);
}

/**
 * Get color based on eye position status
 */
function getStatusColor(status, isBackground = false) {
    const opacity = isBackground ? '0.7' : '0.8';
    switch(status) {
        case 'too-far':
            return `rgba(220, 53, 69, ${opacity})`; // Red
        case 'close':
            return `rgba(255, 193, 7, ${opacity})`; // Yellow
        case 'perfect':
            return `rgba(40, 167, 69, ${opacity})`; // Green
        default:
            return `rgba(108, 117, 125, ${opacity})`; // Gray
    }
}

/**
 * Stop the webcam and eye detection
 */
function stopCamera() {
    // Stop the detection interval
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
        console.log('Eye detection stopped');
    }
    
    // Stop the EyeAI analysis interval
    if (geminiAnalysisInterval) {
        clearInterval(geminiAnalysisInterval);
        geminiAnalysisInterval = null;
        console.log('EyeAI analysis stopped');
    }
    
    // Clear canvas
    if (faceDetectionCanvas) {
        const ctx = faceDetectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, faceDetectionCanvas.width, faceDetectionCanvas.height);
    }
    
    // Remove analysis display and status indicator
    const analysisDisplay = document.getElementById('realtime-analysis-display');
    if (analysisDisplay) {
        analysisDisplay.remove();
    }
    
    const statusIndicator = document.getElementById('gemini-status-indicator');
    if (statusIndicator) {
        statusIndicator.remove();
    }
    
    // Reset eye position status
    updateEyePositionStatus('none');
    
    // Reset analysis variables
    lastGeminiAnalysis = null;
    isAnalyzing = false;
    framesSinceLastAnalysis = 0;
    
    // Stop webcam stream
    if (stream) {
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        
        // Clear the video source
        videoElement.srcObject = null;
        
        // Reset button states
        document.getElementById('start-camera').disabled = false;
        document.getElementById('capture-image').disabled = true;
        document.getElementById('stop-camera').disabled = true;
        
        console.log('Camera stopped');
    }
}

/**
 * Capture an image from the webcam
 */
function captureEyeImage() {
    if (!stream || captureInProgress) return;
    
    // Check if eye position is acceptable for capture
    if (eyePosition !== 'perfect' && eyePosition !== 'close') {
        alert('Please position your eye correctly in the circle before capturing.');
        return;
    }
    
    captureInProgress = true;
    
    // Temporarily stop eye detection during capture
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
    
    // Remove pulse animation
    document.getElementById('capture-image').classList.remove('pulse');
    
    // Show a quick flash effect
    const flashElement = document.createElement('div');
    flashElement.style.position = 'fixed';
    flashElement.style.top = '0';
    flashElement.style.left = '0';
    flashElement.style.width = '100%';
    flashElement.style.height = '100%';
    flashElement.style.backgroundColor = 'white';
    flashElement.style.opacity = '0.7';
    flashElement.style.zIndex = '9999';
    flashElement.style.pointerEvents = 'none';
    document.body.appendChild(flashElement);
    
    // Play camera shutter sound
    const shutterSound = new Audio('https://freesound.org/data/previews/617/617443_1648170-lq.mp3');
    shutterSound.volume = 0.3;
    shutterSound.play().catch(e => console.log('Could not play shutter sound:', e));
    
    // Fade out the flash
    setTimeout(function() {
        flashElement.style.opacity = '0';
        flashElement.style.transition = 'opacity 0.3s ease';
        setTimeout(function() {
            document.body.removeChild(flashElement);
        }, 300);
    }, 100);
    
    // Capture the current frame from the video
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Mirror the image horizontally to undo the mirroring we applied in the CSS
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    // Draw the video frame to the canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // If eye position is perfect, draw a green highlight around the eye area
    if (eyePosition === 'perfect') {
        // This visual effect will be visible in the captured image
        ctx.beginPath();
        
        // Find center of image
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw highlight circle
        ctx.arc(centerX, centerY, 100, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(40, 167, 69, 0.8)';
        ctx.stroke();
    }
    
    // Convert the canvas to a data URL (base64-encoded image)
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    // Reset the canvas transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Display the captured image in the preview
    const previewImg = document.getElementById('preview-img');
    if (previewImg) {
        previewImg.src = imageData;
        document.getElementById('preview-container').style.display = 'block';
        
        // Scroll to the preview
        document.getElementById('preview-container').scrollIntoView({ behavior: 'smooth' });
    }
    
    // Update the analyze button to use this captured image
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.onclick = function() {
            analyzeEyeImage(imageData);
        };
    }
    
    // Resume eye detection
    if (stream) {
        detectionInterval = setInterval(detectEyes, 100);
    }
    
    captureInProgress = false;
    
    // Optional: Auto-trigger analysis
    if (eyePosition === 'perfect') {
        setTimeout(() => {
            const shouldAutoAnalyze = confirm('Auto-analyze the captured eye image?');
            if (shouldAutoAnalyze && analyzeBtn) {
                analyzeBtn.click();
            }
        }, 500);
    }
}

/**
 * Submit the captured image for analysis
 * @param {string} imageData - Base64-encoded image data
 */
function analyzeEyeImage(imageData) {
    // Show loading state
    const previewContainer = document.getElementById('preview-container');
    const resultsContainer = document.getElementById('results-container');
    
    if (previewContainer) {
        previewContainer.classList.add('loading');
    }
    
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
    
    document.getElementById('loading-container').style.display = 'flex';
    
    // Convert base64 image to a file object
    const byteString = atob(imageData.split(',')[1]);
    const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], "captured-eye-image.jpg", { type: "image/jpeg" });
    
    // Create form data and append the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Send to server for analysis
    fetch('/api/analyze-eye', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Analysis results:', data);
        
        // Hide loading state
        if (previewContainer) {
            previewContainer.classList.remove('loading');
        }
        document.getElementById('loading-container').style.display = 'none';
        
        // Display the results
        displayResults(data);
        
        // Scroll to results
        if (resultsContainer) {
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    })
    .catch(error => {
        console.error('Error analyzing image:', error);
        
        // Hide loading state
        if (previewContainer) {
            previewContainer.classList.remove('loading');
        }
        document.getElementById('loading-container').style.display = 'none';
        
        // Show error message
        alert('Error analyzing image. Please try again or upload a different image.');
    });
}
