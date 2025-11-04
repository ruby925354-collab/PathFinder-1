# main.py
# Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

import os
import time
import smtplib
from fastapi import requests
import joblib
import json
import logging
import requests
import traceback
import numpy as np
import pandas as pd
from random import randint
from email.mime.text import MIMEText
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from pydantic import BaseModel, EmailStr
from passlib.hash import bcrypt
from dotenv import load_dotenv
from collections import Counter
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.neighbors import KNeighborsClassifier
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from typing import List
import threading
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends
from fastapi import Query
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from typing import List
import random
from datetime import datetime, timedelta
from typing import Any, Dict
from collections import defaultdict
from routes import personality
from database import get_db_connection
import mysql.connector
from mysql.connector import pooling
from routes import scholastic
from routes import knowledge
from routes import feedback
from fastapi.middleware.cors import CORSMiddleware

# ---------- FastAPI ----------
app = FastAPI()

# include routes

logger = logging.getLogger(__name__)

# ---------- OAuth2 Scheme ----------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# ---------- JWT Config ----------
# In production, use a strong secret key and keep it safe!
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Load environment variables
load_dotenv()

# ---------- Config ----------

# ---------- SMTP / OTP settings ----------
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "hyouka309@gmail.com"
SENDER_PASS = "rhav bkow gzjd spuu"  # Use your Gmail App Password, not actual Gmail password
OTP_EXPIRY_SECONDS = 300  # 5 minutes
OTP_RESEND_COOLDOWN = 30  # 30 seconds

# Email (SMTP) settings
# SENDER_EMAIL = os.getenv("SENDER_EMAIL")
# SENDER_PASS = os.getenv("SENDER_PASS")
# SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
# SMTP_PORT = int(os.getenv("SMTP_PORT", 587))

# OTP settings
OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", 300))  # 5 minutes
OTP_RESEND_COOLDOWN = int(os.getenv("OTP_RESEND_COOLDOWN", 30))  # 30 seconds

# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://path-finder-finals.vercel.app"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personality.router)
app.include_router(scholastic.router)
app.include_router(knowledge.router)
app.include_router(feedback.router)

# ---------- Pydantic models ----------
class RegisterRequest(BaseModel):
    firstName: str
    middleName: str | None = None
    lastName: str
    username: str
    email: EmailStr
    password: str

# Pydantic model for request body
class PersonalityAnswer(BaseModel):
    user_id: int
    personality_id: int
    answer: str


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendOTPRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PersonalityRequest(BaseModel):
    answers: List[float]

# Request and verify schemas
class RequestPasswordReset(BaseModel):
    email: EmailStr

class VerifyResetOTP(BaseModel):
    email: EmailStr
    otp: str

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class ResendPasswordResetOTPRequest(BaseModel):
    email: EmailStr

# ---------- OTP store (in-memory) ----------
# Structure:
# otp_store[email] = {
#   "otp": "123456",
#   "data": {...registration data...},
#   "timestamp": float(when sent),
#   "last_sent": float(when last sent)
# }
otp_store: dict = {}



# ---------- Training & models (kept as in your original file, with safe loader) ----------
MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)
SVM_MODEL_PATH = os.path.join(MODEL_DIR, "svm_model.pkl")
KNN_MODEL_PATH = os.path.join(MODEL_DIR, "knn_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")


from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def custom_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )
# ---------------- REGISTERED USERS ----------------
@app.get("/api/registered-users")
def get_registered_users():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # Fetch all users
            cursor.execute("SELECT * FROM user_information")
            users = cursor.fetchall() or []

            results = []
            for user in users:
                user_id = user["user_id"]

                # 🧠 Get personality type with highest total answer count
                cursor.execute("""
                    SELECT p.personality_type,
                           COALESCE(SUM(upt.answer), 0) AS total_score
                    FROM user_personality_test upt
                    JOIN personality_test pt ON upt.personality_test_id = pt.personality_test_id
                    JOIN personality p ON pt.personality_id = p.personality_id
                    WHERE upt.user_id = %s
                    GROUP BY p.personality_type
                    ORDER BY total_score DESC
                    LIMIT 1
                """, (user_id,))
                personality = cursor.fetchone()

                # 🎓 Get knowledge strand and top-performing subject (from user_scholastic_knowledge_test)
                cursor.execute("""
                    SELECT 
                        strand,
                        Mathematics, English, Science, Filipino, Reading_Comprehension,
                        Logical_Reasoning, Technology, Engineering, Accountancy, Business,
                        Management, Humanities, Social_Science
                    FROM user_scholastic_knowledge_test
                    WHERE user_id = %s
                    LIMIT 1
                """, (user_id,))
                knowledge_row = cursor.fetchone()

                top_subject = None
                top_score = None
                strand = None

                if knowledge_row:
                    strand = knowledge_row["strand"]
                    # Remove non-subject fields for analysis
                    scores = {k: v for k, v in knowledge_row.items() if k not in ["user_sk_id", "user_id", "strand"] and v is not None}

                    if scores:
                        # Get top-performing subject
                        top_subject = max(scores, key=scores.get)
                        top_score = scores[top_subject] * 100  # Convert to percentage

                results.append({
                    "user_id": user.get("user_id"),
                    "email": user.get("email"),
                    "username": user.get("username"),
                    "first_name": user.get("first_name"),
                    "middle_name": user.get("middle_name"),
                    "last_name": user.get("last_name"),
                    "extension": user.get("extension"),
                    "personality_type": personality["personality_type"] if personality else "N/A",
                    "strand": strand if strand else "N/A",
                    "top_subject": top_subject if top_subject else "N/A",
                    "top_subject_percentage": f"{top_score:.2f}%" if top_score else "N/A",
                })

            return results

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch registered users: {str(e)}")




@app.post("/api/request-password-reset")
def request_password_reset(req: RequestPasswordReset):
    # Check if email exists in DB
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id FROM access_information WHERE email=%s", (req.email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    otp = f"{randint(100000, 999999):06d}"
    now = time.time()
    otp_store[req.email] = {
        "otp": otp,
        "timestamp": now,
        "last_sent": now
    }
    # Send OTP via enhanced HTML email
    send_otp_via_email(req.email, otp, purpose="reset")

    return {"success": True, "message": "OTP sent to your email"}

@app.post("/api/verify-reset-otp")
def verify_reset_otp(req: VerifyResetOTP):
    entry = otp_store.get(req.email)
    if not entry:
        raise HTTPException(status_code=400, detail="No OTP request found")
    if is_otp_expired_entry(entry):
        otp_store.pop(req.email, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one")
    if entry["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    return {"success": True, "message": "OTP verified"}

@app.post("/api/reset-password")
def reset_password(req: ResetPassword):
    print("Incoming request:", req)
    print("OTP store contents:", otp_store)

    entry = otp_store.get(req.email)
    if not entry:
        raise HTTPException(status_code=400, detail="No OTP request found")

    print("OTP entry:", entry)
    if is_otp_expired_entry(entry):
        otp_store.pop(req.email, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one")

    if entry["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    print("OTP verified, hashing password...")
    print("req.email:", req.email)
    print("req.otp:", req.otp)
    print("req.new_password:", req.new_password)

    # Hash new password
    hashed_password = bcrypt.hash(req.new_password)
    print("Hashed password:", hashed_password)

    # Update DB using parameterized queries
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT access_id FROM access_information WHERE email=%s",
        (req.email,)
    )
    access_id_row = cursor.fetchone()
    print("Access ID row:", access_id_row)
    if not access_id_row:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    access_id = access_id_row[0]  # extract the actual value from tuple

    cursor.execute(
        "UPDATE access_information SET _password=%s, last_updated_timestamp=NOW() WHERE access_id=%s",
        (hashed_password, access_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

    # Remove OTP after success
    otp_store.pop(req.email, None)

    return {"success": True, "message": "Password changed successfully"}

@app.post("/api/resend-password-reset-otp")
def resend_password_reset_otp(req: ResendPasswordResetOTPRequest):
    email = req.email
    entry = otp_store.get(email)

    if not entry:
        raise HTTPException(status_code=400, detail="No OTP request found. Please request a password reset first.")

    if is_otp_expired_entry(entry):
        otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new password reset.")

    now = time.time()
    last_sent = entry.get("last_sent", entry.get("timestamp", 0))
    elapsed = now - last_sent
    if elapsed < OTP_RESEND_COOLDOWN:
        wait = int(OTP_RESEND_COOLDOWN - elapsed)
        raise HTTPException(status_code=429, detail=f"Please wait {wait}s before resending OTP.")

    # Generate a new OTP
    otp = f"{randint(100000, 999999):06d}"
    entry["otp"] = otp
    entry["timestamp"] = now
    entry["last_sent"] = now

    # Send OTP via email
    send_otp_via_email(email, otp, purpose="reset")

    return {"success": True, "message": "OTP resent to your email"}

# ---------- Utility: send OTP ----------
def send_otp_via_email(email: str, otp: str, purpose: str, fullname: str | None = None):
    """
    Sends OTP by SMTP and personalizes email for password reset or registration.
    """
    conn = get_db_connection()
    if purpose == "reset":
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT first_name, middle_name, last_name, extension
                FROM user_information
                WHERE email = %s
            """, (email,))
            user = cursor.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            full_name = f"{user['first_name']} " \
                        f"{user['middle_name']+' ' if user['middle_name'] else ''}" \
                        f"{user['last_name'] or ''}" \
                        f"{' '+user['extension'] if user['extension'] else ''}".strip()

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")
    else:
        full_name = fullname if fullname else "User"
    # Dynamic subject based on purpose
    if purpose == "register":
        subject = "Complete your registration - Pathfinder"
    else:  # reset
        subject = "Reset your password - Pathfinder"

    html_content = get_otp_email_html(otp, full_name, purpose)
    msg = MIMEText(html_content, "html")
    msg["Subject"] = subject
    msg["From"] = SENDER_EMAIL if SENDER_EMAIL else "no-reply@example.com"
    msg["To"] = email

    if not SENDER_EMAIL or not SENDER_PASS:
        logger.warning("SENDER_EMAIL/SENDER_PASS not configured — printing OTP to logs for local testing.")
        logger.info("OTP for %s is: %s", email, otp)
        return

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASS)
            server.sendmail(SENDER_EMAIL, [email], msg.as_string())
        logger.info("Sent OTP email to %s", email)
    except Exception as e:
        logger.exception("Failed to send OTP email")
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {e}")

def get_otp_email_html(otp: str, full_name: str, purpose: str) -> str:
    current_date = datetime.now().strftime("%d %b, %Y")
    current_year = datetime.now().year
  
    # Dynamic main message
    if purpose == "register":
        main_message = f"""
        Welcome {full_name},<br/>
        Thank you for registering with PathFinder.<br/>
        Use the following One-Time Password (OTP) to complete your account setup.<br/>
        This code is valid for <span style="font-weight: 600; color: #8B4513;">5 minutes</span>.
        """
    else:
        main_message = f"""
        Hello {full_name},<br/>
        We received a request to <strong>reset your password</strong>.<br/>
        Use the following One-Time Password (OTP) to proceed.<br/>
        This code is valid for <span style="font-weight: 600; color: #8B4513;">5 minutes</span>.
        """

    return f"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PathFinder OTP</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>
          /* Mobile-friendly adjustments */
          @media only screen and (max-width: 600px) {{
              .container {{
                  padding: 20px !important;
                  margin: 20px !important;
              }}
              .otp-box {{
                  font-size: 28px !important;
                  padding: 15px 20px !important;
                  letter-spacing: 8px !important;
              }}
          }}
        </style>
      </head>
      <body style="
          margin: 0;
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #6f4e37, #c0a080, #4b3621, #d2b48c);
          font-size: 16px;
          color: #333333;
          -webkit-text-size-adjust: none;
      ">
        <div class="container" style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 14px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            overflow: hidden;
            padding: 30px;
        ">
          <!-- Header -->
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee;">
            <img
              src="https://raw.githubusercontent.com/Hyouka39/PathFinder/main/public/PATHFINDER-logo-edited.png"
              alt="PathFinder Logo"
              height="80"
              style="display:block; margin:0 auto;"
            />
            <p style="margin: 10px 0 0; font-size: 13px; color: #777;">{current_date}</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px 0; text-align: center;">
            <p style="margin-top: 0; font-size: 16px; color: #444; line-height: 1.6;">
              {main_message}
            </p>

            <!-- OTP Box -->
            <div class="otp-box" style="
                margin: 25px auto;
                font-size: 36px;
                font-weight: 700;
                letter-spacing: 12px;
                color: #6f4e37;
                background: linear-gradient(145deg, #f3e5d0, #fff5e6, #f3e5d0);
                padding: 18px 30px;
                border-radius: 12px;
                display: inline-block;
                box-shadow: inset 0 4px 8px rgba(255,255,255,0.5),
                            0 6px 16px rgba(0,0,0,0.15);
                text-shadow: 1px 1px 2px rgba(255,255,255,0.6),
                             -1px -1px 2px rgba(0,0,0,0.2);
            ">
                {otp}
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #888;">
              Do not share this code with anyone, not even PathFinder staff.
            </p>
          </div>

          <!-- Help Section -->
          <div style="padding: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Need help? Contact us at
              <a href="mailto:pathfinder@example.com" style="color: #8B4513; text-decoration: none;">
                pathfinder@example.com
              </a>
              or visit our
              <a href="#" target="_blank" style="color: #8B4513; text-decoration: none;">
                Help Center
              </a>.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee;">
            <p style="margin: 0; font-weight: 600; color: #333;">PathFinder</p>
            <p style="margin: 5px 0 0;">Your trusted guide to success.</p>
            <p style="margin: 5px 0 0;">© {current_year} PathFinder. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    """

def safe_load_model(path, description):
    try:
        if not os.path.exists(path):
            logger.info(f"{description} not found at {path}")
            return None
        model = joblib.load(path)
        logger.info(f"Loaded {description} from {path}")
        return model
    except Exception as e:
        logger.warning(f"Could not load {description}: {e}")
        return None


def fetch_training_data():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT 
            dt.*, 
            kdt.Mathematics,
            kdt.English,
            kdt.Filipino,
            kdt.Science,
            kdt.Reading_Comprehension,
            kdt.Logical_Reasoning,
            kdt.Technology,
            kdt.Engineering,
            kdt.Accountancy,
            kdt.Business,
            kdt.Management,
            kdt.Humanities,
            kdt.Social_Science
        FROM data_ dt
        LEFT JOIN knowledge_data kdt 
            ON dt.program = kdt.program
        WHERE dt.program IN ('BSIT', 'BSA', 'BSHM', 'BSFM', 'BSBA-MM', 'BSE', 'BSMM')
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        return rows or []
    except Exception:
        logger.exception("Failed to fetch training data")
        return []
    finally:
        if conn:
            conn.close()


def train_and_save_models():
    data = fetch_training_data()
    if not data:
        logger.warning("No training data found in database.")
        return None, None, None, None
    try:
        df = pd.DataFrame(data)
    except Exception:
        logger.exception("Failed to construct training DataFrame")
        return None, None, None, None

    class_counts = df["program"].value_counts()
    rare_classes = class_counts[class_counts < 2].index
    if len(rare_classes) > 0:
        logger.warning("Removing classes with fewer than 2 samples: %s", list(rare_classes))
        df = df[~df["program"].isin(rare_classes)]

    label_encoder = LabelEncoder()
    try:
        df["program"] = label_encoder.fit_transform(df["program"])
    except Exception:
        logger.exception("Label encoding failed")
        return None, None, None, None

    x = df.drop(columns=["program", "strand"])
    y = df["program"]

    scaler = StandardScaler()
    try:
        X = scaler.fit_transform(x)
    except Exception:
        logger.exception("Scaler fit_transform failed")
        return None, None, None, None

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except Exception:
        logger.exception("Stratified split failed; trying without stratify")
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    class_counts_train = Counter(y_train)
    min_class_size = min(class_counts_train.values())
    safe_cv = max(2, min(5, min_class_size))
    logger.info("Using cv=%s for calibration (min class size=%s)", safe_cv, min_class_size)

    try:
        base_svm = SVC(kernel="rbf", C=1.0, gamma="scale", probability=True)
        svm_model = CalibratedClassifierCV(base_svm, cv=safe_cv)
        svm_model.fit(X_train, y_train)
    except Exception:
        logger.exception("Failed to train SVM")
        return None, None, None, None

    try:
        knn_model = KNeighborsClassifier(n_neighbors=4, metric='euclidean', weights='distance')
        knn_model.fit(X_train, y_train)
    except Exception:
        logger.exception("Failed to train KNN")
        return None, None, None, None

    try:
        joblib.dump(svm_model, SVM_MODEL_PATH)
        joblib.dump(knn_model, KNN_MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        joblib.dump(label_encoder, ENCODER_PATH)
        logger.info("Saved trained models and preprocessing objects to disk.")
    except Exception:
        logger.exception("Failed to save models to disk")

    return svm_model, knn_model, scaler, label_encoder


# Initialize models (non-blocking)
svm_model = safe_load_model(SVM_MODEL_PATH, "SVM")
knn_model = safe_load_model(KNN_MODEL_PATH, "KNN")
scaler = safe_load_model(SCALER_PATH, "Scaler")
label_encoder = safe_load_model(ENCODER_PATH, "Label Encoder")

if not all([svm_model, knn_model, scaler, label_encoder]):
    logger.info("Pretrained models not available or incomplete. Attempting training in background thread.")


    # Launch training asynchronously so API can still serve OTP/login etc.
    def train_bg():
        global svm_model, knn_model, scaler, label_encoder
        try:
            svm_model, knn_model, scaler, label_encoder = train_and_save_models()
        except Exception:
            logger.exception("Background training failed")


    threading.Thread(target=train_bg, daemon=True).start()


# ---------- fuzzy system ----------
def build_fuzzy_weight_system():
    svm_conf = ctrl.Antecedent(np.arange(0, 1.01, 0.01), 'svm_conf')
    knn_conf = ctrl.Antecedent(np.arange(0, 1.01, 0.01), 'knn_conf')
    agree = ctrl.Antecedent(np.arange(0, 2.01, 0.01), 'agree')  # finer resolution
    w_svm = ctrl.Consequent(np.arange(0, 1.01, 0.01), 'w_svm')

    svm_conf['low'] = fuzz.trimf(svm_conf.universe, [0.0, 0.0, 0.6])
    svm_conf['high'] = fuzz.trimf(svm_conf.universe, [0.7, 1.0, 1.0])
    knn_conf['low'] = fuzz.trimf(knn_conf.universe, [0.0, 0.0, 0.6])
    knn_conf['high'] = fuzz.trimf(knn_conf.universe, [0.7, 1.0, 1.0])

    agree['no'] = fuzz.trimf(agree.universe, [0, 0, 1])
    agree['yes'] = fuzz.trimf(agree.universe, [0, 1, 1])

    w_svm['low'] = fuzz.trimf(w_svm.universe, [0.0, 0.0, 0.4])
    w_svm['mid'] = fuzz.trimf(w_svm.universe, [0.3, 0.5, 0.7])
    w_svm['high'] = fuzz.trimf(w_svm.universe, [0.6, 1.0, 1.0])

    rules = [
        ctrl.Rule(agree['yes'] & svm_conf['high'] & knn_conf['high'], w_svm['mid']),
        ctrl.Rule(agree['no'] & svm_conf['high'] & knn_conf['low'], w_svm['high']),
        ctrl.Rule(agree['yes'] & svm_conf['high'] & knn_conf['low'], w_svm['high']),
        ctrl.Rule(agree['no'] & svm_conf['low'] & knn_conf['high'], w_svm['low']),
        ctrl.Rule(agree['yes'] & svm_conf['low'] & knn_conf['high'], w_svm['low']),
        ctrl.Rule(svm_conf['low'] & knn_conf['low'], w_svm['mid']),
        ctrl.Rule(agree['no'] & svm_conf['high'] & knn_conf['high'], w_svm['mid']),
    ]
    return ctrl.ControlSystem(rules)


FUZZY_WEIGHT_SYSTEM = build_fuzzy_weight_system()


def compute_w_svm(svm_conf: float, knn_conf: float, agree_flag: int) -> float:
    sim = ctrl.ControlSystemSimulation(FUZZY_WEIGHT_SYSTEM)
    sim.input['svm_conf'] = float(np.clip(svm_conf, 0.0, 1.0))
    sim.input['knn_conf'] = float(np.clip(knn_conf, 0.0, 1.0))
    sim.input['agree'] = int(agree_flag)
    sim.compute()
    return float(sim.output['w_svm'])


def top_k_from_probs(probs: np.ndarray, k: int = 3):
    idx_sorted = np.argsort(probs)[::-1][:k]
    return [(int(i), float(probs[i])) for i in idx_sorted]


# ---------- Prediction endpoint ----------
@app.post("/predict/{user_id}")
def predict_personality(user_id: int):
    start = time.time()

    if not all([svm_model, knn_model, scaler, label_encoder]):
        raise HTTPException(status_code=503, detail="Models not ready. Try again later.")

    try:
        print(f"[INFO] Starting prediction for user_id={user_id}")

        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # ---------- STEP 0: Check if user already has test_result ----------
            cursor.execute("""
                SELECT tr.*, pi.program_name
                FROM test_result tr
                LEFT JOIN program_information pi ON tr.program_id = pi.program_id
                WHERE tr.user_id = %s
                AND tr.program_id IS NOT NULL
            """, (user_id,))
            existing_results = cursor.fetchall()

        if existing_results:
            recorded_programs = [row["program_name"] for row in existing_results if row["program_name"]]
            if recorded_programs:
                print(f"[INFO] Existing programs found for user {user_id}: {recorded_programs}")
                return {
                    "user_id": user_id,
                    "already_recorded": True,
                    "recorded_programs": recorded_programs,
                    "message": "User already has recorded recommended programs.",
                    "final_top3": [{"label": p, "probability": 100/len(recorded_programs)} for p in recorded_programs],
                    "top1": recorded_programs[0] if recorded_programs else None,
                    "top2": recorded_programs[1] if len(recorded_programs) > 1 else None,
                    "top3": recorded_programs[2] if len(recorded_programs) > 2 else None,
                }

        # ---------- STEP 1: Fetch Personality Test Answers ----------
        print("[INFO] Fetching personality test answers...")
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT answer
                FROM user_personality_test
                WHERE user_id = %s
                ORDER BY personality_test_id ASC
            """, (user_id,))
            personality_answers = [row["answer"] for row in cursor.fetchall()]

        print(f"[DEBUG] Got {len(personality_answers)} personality answers")

        if len(personality_answers) != 48:
            raise HTTPException(
                status_code=400,
                detail=f"Expected 48 personality answers, got {len(personality_answers)}"
            )

        # ---------- STEP 2: Fetch Scholastic Knowledge Scores ----------
        print("[INFO] Fetching scholastic knowledge scores...")
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT Mathematics, English, Science, Filipino,
                       Reading_Comprehension, Logical_Reasoning,
                       Technology, Engineering, Accountancy, Business,
                       Management, Humanities, Social_Science
                FROM user_scholastic_knowledge_test
                WHERE user_id = %s
                LIMIT 1
            """, (user_id,))
            sk_data = cursor.fetchone()

        if not sk_data:
            raise HTTPException(
                status_code=404,
                detail="User scholastic knowledge data not found"
            )

        scholastic_scores = [float(sk_data[col]) for col in sk_data.keys()]
        print(f"[DEBUG] Scholastic scores loaded: {len(scholastic_scores)} features")

        if len(scholastic_scores) != 13:
            raise HTTPException(
                status_code=400,
                detail=f"Expected 13 scholastic scores, got {len(scholastic_scores)}"
            )

        # ---------- STEP 3: Combine features ----------
        features = np.array(personality_answers + scholastic_scores, dtype=float).reshape(1, -1)
        print(f"[DEBUG] Feature vector shape: {features.shape}")

        if features.shape[1] != 61:
            raise HTTPException(
                status_code=400,
                detail=f"Expected 61 features, got {features.shape[1]}"
            )

        # ---------- STEP 4: Scale and Predict ----------
        features_scaled = scaler.transform(features)
        svm_proba = svm_model.predict_proba(features_scaled)[0]
        knn_proba = knn_model.predict_proba(features_scaled)[0]

        svm_top3 = top_k_from_probs(svm_proba, k=3)
        knn_top3 = top_k_from_probs(knn_proba, k=3)

        svm_top3_readable = [
            {"label": label_encoder.inverse_transform([cls_idx])[0],
             "probability": round(prob * 100.0, 2)}
            for cls_idx, prob in svm_top3
        ]
        knn_top3_readable = [
            {"label": label_encoder.inverse_transform([cls_idx])[0],
             "probability": round(prob * 100.0, 2)}
            for cls_idx, prob in knn_top3
        ]

        print(f"[DEBUG] SVM Top 3: {svm_top3_readable}")
        print(f"[DEBUG] KNN Top 3: {knn_top3_readable}")

        # ---------- STEP 5: Combine SVM + KNN ----------
        svm_top1_idx, svm_top1_prob = svm_top3[0]
        knn_top1_idx, knn_top1_prob = knn_top3[0]
        agree_flag = 1 if svm_top1_idx == knn_top1_idx else 0
        w_svm = compute_w_svm(svm_top1_prob, knn_top1_prob, agree_flag)

        final_proba = w_svm * svm_proba + (1 - w_svm) * knn_proba
        if final_proba.sum() <= 0:
            final_proba = (svm_proba + knn_proba) / 2.0
        final_proba = final_proba / final_proba.sum()

        final_top3 = top_k_from_probs(final_proba, k=3)
        final_top3_readable = [
            {"label": label_encoder.inverse_transform([cls_idx])[0],
             "probability": round(prob * 100.0, 2)}
            for cls_idx, prob in final_top3
        ]

        elapsed = time.time() - start
        print(f"[INFO] Prediction completed in {elapsed:.3f}s (w_svm={w_svm:.3f})")
        print(f"[DEBUG] Final Top 3 Programs: {final_top3_readable}")

        # ---------- STEP 6: Save to DB ----------
        top1 = final_top3_readable[0]["label"] if len(final_top3_readable) > 0 else None
        top2 = final_top3_readable[1]["label"] if len(final_top3_readable) > 1 else None
        top3 = final_top3_readable[2]["label"] if len(final_top3_readable) > 2 else None

        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            program_names = [top1, top2, top3]
            program_ids = {}

            for name in program_names:
                if not name:
                    continue
                cursor.execute(
                    "SELECT program_id FROM program_information WHERE program_name = %s LIMIT 1",
                    (name,)
                )
                result = cursor.fetchone()
                if result:
                    program_ids[name] = result["program_id"]

            for name, pid in program_ids.items():
                cursor.execute("SELECT personality_id FROM test_result WHERE user_id = %s LIMIT 1", (user_id,))
                row = cursor.fetchone()
                personality_id = row["personality_id"] if row else None
                cursor.fetchall()  # ✅ ensures buffer is cleared

                cursor.execute("""
                    INSERT INTO test_result (test_result_id, personality_id, user_id, program_id)
                    VALUES (NULL, %s, %s, %s)
                """, (personality_id, user_id, pid))

            conn.commit()

        print(f"[INFO] Programs saved for user {user_id}: {program_ids}")

        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                DELETE FROM test_result 
                WHERE user_id = %s AND program_id IS NULL;
            """, (user_id,))
            conn.commit()

        print(f"[INFO] Cleanup complete for user {user_id}")

        # ---------- STEP 7: Return data for frontend ----------
        return {
            "user_id": user_id,
            "svm_top3": svm_top3_readable,
            "knn_top3": knn_top3_readable,
            "w_svm": round(w_svm, 3),
            "final_top3": final_top3_readable if final_top3_readable else [],
            "final_decision": f"{top1} {final_top3_readable[0]['probability']}%" if top1 else "N/A",
            "top1": top1,
            "top2": top2,
            "top3": top3,
            "message": "Prediction successful",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")



from fastapi import Body

@app.post("/api/personality/submit")
def submit_personality_test(
    user_id: int = Body(...),
    answers: List[int] = Body(...)
):
    """
    Save user's answers to DB and return prediction results
    """
    start = time.time()
    if not all([svm_model, knn_model, scaler, label_encoder]):
        raise HTTPException(status_code=503, detail="Models not ready. Try again later.")

    try:
        # ---------------- PREDICTION ----------------
        features = np.array(answers, dtype=float).reshape(1, -1)
        if np.isnan(features).any():
            raise HTTPException(status_code=400, detail="Answers contain NaN values")
        if features.shape[1] != 48:
            raise HTTPException(status_code=400, detail="Expected 48 features after reshape")

        features_scaled = scaler.transform(features)

        svm_proba = svm_model.predict_proba(features_scaled)[0]
        knn_proba = knn_model.predict_proba(features_scaled)[0]

        svm_top3 = top_k_from_probs(svm_proba, k=3)
        knn_top3 = top_k_from_probs(knn_proba, k=3)

        svm_top3_readable = [
            {"label": label_encoder.inverse_transform([cls_idx])[0], "probability": round(prob * 100.0, 2)}
            for cls_idx, prob in svm_top3
        ]
        knn_top3_readable = [
            {"label": label_encoder.inverse_transform([cls_idx])[0], "probability": round(prob * 100.0, 2)}
            for cls_idx, prob in knn_top3
        ]

        svm_top1_idx, svm_top1_prob = svm_top3[0]
        knn_top1_idx, knn_top1_prob = knn_top3[0]
        agree_flag = 1 if svm_top1_idx == knn_top1_idx else 0
        w_svm = compute_w_svm(svm_top1_prob, knn_top1_prob, agree_flag)

        final_proba = w_svm * svm_proba + (1 - w_svm) * knn_proba
        if final_proba.sum() <= 0:
            final_proba = (svm_proba + knn_proba) / 2.0
        final_proba = final_proba / final_proba.sum()

        final_top3 = top_k_from_probs(final_proba, k=3)
        final_top3_readable = [
            {"label": label_encoder.inverse_transform([cls_idx])[0], "probability": round(prob * 100.0, 2)}
            for cls_idx, prob in final_top3
        ]

        elapsed = time.time() - start
        logger.info("Submit completed in %.3fs (w_svm=%.3f)", elapsed, w_svm)

        # ---------- SAVE INTO test_result ----------
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Clear old results for this user
            cursor.execute("DELETE FROM test_result WHERE user_id = %s", (user_id,))

            for rank, item in enumerate(final_top3_readable, start=1):
                # Find program_id from program_information
                cursor.execute("SELECT program_id FROM program_information WHERE program_name = %s", (item["label"],))
                prog = cursor.fetchone()

                if prog:
                    cursor.execute("""
                                INSERT INTO test_result (test_result_id, user_id, program_id)
                                VALUES (%s, %s, %s)
                            """, (rank, user_id, prog["program_id"]))

            conn.commit()
        return {
            "success": True,
            "message": "Answers saved & prediction complete",
            "svm_top3": svm_top3_readable,
            "knn_top3": knn_top3_readable,
            "w_svm": round(w_svm, 3),
            "final_top3": final_top3_readable,
            "final_decision": f"{final_top3_readable[0]['label']} {final_top3_readable[0]['probability']}%",
            "top1": final_top3_readable[0]["label"] if len(final_top3_readable) > 0 else None,
            "top2": final_top3_readable[1]["label"] if len(final_top3_readable) > 1 else None,
            "top3": final_top3_readable[2]["label"] if len(final_top3_readable) > 2 else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Submit failed")
        raise HTTPException(status_code=500, detail=f"Submit failed: {e}")

# ---------- OTP helpers ----------
def is_otp_expired_entry(entry: dict):
    return time.time() - entry["timestamp"] > OTP_EXPIRY_SECONDS


# ---------- Registration flow ----------
@app.post("/api/request-register")
def request_register(req: RegisterRequest):
    # basic validation
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if email already exists in access_information (registered)
        cursor.execute("SELECT email FROM access_information WHERE email = %s", (req.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already exists.")

        # Check username exists
        cursor.execute("SELECT username FROM user_information WHERE username = %s", (req.username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists.")
    except mysql.connector.Error as err:
        logger.exception("DB error during registration checks")
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    # If there is an existing OTP entry, enforce resend cooldown
    entry = otp_store.get(req.email)
    now = time.time()
    if entry:
        last_sent = entry.get("last_sent", entry.get("timestamp", 0))
        elapsed = now - last_sent
        if elapsed < OTP_RESEND_COOLDOWN:
            wait = int(OTP_RESEND_COOLDOWN - elapsed)
            raise HTTPException(status_code=429, detail=f"Please wait {wait}s before requesting another OTP.")

    otp = f"{randint(100000, 999999):06d}"
    store_payload = {
        "username": req.username,
        "firstName": req.firstName,
        "middleName": req.middleName,
        "lastName": req.lastName,
        "_password": req.password
    }
    otp_store[req.email] = {
        "otp": otp,
        "data": store_payload,
        "timestamp": now,
        "last_sent": now,
    }
    fullname = f"{req.firstName} {req.middleName+' ' if req.middleName else ''}{req.lastName}".strip()
    
    # Try sending OTP (or log it for local dev)
    send_otp_via_email(req.email, otp, purpose = "register", fullname=fullname)
    return {"success": True, "message": "OTP sent to email"}


@app.post("/api/resend-otp")
def resend_otp(req: ResendOTPRequest):
    email = req.email
    entry = otp_store.get(email)
    if not entry:
        raise HTTPException(status_code=400, detail="No OTP request found. Please register first.")

    if is_otp_expired_entry(entry):
        # expired — remove entry and ask user to register again
        otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please start registration again.")

    now = time.time()
    last_sent = entry.get("last_sent", entry.get("timestamp", 0))
    elapsed = now - last_sent
    if elapsed < OTP_RESEND_COOLDOWN:
        wait = int(OTP_RESEND_COOLDOWN - elapsed)
        raise HTTPException(status_code=429, detail=f"Please wait {wait}s before resending OTP.")

    otp = f"{randint(100000, 999999):06d}"
    entry["otp"] = otp
    entry["timestamp"] = now
    entry["last_sent"] = now
    # keep entry["data"] intact
    fullname = f"{entry['data']['firstName']} {entry['data']['middleName']+' ' if entry['data']['middleName'] else ''}{entry['data']['lastName']}".strip()
    send_otp_via_email(email, otp, purpose = "register", fullname=fullname)
    return {"success": True, "message": "OTP resent to your email"}


@app.post("/api/verify-register")
def verify_register(req: OTPVerifyRequest):
    email = req.email
    if email not in otp_store:
        raise HTTPException(status_code=400, detail="No OTP request found")

    entry = otp_store[email]
    if is_otp_expired_entry(entry):
        otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP expired")

    if entry["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user_data = entry["data"]
    # Hash password now (we did not store plaintext in DB)
    hashed_password = bcrypt.hash(user_data["_password"])

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Double-check duplicates in DB (race protection)
        cursor.execute("SELECT email FROM access_information WHERE email = %s", (email,))
        if cursor.fetchone():
            otp_store.pop(email, None)
            raise HTTPException(status_code=400, detail="Email already registered (concurrent)")

        cursor.execute("SELECT username FROM user_information WHERE username = %s", (user_data["username"],))
        if cursor.fetchone():
            otp_store.pop(email, None)
            raise HTTPException(status_code=400, detail="Username already exists (concurrent)")

        # Insert user_information
        cursor.execute("""
            INSERT INTO user_information (email, username, first_name, middle_name, last_name)
            VALUES (%s, %s, %s, %s, %s)
        """, (email, user_data["username"], user_data["firstName"],
              user_data.get("middleName"), user_data["lastName"]))
        conn.commit()

        # retrieve user_id
        cursor.execute("SELECT user_id FROM user_information WHERE email = %s", (email,))
        row = cursor.fetchone()
        if not row or "user_id" not in row:
            raise HTTPException(status_code=500, detail="Failed to retrieve user_id after insertion.")
        user_id = row["user_id"]

        # Insert access_information
        cursor.execute("""
            INSERT INTO access_information (role_id, email, user_id, _password, created_timestamp, last_updated_timestamp)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
        """, (2, email, user_id, hashed_password))
        conn.commit()

        # Remove OTP entry
        otp_store.pop(email, None)
        return {"success": True, "message": "Account created successfully"}
    except mysql.connector.Error as err:
        logger.exception("DB error during verify-register")
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ---------- Defensive login ----------
@app.post("/api/login")
def login_user(req: LoginRequest):
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # ✅ Check if email exists in user_information
        cursor.execute("SELECT user_id, email FROM user_information WHERE email = %s", (req.email,))
        user_info = cursor.fetchone()
        if not user_info:
            raise HTTPException(status_code=400, detail="Invalid email")

        # ✅ Fetch password + role_id from access_information
        cursor.execute("SELECT _password, role_id FROM access_information WHERE email = %s", (req.email,))
        access_info = cursor.fetchone()
        if not access_info:
            raise HTTPException(status_code=400, detail="Login credentials not found")

        stored_hash = access_info["_password"]
        role_id = access_info["role_id"]

        if not bcrypt.verify(req.password, stored_hash):
            raise HTTPException(status_code=400, detail="Invalid password")

        # ✅ Create JWT token
        token = create_access_token({"sub": user_info["email"], "user_id": user_info["user_id"]})

        # ✅ Return response including role_id
        return {
            "access_token": token,
            "token_type": "bearer",
            "email": user_info["email"],
            "user_id": user_info["user_id"],
            "role_id": role_id  # 👈 IMPORTANT
        }

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.get("/api/me")
def get_profile(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid token payload")

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1️⃣ Basic User Info
        cursor.execute("""
            SELECT 
                u.user_id,
                u.email,
                u.username,
                u.first_name,
                u.middle_name,
                u.last_name,
                a.role_id
            FROM user_information u
            JOIN access_information a ON u.user_id = a.user_id
            WHERE u.user_id = %s
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 2️⃣ Personality & Program Result (supports multiple programs!)
        cursor.execute("""
            SELECT 
                tr.test_result_id,
                p.personality_type,
                pr.program_id,
                pr.program_name,
                pr.program_details
            FROM test_result tr
            JOIN personality p ON tr.personality_id = p.personality_id
            LEFT JOIN program_information pr ON tr.program_id = pr.program_id
            WHERE tr.user_id = %s
        """, (user_id,))
        test_results = cursor.fetchall()  # ✅ Fetch all recommendations
        personality_type = test_results[0]["personality_type"] if test_results else None

        # 3️⃣ Strong Knowledge Area (improved logic)
        cursor.execute("""
            SELECT Mathematics, English, Science, Filipino, Reading_Comprehension,
                   Logical_Reasoning, Technology, Engineering, Accountancy,
                   Business, Management, Humanities, Social_Science
            FROM user_scholastic_knowledge_test
            WHERE user_id = %s
            LIMIT 1
        """, (user_id,))
        knowledge = cursor.fetchone()

        strong_knowledge_area = None
        if knowledge:
            # Convert all decimal values to float
            knowledge_scores = {}
            for k, v in knowledge.items():
                try:
                    knowledge_scores[k] = float(v or 0)
                except Exception:
                    knowledge_scores[k] = 0.0

            # Find the subject with the highest score
            top_subject, top_score = max(knowledge_scores.items(), key=lambda x: x[1])

            # Format into readable string
            subject_clean = top_subject.replace("_", " ")
            strong_knowledge_area = {
                "subject": subject_clean,
                "score": round(top_score * 100)
            }

        # 🧩 Combine all into one response
        return {
            "user": user,
            "recommended_programs": test_results if test_results else [],
            "personality_type": personality_type or "N/A",
            "strong_knowledge_area": strong_knowledge_area
        }

    except Exception as e:
        print("⚠️ Error in /api/me:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.get("/api/program-description")
def get_program_description(program_name: str = Query(...)):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT program_details 
            FROM program_information 
            WHERE program_name = %s
            LIMIT 1
        """, (program_name,))
        row = cursor.fetchone()
        if row and row["program_details"]:
            return {"description": row["program_details"]}
        return {"description": "No description yet"}
    except Exception as e:
        print("⚠️ Error fetching program description:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch program description")
    finally:
        cursor.close()
        conn.close()

        
# ---------- Questions endpoint ----------
@app.get("/api/questions")
def get_questions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, text FROM questions")
        rows = cursor.fetchall()
        return rows
    except Exception:
        logger.exception("Failed to fetch questions")
        raise HTTPException(status_code=500, detail="Failed to fetch questions")
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


# ---------- Middleware ----------
@app.middleware("http")
async def catch_405_and_return_json(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ------------------- PERSONALITY TEST -------------------
# ✅ Get personality result for a user
@app.get("/api/personality-result/{user_id}")
def get_personality_result(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # 🧮 Count total personality questions
            cursor.execute("SELECT COUNT(*) AS total FROM personality_test")
            total_questions = cursor.fetchone()["total"]

            # 🧠 Fetch user's answered questions with personality type
            cursor.execute("""
                SELECT p.personality_type, upt.answer
                FROM user_personality_test upt
                JOIN personality_test pt ON upt.personality_test_id = pt.personality_test_id
                JOIN personality p ON pt.personality_id = p.personality_id
                WHERE upt.user_id = %s
            """, (user_id,))
            rows = cursor.fetchall()

        # 🕵️ If no answers exist
        if not rows:
            return {"success": True, "type": "Unknown"}

        # ⚠️ If not all questions are answered yet
        if len(rows) < total_questions:
            return {
                "success": False,
                "message": "Incomplete",
                "answered": len(rows),
                "total": total_questions
            }

        # ✅ Count total "1" (Agree) answers per personality type
        counts = {}
        for row in rows:
            if row["answer"] == 1:
                counts[row["personality_type"]] = counts.get(row["personality_type"], 0) + 1

        # 🧩 Fallback — if all are 0, still count occurrences
        if not counts:
            for row in rows:
                counts[row["personality_type"]] = counts.get(row["personality_type"], 0) + 1

        # 🏆 Determine personality with highest count
        personality = max(counts, key=counts.get)
        return {"success": True, "type": personality}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch personality result: {str(e)}")


# ✅ Fetch unanswered personality questions
@app.get("/api/personality/questions/{user_id}")
def get_personality_questions(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # 🧾 Fetch all questions (joined with personality type)
            cursor.execute("""
                SELECT 
                    pt.personality_test_id,
                    p.personality_id,
                    p.personality_type,
                    pt.questions
                FROM personality_test pt
                JOIN personality p ON pt.personality_id = p.personality_id
                ORDER BY pt.personality_test_id ASC
            """)
            all_questions = cursor.fetchall() or []

            # 🧠 Fetch user's answered questions
            cursor.execute("""
                SELECT personality_test_id, answer 
                FROM user_personality_test 
                WHERE user_id = %s
            """, (user_id,))
            answered_rows = cursor.fetchall() or []
            answered_map = {r["personality_test_id"]: r["answer"] for r in answered_rows}

            # 🏷 Mark answered/unanswered
            for q in all_questions:
                q["answered"] = q["personality_test_id"] in answered_map
                q["answer_value"] = answered_map.get(q["personality_test_id"]) if q["answered"] else None

            return all_questions

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch personality questions: {str(e)}")


@app.post("/api/personality/answer")
def save_single_personality_answer(answer: dict = Body(...)):
    """
    Saves a single answer for a personality test question.
    Prevents duplicate entries for the same user and question.
    """
    try:
        # 🧩 Normalize answer ("agree" → 1, "disagree" → 0)
        raw_answer = str(answer.get("answer", "")).strip().lower()
        answer_value = 1 if raw_answer == "agree" else 0

        user_id = answer.get("user_id")
        personality_test_id = answer.get("personality_test_id")

        # 🚫 Validate input
        if not user_id or not personality_test_id:
            raise HTTPException(status_code=400, detail="Missing user_id or personality_test_id.")

        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # 🔍 Check for duplicate entry
            cursor.execute("""
                SELECT 1
                FROM user_personality_test
                WHERE user_id = %s AND personality_test_id = %s
                LIMIT 1
            """, (user_id, personality_test_id))
            existing = cursor.fetchone()

            if existing:
                raise HTTPException(status_code=400, detail="This question has already been answered and cannot be changed.")

            # 💾 Insert answer
            cursor.execute("""
                INSERT INTO user_personality_test (personality_test_id, user_id, answer)
                VALUES (%s, %s, %s)
            """, (personality_test_id, user_id, answer_value))
            conn.commit()

        return {"success": True, "message": "Answer saved successfully."}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save personality answer: {str(e)}")

    

# ------------------- KNOWLEDGE TEST -------------------
# @app.post("/api/knowledge/second-chance/{user_id}")
# def create_second_chance(user_id: int):
#     try:
#         with get_db_connection() as conn:
#             cursor = conn.cursor(dictionary=True)
#             cursor.execute(
#                 """
#                 SELECT * FROM user_knowledge_session
#                 WHERE user_id = %s
#                 ORDER BY session_id DESC LIMIT 1
#                 """,
#                 (user_id,),
#             )
#             session = cursor.fetchone()

#             if not session:
#                 raise HTTPException(status_code=400, detail="No prior session found to base second chance on")

#             cursor.execute("SELECT COUNT(*) as cnt FROM user_knowledge_test WHERE user_id = %s", (user_id,))
#             answered_row = cursor.fetchone() or {}
#             answered = int(answered_row.get("cnt", 0))
#             if answered > 0 or int(session.get("attempt", 1)) != 1:
#                 raise HTTPException(status_code=400, detail="Second chance not eligible")

#             new_duration = max(1, int(session.get("duration_minutes", 5)) // 2)
#             now = datetime.utcnow()
#             print(new_duration, now, user_id)
#             cursor.execute(
#                 """
#                 INSERT INTO user_knowledge_session (user_id, start_time, duration_minutes, attempt)
#                 VALUES (%s, %s, %s, %s)
#                 """,
#                 (user_id, now, new_duration, 2),
#             )
#             conn.commit()
#             return {"session_id": cursor.lastrowid, "remaining_seconds": new_duration * 60, "attempt": 2}
#     except HTTPException:
#         raise
#     except Exception as e:
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"Failed to create second-chance session: {str(e)}")
@app.get("/api/knowledge/questions/{user_id}")
def get_knowledge_questions(user_id: int):
    """
    Fetch unanswered questions for each category and category_type dynamically from DB.
    Each (category, category_type) pair can show up to 4 total questions,
    combining already-answered and new ones.
    """
    import random, json, traceback
    from collections import defaultdict

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # --- Get all answered question IDs for this user (as ints)
            cursor.execute("""
                SELECT knowledge_id FROM user_knowledge_test WHERE user_id = %s
            """, (user_id,))
            answered_rows = cursor.fetchall() or []
            answered_ids = {int(r["knowledge_id"]) for r in answered_rows if r.get("knowledge_id") is not None}

            # --- Count already answered per (category, category_type)
            cursor.execute("""
                SELECT 
                    kt.category,
                    COALESCE(kt.category_type, 'Uncategorized') AS category_type,
                    COUNT(*) AS cnt
                FROM user_knowledge_test ukt
                JOIN knowledge_test kt ON ukt.knowledge_id = kt.knowledge_id
                WHERE ukt.user_id = %s
                GROUP BY kt.category, kt.category_type
            """, (user_id,))
            answered_counts = {
                (r["category"], r["category_type"]): int(r["cnt"] or 0)
                for r in (cursor.fetchall() or [])
            }

            # --- Dynamically get all categories and category types from DB
            cursor.execute("SELECT DISTINCT category FROM knowledge_test WHERE category IS NOT NULL AND category != ''")
            CATEGORY_ORDER = sorted([r["category"] for r in cursor.fetchall()])

            cursor.execute("SELECT DISTINCT category_type FROM knowledge_test WHERE category_type IS NOT NULL AND category_type != ''")
            CATEGORY_TYPES = sorted([r["category_type"] for r in cursor.fetchall()])

            # --- Fetch all knowledge questions (joined with options)
            cursor.execute("""
                SELECT 
                    kt.knowledge_id,
                    kt.knowledge_type,
                    kt.category,
                    kt.question,
                    kt.answer,
                    kt.timer,
                    COALESCE(kt.category_type, 'Uncategorized') AS category_type,
                    GROUP_CONCAT(DISTINCT ko.choises SEPARATOR '||') AS _options
                FROM knowledge_test kt
                LEFT JOIN knowledge_options ko ON kt.knowledge_id = ko.knowledge_id
                GROUP BY kt.knowledge_id
            """)
            all_rows = cursor.fetchall() or []

            # --- Group by category -> category_type (only unanswered questions)
            grouped_by_category = defaultdict(lambda: defaultdict(list))

            for r in all_rows:
                if int(r["knowledge_id"]) in answered_ids:
                    continue

                category = r.get("category") or "Uncategorized"
                cat_type = r.get("category_type") or "Uncategorized"

                # Parse choices safely
                options = []
                if isinstance(r["_options"], str):
                    text = r["_options"].strip()
                    if text.startswith("[") and text.endswith("]"):
                        try:
                            options = json.loads(text)
                        except Exception:
                            options = []
                    else:
                        options = [opt.strip() for opt in text.split("||") if opt.strip()]

                grouped_by_category[category][cat_type].append({
                    "id": r["knowledge_id"],
                    "knowledge_type": r["knowledge_type"],
                    "question": r["question"],
                    "answer": r["answer"],
                    "category": category,
                    "category_type": cat_type,
                    "timer": int(r["timer"]) if r["timer"] is not None else 60,
                    "choices": options,
                })

            # --- Select up to (4 - already_answered) randomized questions per category_type
            selected_questions = []

            for category in CATEGORY_ORDER:
                category_types = grouped_by_category.get(category, {})
                if not category_types:
                    continue

                for cat_type in CATEGORY_TYPES:
                    questions = category_types.get(cat_type, [])
                    if not questions:
                        continue

                    already = answered_counts.get((category, cat_type), 0)
                    remaining_to_show = max(0, 4 - already)

                    if remaining_to_show <= 0:
                        continue

                    random.shuffle(questions)
                    selected_questions.extend(questions[:remaining_to_show])

            total_answered = len(answered_ids)

            # --- Return response
            if not selected_questions:
                return {"completed": True, "total_answered": total_answered}

            return {
                "completed": False,
                "questions": selected_questions,
                "total_answered": total_answered,
                "next_question_number": total_answered + 1,
            }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch knowledge questions: {str(e)}")


# Save Single Answer (includes auto 0 for unanswered)
@app.post("/api/knowledge/save-answer")
def save_single_answer(answer: dict):
    """
    Save user's answer for a single question.
    If answer is empty string, automatically marks score = 0.
    """
    try:
        knowledge_id = int(answer["knowledge_id"])
        user_id = int(answer["user_id"])
        user_answer = str(answer.get("answer", "")).strip()

        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT answer FROM knowledge_test WHERE knowledge_id = %s", (knowledge_id,))
            correct_row = cursor.fetchone() or {}
            correct_answer = correct_row.get("answer", "") or ""

            # Compare answers (case-insensitive)
            is_correct = 1 if (user_answer and user_answer.lower() == correct_answer.lower()) else 0

            cursor.execute("""
                INSERT INTO user_knowledge_test (knowledge_id, user_id, score)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE score = VALUES(score)
            """, (knowledge_id, user_id, is_correct))

            conn.commit()
            return {"success": True, "is_correct": bool(is_correct)}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save knowledge answer: {str(e)}")


# Compute Normalized Scores
@app.post("/api/compute-user-scholastic-knowledge/{user_id}")
def compute_user_scholastic_knowledge(user_id: int):
    """
    Compute per-category normalized scores dynamically.
    Formula per category:
        knowledge_avg = (correct_answers / total_questions_in_category) × 100
        scholastic_avg = (sum of grades across all subjects in that category) / (count of those subjects)
        normalized = ((knowledge_avg + scholastic_avg) / 2) / 100
    """

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # ----------------------------
            # Step 0: Dynamically detect all unique categories
            # ----------------------------
            cursor.execute("""
                SELECT DISTINCT category FROM knowledge_test
                UNION
                SELECT DISTINCT category FROM scholastic_categories
            """)
            categories = [r["category"] for r in cursor.fetchall() if r["category"]]
            categories.sort()  # optional: keep clean order

            # ----------------------------
            # Step 1: Compute knowledge_avg per category
            # ----------------------------
            cursor.execute("""
                SELECT 
                    kt.category,
                    (SUM(ukt.score) / COUNT(*)) * 100 AS knowledge_avg
                FROM user_knowledge_test ukt
                JOIN knowledge_test kt ON kt.knowledge_id = ukt.knowledge_id
                WHERE ukt.user_id = %s
                GROUP BY kt.category
            """, (user_id,))
            knowledge_data = {r["category"]: float(r["knowledge_avg"] or 0) for r in cursor.fetchall()}

            # ----------------------------
            # Step 2: Compute scholastic_avg per main category
            # ----------------------------
            cursor.execute("""
                SELECT 
                    sc.category,
                    AVG(usr.grade) AS scholastic_avg
                FROM scholastic_categories sc
                JOIN user_scholastic_record usr ON usr.scholastic_id = sc.scholastic_id
                WHERE usr.user_id = %s
                GROUP BY sc.category
            """, (user_id,))
            scholastic_data = {r["category"]: float(r["scholastic_avg"] or 0) for r in cursor.fetchall()}

            # ----------------------------
            # Step 3: Compute normalized scores
            # ----------------------------
            results = {}
            for cat in categories:
                know = knowledge_data.get(cat, 0.0)
                schol = scholastic_data.get(cat, 0.0)
                normalized = round(((know + schol) / 2) / 100, 4)
                results[cat] = normalized

            # ----------------------------
            # Step 4: Get user's strand
            # ----------------------------
            cursor.execute("""
                SELECT sr.strand
                FROM user_scholastic_record usr
                JOIN scholastic_record sr ON usr.scholastic_id = sr.scholastic_id
                WHERE usr.user_id = %s
                LIMIT 1
            """, (user_id,))
            strand_row = cursor.fetchone()
            strand = strand_row["strand"] if strand_row else None

            # ----------------------------
            # Step 5: Save results into user_scholastic_knowledge_test
            # ----------------------------

            # Check if the user already has a scholastic record
            cursor.execute("SELECT 1 FROM user_scholastic_knowledge_test WHERE user_id = %s", (user_id,))
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(
                    status_code=400,
                    detail="Please complete the scholastic test first before computing knowledge scores."
                )

            # Build dynamic UPDATE query (escape spaces → underscores)
            update_parts = []
            values = []
            for cat in categories:
                col_name = cat.replace(" ", "_")
                update_parts.append(f"`{col_name}` = %s")
                values.append(results.get(cat, 0.0))

            # Add strand in case it needs to be updated
            update_parts.append("`strand` = %s")
            values.append(strand)

            # Add user_id for WHERE clause
            values.append(user_id)

            update_query = f"""
                UPDATE user_scholastic_knowledge_test
                SET {', '.join(update_parts)}
                WHERE user_id = %s
            """
            cursor.execute(update_query, tuple(values))
            conn.commit()

        return {
            "success": True,
            "strand": strand,
            "normalized_scores": results
        }

    except HTTPException:
        raise  # rethrow user-friendly errors

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to compute scores: {str(e)}")


# Get Knowledge Test Result
@app.get("/api/knowledge-result/{user_id}")
def get_knowledge_result(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                SELECT kt.category, ukt.score
                FROM user_knowledge_test ukt
                JOIN knowledge_test kt ON ukt.knowledge_id = kt.knowledge_id
                WHERE ukt.user_id = %s
            """, (user_id,))
            rows = cursor.fetchall() or []

            cursor.execute("SELECT COUNT(*) as total FROM knowledge_test")
            total_row = cursor.fetchone() or {}
            total_questions = int(total_row.get("total", 0))

            cursor.execute("""
                SELECT attempt FROM user_knowledge_session
                WHERE user_id = %s
                ORDER BY session_id DESC LIMIT 1
            """, (user_id,))
            session_row = cursor.fetchone()
            attempt = int(session_row.get("attempt", 1)) if session_row else 1

        if not rows:
            return {
                "success": True,
                "empty": True,
                "answered": 0,
                "total_questions": total_questions,
                "attempt": attempt,
            }

        scores: Dict[str, int] = {}
        counts: Dict[str, int] = {}
        total_correct = 0
        total_answered = 0

        for row in rows:
            category = row.get("category", "uncategorized")
            is_correct = int(row.get("score", 0)) if row.get("score") is not None else 0
            scores[category] = scores.get(category, 0) + is_correct
            counts[category] = counts.get(category, 0) + 1
            total_correct += is_correct
            total_answered += 1

        percentages = {
            cat: round((scores[cat] / counts[cat]) * 100, 2) if counts[cat] > 0 else 0.0
            for cat in scores
        }

        best = max(percentages, key=percentages.get) if percentages else None
        best_score = percentages.get(best, 0.0) if best else 0.0
        total_score = round((total_correct / total_answered) * 100, 2) if total_answered > 0 else 0.0

        return {
            "success": True,
            "best_subject": best,
            "score": best_score,
            "categories": percentages,
            "total_score": total_score,
            "answered": total_answered,
            "total_questions": total_questions,
            "remaining": max(0, total_questions - total_answered),
            "progress": f"{total_answered}/{total_questions}",
            "attempt": attempt,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch knowledge result: {str(e)}")


# ------------------- SCHOLASTIC RECORD -------------------

@app.get("/api/scholastic/user-strand/{user_id}")
def get_user_strand(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT strand FROM user_scholastic_knowledge_test WHERE user_id = %s",
                (user_id,),
            )
            result = cursor.fetchone()

        if result:
            return {"strand": result["strand"]}
        return {"strand": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching strand: {e}")

# -------------------------------
# POST save strand (prevent duplicates)
# -------------------------------
@app.post("/api/scholastic/save-strand")
def save_strand(data: dict):
    user_id = data.get("user_id")
    strand = data.get("strand")

    if not user_id or not strand:
        raise HTTPException(status_code=400, detail="Missing user_id or strand")

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # Check if user already has a strand
            cursor.execute(
                "SELECT strand FROM user_scholastic_knowledge_test WHERE user_id = %s",
                (user_id,),
            )
            existing = cursor.fetchone()

            if existing:
                return JSONResponse(
                    status_code=409,
                    content={"message": "User already has a recorded strand"},
                )

            # Insert new record
            cursor.execute(
                "INSERT INTO user_scholastic_knowledge_test (user_id, strand) VALUES (%s, %s)",
                (user_id, strand),
            )
            conn.commit()

        return {"success": True, "message": "Strand saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving strand: {e}")
    
@app.get("/api/scholastic/records/{user_id}")
def get_scholastic_records(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT sr.scholastic_id, sr.strand, sr.grade_level, sr.semester, sr.subjects, usr.grade
                FROM user_scholastic_record usr
                JOIN scholastic_record sr ON usr.scholastic_id = sr.scholastic_id
                WHERE usr.user_id = %s
                ORDER BY sr.grade_level, sr.semester, sr.scholastic_id
            """, (user_id,))
            rows = cursor.fetchall()
        return {"success": True, "records": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scholastic records: {e}")


@app.get("/api/scholastic-result/{user_id}")
def get_scholastic_result(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT sr.grade_level, sr.semester, usr.grade
                FROM user_scholastic_record usr
                JOIN scholastic_record sr ON usr.scholastic_id = sr.scholastic_id
                WHERE usr.user_id = %s
                ORDER BY sr.grade_level, sr.semester
            """, (user_id,))
            rows = cursor.fetchall()

        if not rows:
            return {"success": False, "message": "No records found"}

        result = {}
        total, count = 0, 0
        for row in rows:
            key = f"Grade {row['grade_level']} Sem {row['semester']}"
            if key not in result:
                result[key] = []
            result[key].append(row['grade'])
            total += row['grade']
            count += 1

        averages = {k: round(sum(v) / len(v), 2) for k, v in result.items()}
        averages["Final Average"] = round(total / count, 2)

        return {"success": True, "averages": averages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scholastic result: {e}")


@app.get("/api/scholastic/subjects")
def get_scholastic_subjects(
    strand: str = Query(...),
    grade_level: int = Query(...),
    semester: int = Query(...)
):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT scholastic_id, strand, grade_level, semester, subjects
                FROM scholastic_record
                WHERE strand = %s AND grade_level = %s AND semester = %s
            """, (strand, grade_level, semester))
            return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scholastic subjects: {e}")


@app.post("/api/scholastic/answers")
def save_scholastic_answers(answers: List[dict]):
    try:
        if not answers or not isinstance(answers, list):
            raise HTTPException(status_code=400, detail="Invalid payload: expected a list of answers")

        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            print("Incoming payload:", answers)  # Debug full request

            for ans in answers:
                user_id = ans.get("user_id")
                scholastic_id = ans.get("scholastic_id")
                grade = ans.get("grade")

                # Validation
                if user_id is None or scholastic_id is None or grade is None:
                    raise HTTPException(status_code=400, detail=f"Missing data in {ans}")
                if not isinstance(grade, (int, float)) or grade < 60 or grade > 100:
                    raise HTTPException(status_code=400, detail=f"Invalid grade {grade} for scholastic_id {scholastic_id}")

                # Check if record exists
                cursor.execute("""
                    SELECT COUNT(*) AS cnt
                    FROM user_scholastic_record
                    WHERE user_id=%s AND scholastic_id=%s
                """, (user_id, scholastic_id))
                exists = cursor.fetchone()["cnt"]

                if exists:
                    cursor.execute("""
                        UPDATE user_scholastic_record
                        SET grade=%s
                        WHERE user_id=%s AND scholastic_id=%s
                    """, (grade, user_id, scholastic_id))
                else:
                    cursor.execute("""
                        INSERT INTO user_scholastic_record (user_id, scholastic_id, grade)
                        VALUES (%s, %s, %s)
                    """, (user_id, scholastic_id, grade))

            conn.commit()

        return {"success": True, "message": "Scholastic records saved/updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save scholastic records: {e}")


# Optional admin reset endpoint (good for testing)
@app.delete("/api/scholastic/reset/{user_id}")
def reset_scholastic_records(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM user_scholastic_record WHERE user_id=%s", (user_id,))
            conn.commit()
        return {"success": True, "message": "Records reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset scholastic records: {e}")


@app.get("/api/test-results/{user_id}")
def get_test_results(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # ---------- STEP 1: Compute highest knowledge (always live) ----------
            cursor.execute("""
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'user_scholastic_knowledge_test'
            """)
            all_cols = [r["COLUMN_NAME"] for r in (cursor.fetchall() or [])]
            exclude = {"user_sk_id", "user_id", "strand"}
            category_fields = [c for c in all_cols if c not in exclude]

            cursor.execute("""
                SELECT *
                FROM user_scholastic_knowledge_test
                WHERE user_id = %s
                ORDER BY user_sk_id DESC
                LIMIT 1
            """, (user_id,))
            user_sk = cursor.fetchone()

            top_categories = []
            top_value = None
            if user_sk and category_fields:
                for cat in category_fields:
                    try:
                        value = float(user_sk.get(cat) or 0.0)
                    except Exception:
                        value = 0.0
                    if top_value is None or value > top_value:
                        top_value = value
                        top_categories = [cat]
                    elif value == top_value:
                        top_categories.append(cat)

            # ---------- STEP 2: Fetch personality ----------
            cursor.execute("""
                SELECT tr.*, p.personality_type
                FROM test_result tr
                JOIN personality p ON tr.personality_id = p.personality_id
                WHERE tr.user_id = %s
                LIMIT 1
            """, (user_id,))
            existing_result = cursor.fetchone()

            personality_type = existing_result.get("personality_type", "N/A") if existing_result else "N/A"

            # ---------- STEP 3: Fetch saved recommended programs ----------
            cursor.execute("""
                SELECT pi.program_name, pi.program_details
                FROM test_result tr
                JOIN program_information pi ON tr.program_id = pi.program_id
                WHERE tr.user_id = %s
                ORDER BY tr.test_result_id ASC
                LIMIT 3
            """, (user_id,))
            program_rows = cursor.fetchall() or []

            final_top3 = [
                {"label": row["program_name"], "details": row["program_details"] or ""}
                for row in program_rows
            ]

            # ---------- STEP 4: Handle no existing personality ----------
            if not existing_result:
                cursor.execute("""
                    SELECT p.personality_id, p.personality_type, upt.answer
                    FROM user_personality_test upt
                    JOIN personality_test pt ON upt.personality_test_id = pt.personality_test_id
                    JOIN personality p ON pt.personality_id = p.personality_id
                    WHERE upt.user_id = %s
                """, (user_id,))
                personality_rows = cursor.fetchall() or []

                personality_id = None
                if personality_rows:
                    counts = {}
                    for row in personality_rows:
                        if int(row["answer"]) == 1:  # assuming 1 = Agree
                            ptype = row["personality_type"]
                            counts[ptype] = counts.get(ptype, 0) + 1
                    if counts:
                        personality_type = max(counts, key=counts.get)
                        for row in personality_rows:
                            if row["personality_type"] == personality_type:
                                personality_id = row["personality_id"]
                                break

                if personality_id is not None:
                    cursor.execute("""
                        INSERT INTO test_result (test_result_id, personality_id, user_id, program_id)
                        VALUES (NULL, %s, %s, NULL)
                    """, (personality_id, user_id))
                    conn.commit()

        # ---------- STEP 5: Return combined data ----------
        return {
            "success": True,
            "personality_type": personality_type,
            "highest_knowledge_categories": top_categories if top_categories else ["N/A"],
            "highest_knowledge_value": round(top_value, 4) if top_value is not None else 0.0,
            "final_top3": final_top3,
            "top1": final_top3[0]["label"] if len(final_top3) > 0 else None,
            "top2": final_top3[1]["label"] if len(final_top3) > 1 else None,
            "top3": final_top3[2]["label"] if len(final_top3) > 2 else None,
            "saved_to_test_result": bool(existing_result),
            "source": "existing_record" if existing_result else "computed_no_insert",
        }

    except Exception as e:
        import traceback
        print("❌ ERROR in get_test_results:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch test results: {e}")

@app.get("/api/program/{program_name}")
def get_program_details(program_name: str):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT program_name, program_details
                FROM program_information
                WHERE program_name = %s
                LIMIT 1
            """, (program_name,))
            program = cursor.fetchone()

            if not program:
                raise HTTPException(status_code=404, detail="Program not found")

        return {
            "success": True,
            "program_name": program["program_name"],
            "program_details": program.get("program_details", "No description available.")
        }

    except Exception as e:
        print("❌ ERROR fetching program details:", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch program details: {e}")





ZERBOUNCE_API_KEY = "c5ba213f89064f339d67b5a3035f34e8"
@app.get("/api/validate-email")
def validate_email(email: str):
    """
    Validate email existence using ZeroBounce (single email endpoint).
    """
    try:
        url = "https://api.zerobounce.net/v2/validate"
        params = {
            "api_key": ZERBOUNCE_API_KEY,
            "email": email,
        }
        resp = requests.get(url, params=params, timeout=10)

        print("ZeroBounce raw response:", resp.status_code, resp.text)

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)

        data = resp.json()

        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"])

        return {
            "status": data.get("status"),
            "sub_status": data.get("sub_status"),
            "free_email": data.get("free_email"),
            "did_you_mean": data.get("did_you_mean"),
            "account": data.get("account"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@app.get("/api/zero-usage")
def zero_usage():
    """
    Get API credit usage from ZeroBounce.
    """
    try:
        url = "https://api.zerobounce.net/v2/getapiusage"
        params = {"api_key": ZERBOUNCE_API_KEY}
        resp = requests.get(url, params=params, timeout=10)

        print("ZeroBounce usage response:", resp.status_code, resp.text)

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)

        return resp.json()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Usage check failed: {str(e)}")
    
# ---------- Root ----------
@app.get("/")
def root():
    return {"message": "PathFinder API is running."}

@app.get("/api/top-strands")
def get_top_strands():
    """
    Returns the number of users per strand from user_scholastic_knowledge_test.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT strand, COUNT(*) AS user_count
            FROM user_scholastic_knowledge_test
            WHERE strand IS NOT NULL AND strand <> ''
            GROUP BY strand
            ORDER BY user_count DESC;
        """)

        rows = cursor.fetchall()
        conn.close()
        return rows

    except Exception as e:
        print("⚠️ ERROR in /api/top-strands:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/total-users-timeline")
def get_total_users_timeline():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            DATE(created_timestamp) AS date,
            COUNT(*) AS new_users,
            (
                SELECT COUNT(*) 
                FROM access_information AS a2
                WHERE DATE(a2.created_timestamp) <= DATE(MIN(a1.created_timestamp))
            ) AS total_users
        FROM access_information AS a1
        GROUP BY DATE(created_timestamp)
        ORDER BY DATE(created_timestamp);
    """)
    
    data = cursor.fetchall()
    conn.close()
    return data

@app.get("/api/top-programs")
def get_top_programs():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            p.program_id, 
            p.program_name, 
            p.program_details, 
            COUNT(t.program_id) AS count
        FROM test_result t
        JOIN program_information p ON t.program_id = p.program_id
        WHERE t.program_id IS NOT NULL
        GROUP BY p.program_id, p.program_name, p.program_details
        ORDER BY count DESC
        LIMIT 3;
    """)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results



