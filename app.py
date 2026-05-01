import os
import numpy as np
import tensorflow as tf
from flask import Flask, request, render_template, url_for, send_from_directory, jsonify
from flask_cors import CORS
from PIL import Image
from datetime import datetime

app = Flask(__name__)
CORS(app)

# --- Configuration ---
TARGET_SIZE = (160, 160)  
UPLOAD_FOLDER = 'uploads'
MODEL_PATH = 'models/tomato_classifier.keras' 

# Ensure the upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Load the AI model
model = None
if os.path.exists(MODEL_PATH):
    try:
        # Loading model without compilation to avoid potential custom layer errors
        model = tf.keras.models.load_model(MODEL_PATH, compile=False)
        print("✅ Success: Model loaded successfully.")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
else:
    print(f"❌ Error: Model file not found at {MODEL_PATH}")

def normalize_imagenet(image):
    """
    Apply ImageNet normalization (Mean/Std subtraction) 
    as used in your training code
    """
    image = image / 255.0
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    return (image - mean) / std

def preprocess_image(image_path):
    """
    Open, resize, and normalize the image to match model input requirements
    """
    try:
        # Load image and ensure it is in RGB format
        img = Image.open(image_path).convert('RGB')
        img = img.resize(TARGET_SIZE)
        img_array = np.array(img).astype(np.float32)
        
        # Apply normalization
        processed_img = normalize_imagenet(img_array)
        
        # Expand dimensions to create batch size of 1 (1, 160, 160, 3)
        processed_img = np.expand_dims(processed_img, axis=0)
        return processed_img
    except Exception as e:
        print(f"❌ Preprocessing Error: {e}")
        return None

@app.route('/')
def index():
    """Render the main landing page"""
    return render_template('index.html')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve the uploaded image files back to the UI"""
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/predict', methods=['POST'])
def predict():
    """Handle the image upload, run prediction, and return JSON results"""
    
    # 1. Verify if the model is loaded
    if model is None:
        return jsonify({'success': False, 'error': 'Model not found on server. Check MODEL_PATH.'}), 500
        
    # 2. Check if the file is present in the request
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part in request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    try:
        # 3. Save the file locally with a unique timestamped filename
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # 4. Image Preprocessing
        processed_img = preprocess_image(filepath)
        if processed_img is None:
            return jsonify({'success': False, 'error': 'Failed to process image.'}), 500

        # 5. Model Prediction
        prediction = model.predict(processed_img, verbose=0)
        raw_score = float(prediction[0][0])

        # Define results based on the threshold (Healthy < 0.5)
        if raw_score < 0.5:
            res_class = "Healthy"
            confidence = (1 - raw_score) * 100
            is_healthy = True
            msg = "The leaf is healthy! Keep up the good work."
        else:
            res_class = "Unhealthy"
            confidence = raw_score * 100
            is_healthy = False
            msg = "Disease detected. Please check the leaf carefully."

        # Generate the URL for the saved image
        image_url = url_for('uploaded_file', filename=filename)

        # 6. Return JSON Response
        return jsonify({
            'success': True,
            'prediction': res_class,
            'confidence': round(confidence, 2),
            'image_path': image_url,
            'is_healthy': is_healthy,
            'message': msg,
            'raw_score': raw_score
        })

    except Exception as e:
        print(f"❌ Prediction Error: {e}")
        return jsonify({'success': False, 'error': f'Server Error: {str(e)}'}), 500

if __name__ == '__main__':
    # Start the Flask development server
    app.run(debug=True, port=5000)