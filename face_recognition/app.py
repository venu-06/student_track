import base64
import os
import sqlite3
from threading import Lock

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("FACE_CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})
app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("FACE_MAX_CONTENT_LENGTH", 4 * 1024 * 1024))

DB_PATH = os.path.join(os.path.dirname(__file__), "face_attendance.db")
REGISTERED_FACES_DIR = os.path.join(os.path.dirname(__file__), "registered_faces")
os.makedirs(REGISTERED_FACES_DIR, exist_ok=True)

recognizer = cv2.face.LBPHFaceRecognizer_create()
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
user_map = {}
train_lock = Lock()
predict_lock = Lock()
MAX_IMAGE_BYTES = int(os.environ.get("FACE_MAX_IMAGE_BYTES", 2 * 1024 * 1024))


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def base64_to_cv2(base64_string):
    if not base64_string:
        return None
    if base64_string.startswith("data:image"):
        base64_string = base64_string.split(",", 1)[1]
    try:
        img_data = base64.b64decode(base64_string)
    except Exception:
        return None

    if len(img_data) > MAX_IMAGE_BYTES:
        return None

    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def sanitize_username(username):
    return "".join(ch for ch in username if ch.isalnum() or ch in ("-", "_")).strip()


def detect_single_face(gray_image):
    faces = face_cascade.detectMultiScale(gray_image, scaleFactor=1.3, minNeighbors=5)
    if len(faces) == 0:
        return None, "No face found in image. Please try again."
    if len(faces) > 1:
        return None, "Multiple faces detected. Please ensure only one face is visible."

    x, y, w, h = faces[0]
    face_crop = gray_image[y:y + h, x:x + w]
    if face_crop.size == 0:
        return None, "Detected face is invalid. Please try again."

    face_crop = cv2.resize(face_crop, (200, 200))
    return face_crop, None


def normalize_face(face_image):
    normalized = cv2.equalizeHist(face_image)
    normalized = cv2.GaussianBlur(normalized, (5, 5), 0)
    return normalized


def calculate_face_metrics(registered_img, candidate_img):
    lbph = cv2.face.LBPHFaceRecognizer_create()
    lbph.train([registered_img], np.array([1]))
    _, confidence = lbph.predict(candidate_img)

    registered_hist = cv2.calcHist([registered_img], [0], None, [256], [0, 256])
    candidate_hist = cv2.calcHist([candidate_img], [0], None, [256], [0, 256])
    cv2.normalize(registered_hist, registered_hist)
    cv2.normalize(candidate_hist, candidate_hist)
    histogram_score = cv2.compareHist(registered_hist, candidate_hist, cv2.HISTCMP_CORREL)

    mean_abs_diff = float(np.mean(cv2.absdiff(registered_img, candidate_img)))
    return {
        "confidence": float(confidence),
        "histogram_score": float(histogram_score),
        "mean_abs_diff": mean_abs_diff
    }


def is_face_match(metrics):
    strong_match = (
        metrics["confidence"] <= 58.0
        and metrics["mean_abs_diff"] <= 48.0
    )

    normal_match = (
        metrics["confidence"] <= 78.0
        and metrics["mean_abs_diff"] <= 62.0
        and metrics["histogram_score"] >= 0.02
    )

    return strong_match or normal_match


def store_registered_face(username, face_crop):
    success, buffer = cv2.imencode(".jpg", face_crop)
    if not success:
        raise ValueError("Could not encode the detected face.")

    face_blob = buffer.tobytes()
    safe_username = sanitize_username(username)
    if not safe_username:
        raise ValueError("Invalid username for face storage.")

    file_path = os.path.join(REGISTERED_FACES_DIR, f"{safe_username}.jpg")
    with open(file_path, "wb") as face_file:
        face_file.write(face_blob)

    conn = get_db()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO Users (username, encoding) VALUES (?, ?)",
            (username, face_blob)
        )
        conn.commit()
    except sqlite3.Error:
        conn.rollback()
        raise
    finally:
        conn.close()

    return file_path


def load_registered_face(username):
    conn = get_db()
    try:
        user = conn.execute("SELECT encoding FROM Users WHERE username = ?", (username,)).fetchone()
    finally:
        conn.close()

    if user and user["encoding"]:
        nparr = np.frombuffer(user["encoding"], np.uint8)
        registered_img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if registered_img is not None:
            return registered_img

    safe_username = sanitize_username(username)
    if safe_username:
        file_path = os.path.join(REGISTERED_FACES_DIR, f"{safe_username}.jpg")
        if os.path.exists(file_path):
            return cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)

    return None


def train_recognizer():
    with train_lock:
        conn = get_db()
        users = conn.execute("SELECT rowid, username, encoding FROM Users WHERE encoding IS NOT NULL").fetchall()
        conn.close()

        if not users:
            return

        faces = []
        ids = []
        global user_map
        user_map.clear()

        for user in users:
            nparr = np.frombuffer(user["encoding"], np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue

            faces.append(img)
            ids.append(user["rowid"])
            user_map[user["rowid"]] = user["username"]

        if faces and ids:
            recognizer.train(faces, np.array(ids))


try:
    train_recognizer()
except Exception as e:
    print("Initial face model training skipped:", e)


@app.route("/register-face", methods=["POST"])
def register_face():
    data = request.json or {}
    username = sanitize_username(data.get("username", ""))
    base64_image = data.get("image")

    if not username or not base64_image:
        return jsonify({"success": False, "error": "Missing data"}), 400

    img = base64_to_cv2(base64_image)
    if img is None:
        return jsonify({"success": False, "error": "Could not decode image."}), 400

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_crop, error = detect_single_face(gray)
    if error:
        return jsonify({"success": False, "error": error}), 400

    try:
        stored_face_path = store_registered_face(username, normalize_face(face_crop))
    except sqlite3.Error as e:
        return jsonify({"success": False, "error": f"Database error: {e}"}), 500
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    train_recognizer()
    return jsonify({
        "success": True,
        "message": f"Face registered successfully for {username}",
        "storedFacePath": stored_face_path
    }), 200


@app.route("/face-status/<username>", methods=["GET"])
def face_status(username):
    return jsonify({"success": True, "registered": load_registered_face(sanitize_username(username)) is not None}), 200


@app.route("/mark-attendance", methods=["POST"])
def mark_attendance():
    data = request.json or {}
    username = sanitize_username(data.get("username", ""))
    base64_image = data.get("image")

    if not username or not base64_image:
        return jsonify({"match": False, "error": "Missing data"}), 400

    img = base64_to_cv2(base64_image)
    if img is None:
        return jsonify({"match": False, "error": "Could not decode image."}), 400

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_crop, error = detect_single_face(gray)
    if error:
        return jsonify({"match": False, "error": error}), 200

    try:
        registered_img = load_registered_face(username)
        if registered_img is None:
            return jsonify({"match": False, "error": "This user has not registered a face yet."}), 400

        registered_img = normalize_face(registered_img)
        candidate_img = normalize_face(face_crop)
        with predict_lock:
            metrics = calculate_face_metrics(registered_img, candidate_img)

        is_match = is_face_match(metrics)

        if is_match:
            print(
                "Face Match SUCCESS:",
                username,
                f"(LBPH: {metrics['confidence']:.2f}, Hist: {metrics['histogram_score']:.3f}, Diff: {metrics['mean_abs_diff']:.2f})"
            )
            return jsonify({"match": True, "message": "Face verified", "username": username, "proof": base64_image})

        print(
            "Face Match FAILED:",
            username,
            f"(LBPH: {metrics['confidence']:.2f}, Hist: {metrics['histogram_score']:.3f}, Diff: {metrics['mean_abs_diff']:.2f})"
        )
        return jsonify({
            "match": False,
            "error": "Incorrect face detected. Please try again with the registered face."
        })
    except cv2.error as e:
        return jsonify({"match": False, "error": f"Verification model error. (CV2 Error: {e})"})
    except Exception as e:
        return jsonify({"match": False, "error": f"An unexpected error occurred: {e}"})


if __name__ == "__main__":
    app.run(
        host=os.environ.get("FACE_HOST", "127.0.0.1"),
        port=int(os.environ.get("FACE_PORT", 8000)),
        debug=os.environ.get("FACE_DEBUG", "false").lower() == "true"
    )
