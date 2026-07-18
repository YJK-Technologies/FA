# face_recognition_api.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
import dlib
from ultralytics import YOLO  # YOLOv8 for better face detection
from waitress import serve  # Imported production web container engine

app = Flask(__name__)
CORS(app)

# Load YOLOv8 face detection model
yolo_face_detector = YOLO("yolov8n-face.pt")  # Download required YOLOv8 face model

# Load dlib’s face recognition model
face_rec_model = dlib.face_recognition_model_v1("dlib_face_recognition_resnet_model_v1.dat")
shape_predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

# Function to decode Base64 image
def decode_image(base64_string):
    try:
        base64_string = base64_string.split(",")[1] if "," in base64_string else base64_string
        image_data = base64.b64decode(base64_string)
        np_arr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if image is None:
            return None

        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    except Exception:
        return None

# Low-light image enhancement
def enhance_low_light(image):
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    enhanced_lab = cv2.merge((l, a, b))
    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)

# Extract face encoding using YOLOv8 & InsightFace
def get_face_encoding(image):
    # Low-light enhancement
    image = enhance_low_light(image)

    # Detect faces using YOLOv8
    yolo_results = yolo_face_detector(image)
    detections = yolo_results[0].boxes.xyxy.cpu().numpy()

    if len(detections) == 0:
        return None

    # Take the first detected face
    x1, y1, x2, y2 = map(int, detections[0])

    # Convert bounding box to dlib rectangle
    rect = dlib.rectangle(x1, y1, x2, y2)
    landmarks = shape_predictor(image, rect)
    return np.array(face_rec_model.compute_face_descriptor(image, landmarks), dtype=np.float32)


# API to encode face
@app.route("/encode", methods=["POST"])
def encode_face():
    try:
        data = request.json
        if not data or "image" not in data:
            return jsonify({"error": "Missing image property in payload"}), 400

        image = decode_image(data["image"])
        if image is None:
            return jsonify({"error": "Invalid/Corrupted image structure"}), 400

        encoding = get_face_encoding(image)
        if encoding is None:
            return jsonify({"error": "No clear face detected in the image canvas"}), 400

        return jsonify({"encoding": encoding.tolist()})
    except Exception as e:
        return jsonify({"error": f"Internal Core Processing Error: {str(e)}"}), 500

# API to recognize face
@app.route("/recognize", methods=["POST"])
def recognize_face():
    try:
        data = request.json
        if not data or "image" not in data:
            return jsonify({"error": "Missing image property in payload"}), 400

        image = decode_image(data["image"])
        if image is None:
            return jsonify({"error": "Invalid/Corrupted image structure"}), 400

        encoding = get_face_encoding(image)
        if encoding is None:
            return jsonify({"error": "Verification failed: Face profile missing from frame"}), 400

        return jsonify({"encoding": encoding.tolist()})
    except Exception as e:
        return jsonify({"error": f"Internal Core Verification Error: {str(e)}"}), 500

# API to match two face encodings
@app.route('/match', methods=['POST'])
def match_faces():
    try:
        data = request.json
        stored_encoding = np.array(data['storedEncoding'], dtype=np.float32)
        input_encoding = np.array(data['inputEncoding'], dtype=np.float32)

        if stored_encoding.shape != (128,) or input_encoding.shape != (128,):
            return jsonify({"error": "Face vector structural mismatch"}), 400

        distance = np.linalg.norm(stored_encoding - input_encoding)
        threshold = 0.45  # Lowered for better accuracy with occlusions

        return jsonify({
            "match": int(distance < threshold),
            "similarity_score": round((1 - distance).item(), 3)
        })
    except Exception as e:
        return jsonify({"error": f"Matching Matrix calculation error: {str(e)}"}), 500

# Run Flask server
if __name__ == "__main__":
    print("Launching AI Recognition Engine via Waitress Production Server (Port 5055)...")
    serve(app, host="0.0.0.0", port=5055, threads=4)
