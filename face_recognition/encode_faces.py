import face_recognition
import os
import pickle

known_encodings = {}
path = "known_faces"

for file in os.listdir(path):
    image = face_recognition.load_image_file(f"{path}/{file}")
    enc = face_recognition.face_encodings(image)[0]
    rollno = file.split(".")[0]
    known_encodings[rollno] = enc

with open("encodings.pkl", "wb") as f:
    pickle.dump(known_encodings, f)

print("Encodings saved")
