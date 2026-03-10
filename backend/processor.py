from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client
import os
app = Flask(__name__)
CORS(app) 
url = "https://tuwalmwezlrwfmnmntdm.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc2MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM5MTYzOTY5LCJleHAiOjIwNTQ3Mzk5Njl9.InJlZ2InR1d2FsbXdlemxyd2Ztbm1udGRt"
supabase = create_client(url, key)

@app.route('/process-report', methods=['POST'])
def process_report():
    try:
        data = request.json
        image_url = data.get('image_url')
        user_id = data.get('user_id')
        category = "General Report"
        if "mri" in image_url.lower(): category = "MRI Scan"
        elif "blood" in image_url.lower(): category = "Blood Test"
        elif "xray" in image_url.lower(): category = "X-Ray"
        result = supabase.table("reports").insert({
            "user_id": user_id,
            "file_url": image_url,
            "category": category
        }).execute()

        return jsonify({
            "status": "success",
            "category": category,
            "data": result.data
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)