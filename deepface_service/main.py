import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from deepface import DeepFace
import base64
import cv2
import numpy as np

app = FastAPI(title="DeepFace Microservice")

class RepresentRequest(BaseModel):
    image_base64: str
    analyze: bool = False

def base64_to_cv2(base64_string):
    # Remove prefix data:image/jpeg;base64, etc if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    
    img_bytes = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img

def extract_and_verify_face(img):
    """
    Extract a single face with built-in DeepFace anti-spoofing.
    anti_spoofing=True uses DeepFace's own model to detect fake/photo faces.
    """
    try:
        faces = DeepFace.extract_faces(
            img_path=img,
            detector_backend="mtcnn",
            enforce_detection=True,
            align=True,
            anti_spoofing=True,
        )
    except ValueError as e:
        error_msg = str(e)
        # Check if it's a missing dependency error (not actual spoofing)
        if "install" in error_msg.lower():
            print(f"[AntiSpoofing] WARNING - Dependency missing, skipping anti-spoofing: {error_msg}")
            # Fall back to extract_faces without anti-spoofing
            faces = DeepFace.extract_faces(
                img_path=img,
                detector_backend="mtcnn",
                enforce_detection=True,
                align=True,
            )
        elif "spoof" in error_msg.lower() or "fake" in error_msg.lower():
            print(f"[AntiSpoofing] REJECTED: {error_msg}")
            raise HTTPException(
                status_code=403,
                detail="Phát hiện gian lận! Hệ thống phát hiện bạn đang dùng ảnh hoặc màn hình. Vui lòng dùng khuôn mặt thật trước camera."
            )
        else:
            raise

    if len(faces) == 0:
        raise HTTPException(status_code=404, detail="Không phát hiện được khuôn mặt.")

    if len(faces) > 1:
        raise HTTPException(status_code=400, detail="Phát hiện nhiều hơn một khuôn mặt. Vui lòng chỉ để một người trong khung hình.")

    face_obj = faces[0]

    # Check anti-spoofing result
    is_real = face_obj.get("is_real")
    antispoof_score = face_obj.get("antispoof_score", 0)
    print(f"[AntiSpoofing] is_real={is_real}, score={antispoof_score:.4f}")

    if is_real is False:
        raise HTTPException(
            status_code=403,
            detail="Phát hiện gian lận! Hệ thống phát hiện bạn đang dùng ảnh hoặc màn hình. Vui lòng dùng khuôn mặt thật trước camera."
        )

    # Check face size
    facial_area = face_obj.get("facial_area", {})
    face_width = facial_area.get("w", 0)
    face_height = facial_area.get("h", 0)

    if face_width < 80 or face_height < 80:
        raise HTTPException(status_code=400, detail="Khuôn mặt quá nhỏ hoặc quá xa camera. Vui lòng tiến gần hơn.")

    face_tensor = face_obj["face"]
    # DeepFace 0.0.86 returns normalized tensor; keep compatibility with both 3D and 4D outputs.
    if isinstance(face_tensor, np.ndarray) and face_tensor.ndim == 4:
        face_tensor = face_tensor[0]
    face_bgr = np.clip(face_tensor * 255, 0, 255).astype("uint8")

    return face_bgr

@app.post("/represent")
async def represent(request: RepresentRequest):
    try:
        if not request.image_base64:
            raise HTTPException(status_code=400, detail="Missing image_base64 parameter")

        # Decode image
        img = base64_to_cv2(request.image_base64)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid base64 image")

        # Extract face with anti-spoofing check
        face_bgr = extract_and_verify_face(img)

        objs = DeepFace.represent(
            img_path=face_bgr,
            model_name="Facenet512", 
            enforce_detection=True,
            detector_backend="skip"
        )
        
        # DeepFace represent returns a list of dictionaries. We only take the first detected face.
        if len(objs) > 0:
            embedding = objs[0]["embedding"]
            result = {"embedding": embedding}
            
            if request.analyze:
                try:
                    # Analyze emotions only (to speed up check-in)
                    ana_objs = DeepFace.analyze(
                        img_path=face_bgr,
                        actions=['emotion'], 
                        enforce_detection=True,
                        detector_backend="skip",
                        silent=True
                    )
                    if len(ana_objs) > 0:
                        ana = ana_objs[0]
                        result["emotion"] = ana.get("dominant_emotion")
                        result["age"] = ana.get("age")
                        
                        # Handle gender which can be a dict or string
                        gender_obj = ana.get("gender", {})
                        if isinstance(gender_obj, dict):
                            result["gender"] = max(gender_obj, key=gender_obj.get) if gender_obj else ana.get("dominant_gender")
                        else:
                            result["gender"] = gender_obj
                except Exception as ana_err:
                    print("Analyze error:", ana_err)
                    pass # ignore if analyze fails, return embedding anyway

            return result
        else:
            raise HTTPException(status_code=404, detail="No face detected")
            
    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        if "spoof" in error_msg.lower() or "fake" in error_msg.lower():
            raise HTTPException(status_code=403, detail="Phát hiện gian lận! Vui lòng dùng khuôn mặt thật trước camera.")
        raise HTTPException(status_code=404, detail=f"Không phát hiện được khuôn mặt hợp lệ: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Start on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
