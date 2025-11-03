# ---------- FEEDBACK ----------
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()

class FeedbackRequest(BaseModel):
    user_id: int
    feedback: int
    comments: str | None = None

@router.post("/api/feedback")
def submit_feedback(data: FeedbackRequest):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO feedback (user_id, feedback, comments)
                VALUES (%s, %s, %s)
            """, (data.user_id, data.feedback, data.comments))
            conn.commit()
        return {"success": True, "message": "Feedback submitted successfully"}
    except Exception as e:
        print("⚠️ ERROR submitting feedback:", e)
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")
    
@router.get("/api/feedback/{user_id}")
def get_feedback(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT feedback, comments 
                FROM feedback 
                WHERE user_id = %s 
                ORDER BY feedback_id DESC 
                LIMIT 1
                """,
                (user_id,)
            )
            row = cursor.fetchone()

        # 🧠 Explicitly return JSON with consistent types
        if row:
            feedback_value = row.get("feedback")
            comments_value = row.get("comments", "")
            return {
                "has_feedback": True,
                "feedback": int(feedback_value) if feedback_value is not None else None,
                "comments": comments_value or "",
            }

        # no record
        return {"has_feedback": False, "feedback": None, "comments": ""}

    except Exception as e:
        print("⚠️ ERROR fetching feedback:", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch feedback: {str(e)}")


@router.get("/api/feedback")
def get_all_feedback():
    """
    Fetch all feedback from all users for the admin panel.
    Includes username, rating, comment, and submission timestamp.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT 
                    f.feedback_id,
                    u.username,
                    f.feedback AS rating,
                    f.comments AS comment,
                    f.created_at
                FROM feedback f
                JOIN user_information u ON f.user_id = u.user_id
                ORDER BY f.created_at DESC
            """)
            rows = cursor.fetchall()

        return {"success": True, "feedback": rows}

    except Exception as e:
        print("⚠️ ERROR fetching all feedback:", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch feedback: {str(e)}")

