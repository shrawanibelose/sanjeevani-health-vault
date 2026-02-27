from flask import Flask, request, jsonify
from flask_cors import CORS
from processor import extract_health_data
import os

app = Flask(__name__)
CORS(app) # Allows React (Port 3000) to talk to Flask (Port 5000)

@app.route('/process-report', methods=['POST'])
def process_report():
    try:
        # 1. Check if a file was sent
        if 'file' not in request.files:
            return jsonify({"status": "Error", "message": "No file uploaded"}), 400
        
        file = request.files['file']
        
        # 2. Save the file temporarily to 'read' it
        # Ensure the 'temp' folder exists or just save in backend
        temp_path = os.path.join("backend", "temp_report.jpg")
        file.save(temp_path)

        # 3. Run the AI OCR logic
        result = extract_health_data(temp_path)

        # 4. Return the result to the Frontend
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

if __name__ == '__main__':
    # Running on port 5000 is standard for Flask
    app.run(port=5000, debug=True)