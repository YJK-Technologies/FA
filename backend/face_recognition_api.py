from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
import dlib
import insightface
from insightface.app import FaceAnalysis
from ultralytics import YOLO  # YOLOv8 for better face detection

app = Flask(__name__)
CORS(app)

# Load YOLOv8 face detection model
yolo_face_detector = YOLO("yolov8n-face.pt")  # Download required YOLOv8 face model

# Load InsightFace for face recognition
face_app = FaceAnalysis(name="buffalo_l")
face_app.prepare(ctx_id=-1)

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
            raise ValueError("Invalid image data")

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return image
    except Exception as e:
        print("Error decoding image:", str(e))
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
    try:
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
        encoding = np.array(face_rec_model.compute_face_descriptor(image, landmarks), dtype=np.float32)

        return encoding
    except Exception as e:
        print("Error extracting face encoding:", str(e))
        return None

# API to encode face
@app.route("/encode", methods=["POST"])
def encode_face():
    try:
        data = request.json
        image = decode_image(data["image"])
        if image is None:
            return jsonify({"error": "Invalid image data"}), 400

        encoding = get_face_encoding(image)
        if encoding is None:
            return jsonify({"error": "No face detected"}), 400

        return jsonify({"encoding": encoding.tolist()})
    except Exception as e:
        print("Error in encoding:", str(e))
        return jsonify({"error": f"Encoding error: {str(e)}"}), 500

# API to recognize face
@app.route("/recognize", methods=["POST"])
def recognize_face():
    try:
        data = request.json
        image = decode_image(data["image"])
        if image is None:
            return jsonify({"error": "Invalid image data"}), 400

        encoding = get_face_encoding(image)
        if encoding is None:
            return jsonify({"error": "No face detected"}), 400

        return jsonify({"encoding": encoding.tolist()})
    except Exception as e:
        print("Error in recognition:", str(e))
        return jsonify({"error": f"Recognition error: {str(e)}"}), 500

# API to match two face encodings
@app.route('/match', methods=['POST'])
def match_faces():
    try:
        data = request.json
        stored_encoding = np.array(data['storedEncoding'], dtype=np.float32)
        input_encoding = np.array(data['inputEncoding'], dtype=np.float32)

        if stored_encoding.shape != (128,) or input_encoding.shape != (128,):
            return jsonify({"error": "Invalid encoding format"}), 400

        distance = np.linalg.norm(stored_encoding - input_encoding)
        threshold = 0.45  # Lowered for better accuracy with occlusions

        return jsonify({
            "match": int(distance < threshold),
            "similarity_score": round((1 - distance).item(), 3)
        })
    except Exception as e:
        print("Error in face matching:", str(e))
        return jsonify({"error": "Internal server error"}), 500

# Run Flask server
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
