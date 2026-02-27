from processor import extract_health_data
import os

# 1. Create a dummy text file to simulate a report if you don't have an image yet
# In a real scenario, you would use a photo of a blood report
print("--- Starting Sanjeevani AI Test ---")

# Replace 'test_report.jpg' with the name of an actual image in your folder
# For now, we will just check if the engine starts correctly
test_image = "backend/test_report.jpg"
if os.path.exists(test_image):
    result = extract_health_data(test_image)
    print("AI Result:", result)
else:
    print(f"Error: Please place an image named '{test_image}' in the backend folder to test.")