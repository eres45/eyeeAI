document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const navbarMenu = document.getElementById('navbar-menu');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navbarMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });
    }
    
    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('preview-img');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultsContainer = document.getElementById('results-container');
    const comparisonOriginal = document.getElementById('comparison-original');
    const comparisonAnalyzed = document.getElementById('comparison-analyzed');
    const conditionName = document.getElementById('condition-name');
    const severityLevel = document.getElementById('severity-level');
    const confidenceScore = document.getElementById('confidence-score');
    const diagnosisDetails = document.getElementById('diagnosis-details');
    const symptomsDetected = document.getElementById('symptoms-detected');
    const analysisDate = document.getElementById('analysis-date');
    const recommendationsList = document.getElementById('recommendations-list');
    
    // Upload area elements
    const uploadArea = document.getElementById('upload-area');
    const uploadDropzone = document.getElementById('upload-dropzone');
    
    // File upload button click handler
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // File input change handler
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadDropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadDropzone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadDropzone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
        uploadDropzone.classList.add('highlight');
    }
    
    function unhighlight(e) {
        uploadDropzone.classList.remove('highlight');
    }
    
    uploadDropzone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }
    
    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    previewImg.src = event.target.result;
                    previewContainer.style.display = 'block';
                    uploadArea.style.display = 'none';
                };
                
                reader.readAsDataURL(file);
            } else {
                alert('Please upload an image file.');
            }
        }
    }
    
    // Analysis functionality
    async function analyzeImage(file) {
        try {
            // Show loading state
            updateLoadingState(true);
            
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/analyze-eye', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }

            const result = await response.json();
            console.log('Analysis result:', result);
            
            // Update UI with results
            displayResults(result);
            
            return result;
        } catch (error) {
            console.error('Error analyzing image:', error);
            displayError(error.message);
            throw error;
        } finally {
            updateLoadingState(false);
        }
    }

    function updateLoadingState(isLoading) {
        const analyzeBtn = document.getElementById('analyze-btn');
        const loadingText = 'Analyzing...';
        const defaultText = '<i class="fas fa-search"></i> Analyze Image';
        
        if (analyzeBtn) {
            if (isLoading) {
                analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + loadingText;
                analyzeBtn.disabled = true;
            } else {
                analyzeBtn.innerHTML = defaultText;
                analyzeBtn.disabled = false;
            }
        }
        
        // Update result placeholders
        const elements = {
            'condition-name': isLoading ? 'Analyzing eye condition...' : '',
            'severity-level': isLoading ? 'Determining severity...' : '',
            'confidence-score': isLoading ? 'Calculating confidence...' : '',
            'diagnosis-details': isLoading ? 'Preparing diagnosis...' : '',
            'symptoms-detected': isLoading ? 'Detecting symptoms...' : '',
            'analysis-date': isLoading ? 'Analysis in progress...' : ''
        };
        
        Object.entries(elements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element && isLoading) {
                element.textContent = text;
            }
        });
    }

    function displayError(message) {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-button">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    function displayResults(results) {
        console.log('Displaying results:', results);
        
        // Store the analysis result for PDF generation
        window.lastAnalysisResult = results;
        
        const resultsContainer = document.getElementById('results-container');
        const elements = {
            conditionName: document.getElementById('condition-name'),
            severityLevel: document.getElementById('severity-level'),
            confidenceScore: document.getElementById('confidence-score'),
            diagnosisDetails: document.getElementById('diagnosis-details'),
            symptomsDetected: document.getElementById('symptoms-detected'),
            analysisDate: document.getElementById('analysis-date'),
            recommendationsList: document.getElementById('recommendations-list'),
            comparisonOriginal: document.getElementById('comparison-original'),
            comparisonAnalyzed: document.getElementById('comparison-analyzed')
        };

        if (!resultsContainer || !elements.conditionName) {
            console.error('Required DOM elements not found');
            return;
        }

        // Show the results section
        resultsContainer.style.display = 'block';

        // Determine the condition text based on the result
        let conditionText = 'Healthy Eye';
        let statusColor = 'green';
        
        if (results.result) {
            // Using Gemini API result format
            if (results.result.category === 'NotEye') {
                conditionText = 'No Eye Detected';
                statusColor = 'orange';
            } else if (results.result.category && results.result.category !== 'Normal') {
                conditionText = 'Eye Flu';
                statusColor = 'red';
            }
        } else if (results.condition) {
            // Using old format
            if (results.condition.includes('No Eye') || results.condition.includes('NotEye')) {
                conditionText = 'No Eye Detected';
                statusColor = 'orange';
            } else if (results.condition !== 'Normal Eye' && results.condition !== 'Healthy Eye') {
                conditionText = 'Eye Flu';
                statusColor = 'red';
            }
        }
        
        elements.conditionName.innerHTML = `
            <span class="status-badge" style="color: white; background-color: ${statusColor}; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-bottom: 10px;">
                ${conditionText}
            </span>
        `;

        // Update severity with confidence
        if (elements.severityLevel) {
            let severityText = 'Normal';
            
            if (results.result) {
                // Using Gemini API result format
                if (results.result.category && results.result.category !== 'Normal') {
                    if (results.result.category === 'Bacterial' || results.result.category === 'Viral') {
                        severityText = 'Moderate';
                    } else if (results.result.category === 'Allergic') {
                        severityText = 'Mild';
                    }
                }
            } else if (results.severity) {
                // Using old format
                severityText = results.severity;
            }
            
            elements.severityLevel.innerHTML = `
                <span class="severity-text">${severityText}</span>
            `;
        }

        // Update confidence score
        if (elements.confidenceScore) {
            let confidenceValue = 'N/A';
            
            if (results.result && results.result.confidence) {
                confidenceValue = `${results.result.confidence}%`;
            } else if (results.confidence) {
                // Handle both number and string formats
                confidenceValue = typeof results.confidence === 'number' ? 
                    `${(results.confidence * 100).toFixed(1)}%` : 
                    results.confidence;
            }
            
            elements.confidenceScore.innerHTML = `<span class="confidence-value">${confidenceValue}</span>`;
        }

        // Completely remove diagnosis details as requested by user
        if (elements.diagnosisDetails) {
            // Hide the element completely
            elements.diagnosisDetails.style.display = 'none';
            
            // Find the parent element with class 'result-content' and hide the header too
            const parentElement = elements.diagnosisDetails.parentElement;
            if (parentElement && parentElement.classList.contains('result-content')) {
                // Find the header (h3) element within the parent and hide it
                const headerElement = parentElement.querySelector('h3');
                if (headerElement) {
                    headerElement.style.display = 'none';
                }
                
                // Find the result-item container and hide it completely
                const resultItem = parentElement.parentElement;
                if (resultItem && resultItem.classList.contains('result-item')) {
                    resultItem.style.display = 'none';
                }
            }
        }

        // Update symptoms with simplified information (not detailed clinical description)
        if (elements.symptomsDetected) {
            // Check if we have the new Gemini API format result
            if (results.result) {
                // Use the category to create a simplified symptoms list
                const category = results.result.category;
                let symptomsText = '';
                
                if (category === 'Normal') {
                    symptomsText = 'No symptoms of conjunctivitis detected.';
                } else if (category === 'Bacterial') {
                    symptomsText = 'Redness, irritation, and possible discharge typical of bacterial conjunctivitis.';
                } else if (category === 'Viral') {
                    symptomsText = 'Redness and watery discharge typical of viral conjunctivitis.';
                } else if (category === 'Allergic') {
                    symptomsText = 'Redness, itching and watering typical of allergic conjunctivitis.';
                } else {
                    symptomsText = 'Signs of conjunctivitis detected.';
                }
                
                elements.symptomsDetected.textContent = symptomsText;
            } else {
                // Fallback to status detail for old format
                elements.symptomsDetected.textContent = results.status_detail || 'No symptoms information available';
            }
        }

        // Update analysis date
        if (elements.analysisDate) {
            elements.analysisDate.textContent = results.analysis_date || new Date().toLocaleString();
        }

        // Update recommendations using Gemini treatment and prevention information
        if (elements.recommendationsList) {
            elements.recommendationsList.innerHTML = '';
            
            // Check if we have the new Gemini API format result with treatment and prevention
            if (results.result && (results.result.treatment || results.result.prevention)) {
                // Function to extract bullet points from treatment and prevention text
                const extractBulletPoints = (text) => {
                    if (!text) return [];
                    
                    // Extract numbered list items (e.g. '1. Item text')
                    const numberedListRegex = /\d+\.\s*\*?\*?(.*?)(?=\n\d+\.|$)/gs;
                    let match;
                    const items = [];
                    
                    while ((match = numberedListRegex.exec(text)) !== null) {
                        if (match[1] && match[1].trim()) {
                            // Clean up the text (remove markdown, etc.)
                            let cleanedText = match[1].trim();
                            cleanedText = cleanedText.replace(/\*\*/g, ''); // Remove bold markdown
                            items.push(cleanedText);
                        }
                    }
                    
                    // If no numbered items found, try to extract bullet points
                    if (items.length === 0) {
                        // Split by newlines and filter out empty lines
                        const lines = text.split('\n').filter(line => line.trim() !== '');
                        lines.forEach(line => {
                            // Remove bullet points, asterisks, etc.
                            let cleanedLine = line.trim().replace(/^[-•*+]\s*/, '').replace(/\*\*/g, '');
                            if (cleanedLine) items.push(cleanedLine);
                        });
                    }
                    
                    return items;
                };
                
                // Extract recommendations from treatment and prevention
                const treatmentItems = extractBulletPoints(results.result.treatment);
                const preventionItems = extractBulletPoints(results.result.prevention);
                
                // Add all recommendations
                const allRecommendations = [...treatmentItems, ...preventionItems];
                
                if (allRecommendations.length > 0) {
                    // Only show a maximum of 6 recommendations to avoid overwhelming the UI
                    const limitedRecs = allRecommendations.slice(0, 6);
                    limitedRecs.forEach(rec => {
                        const li = document.createElement('li');
                        li.textContent = rec;
                        elements.recommendationsList.appendChild(li);
                    });
                } else {
                    // Fallback to default recommendations if extraction failed
                    addDefaultRecommendations(results);
                }
            } else {
                // Use traditional recommendations array if available
                const recommendations = results.recommendations || [];
                
                if (recommendations.length > 0) {
                    recommendations.forEach(rec => {
                        const li = document.createElement('li');
                        li.textContent = rec;
                        elements.recommendationsList.appendChild(li);
                    });
                } else {
                    // Add default recommendations if none are provided
                    addDefaultRecommendations(results);
                }
            }
        }
        
        // Helper function to add default recommendations
        function addDefaultRecommendations(results) {
            const defaultRecs = results.has_condition || (results.result && results.result.category !== 'Normal') ? [
                'Schedule an appointment with an eye specialist',
                'Avoid touching or rubbing your eyes',
                'Use prescribed eye drops as directed',
                'Maintain good eye hygiene'
            ] : [
                'Continue regular eye check-ups',
                'Maintain good eye hygiene',
                'Use protective eyewear when needed',
                'Take regular breaks from screen time'
            ];
            
            defaultRecs.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                elements.recommendationsList.appendChild(li);
            });
        }

        // Always update visual comparison with uploaded image
        if (elements.comparisonOriginal) {
            const previewImg = document.getElementById('preview-img');
            if (previewImg && previewImg.src) {
                elements.comparisonOriginal.src = previewImg.src;
                elements.comparisonOriginal.style.display = 'block';
            }
        }
        
        // For the analyzed image, create a canvas with a filter to make it look analyzed
        if (elements.comparisonAnalyzed) {
            const previewImg = document.getElementById('preview-img');
            if (previewImg && previewImg.src) {
                // Create a new canvas element
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Create a temporary image to get dimensions
                const tempImg = new Image();
                tempImg.onload = function() {
                    // Set canvas dimensions
                    canvas.width = tempImg.width;
                    canvas.height = tempImg.height;
                    
                    // Draw the original image
                    ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
                    
                    // Apply a filter effect to make it look "analyzed"
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    
                    // Apply a high contrast and highlight edges algorithm
                    for (let i = 0; i < data.length; i += 4) {
                        // Convert to grayscale first with custom weights
                        let gray = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11);
                        
                        // Apply threshold for high contrast
                        let threshold = 120;
                        if (gray > threshold) {
                            // For pixels above threshold, apply a slight color tint
                            data[i] = Math.min(255, gray * 1.2);     // R channel
                            data[i + 1] = Math.min(255, gray * 0.9); // G channel
                            data[i + 2] = Math.min(255, gray * 0.9); // B channel
                        } else {
                            // For darker pixels, enhance the red channel to highlight potential issues
                            data[i] = Math.min(255, gray * 1.5);     // R channel
                            data[i + 1] = Math.min(255, gray * 0.7); // G channel
                            data[i + 2] = Math.min(255, gray * 0.7); // B channel
                        }
                    }
                    
                    ctx.putImageData(imageData, 0, 0);
                    
                    // Add text overlay "Analyzed with EyeAI"
                    ctx.font = '16px Arial';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillRect(10, canvas.height - 34, 150, 24);
                    ctx.fillStyle = '#f00';
                    ctx.fillText('Analyzed with EyeAI', 15, canvas.height - 15);
                    
                    // Convert canvas to data URL and set as source
                    elements.comparisonAnalyzed.src = canvas.toDataURL('image/jpeg');
                    elements.comparisonAnalyzed.style.display = 'block';
                };
                
                // Load the image from the preview
                tempImg.src = previewImg.src;
            }
        }

        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Add event handler for the download report button
    const downloadReportBtn = document.getElementById('download-report');
    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', () => {
            console.log('Download report button clicked');
            if (window.lastAnalysisResult) {
                generatePDFReport(window.lastAnalysisResult);
            } else {
                console.error('No analysis result available to generate PDF');
                alert('Please complete an eye analysis first before downloading a report.');
            }
        });
    }
    
    // Function to generate and download PDF report
    function generatePDFReport(analysisResult) {
        console.log('Generating PDF report for:', analysisResult);
        
        // Get the image preview
        const previewImg = document.getElementById('preview-img');
        const imageSrc = previewImg ? previewImg.src : '';
        
        // Prepare report data
        const reportData = {
            image_data: imageSrc,
            condition: analysisResult.result ? analysisResult.result.diagnosis : 'Eye Analysis',
            confidence: analysisResult.result ? analysisResult.result.confidence + '%' : 'N/A',
            severity: analysisResult.result ? analysisResult.result.category : 'Unknown',
            report_type: 'Eye Analysis Report',
            analysis_date: new Date().toLocaleString()
        };
        
        // Send request to generate PDF
        fetch('/generate-pdf-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to generate PDF report: ${response.status} ${response.statusText}`);
            }
            return response.blob();
        })
        .then(blob => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `eye_analysis_report_${new Date().toISOString().slice(0,10)}.pdf`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            a.remove();
        })
        .catch(error => {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF report. Please try again.');
        });
    }
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            try {
                // Show loading state
                updateLoadingState(true);
                
                // Get the image file
                const fileInput = document.getElementById('file-input');
                const file = fileInput.files[0];
                
                if (!file) {
                    throw new Error('Please select an image first');
                }
                
                // Analyze the image
                const results = await analyzeImage(file);
                
                // Display results
                displayResults(results);
            } catch (error) {
                console.error('Analysis failed:', error);
                displayError(error.message || 'Analysis failed. Please try again.');
            } finally {
                updateLoadingState(false);
            }
        });
    }
    
    // Reset functionality
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            previewContainer.style.display = 'none';
            resultsContainer.style.display = 'none';
            uploadArea.style.display = 'block';
            fileInput.value = '';
            previewImg.src = '';
        });
    }
});
