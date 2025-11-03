from fastapi import APIRouter, HTTPException, status
from database import get_db_connection
from typing import Dict

router = APIRouter()


# ✅ GET all personality questions (JOIN with personality table)
@router.get("/api/personality-questions")
def get_personality_questions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                pt.personality_test_id,
                pt.questions,
                pt.personality_id,
                p.personality_type
            FROM personality_test pt
            JOIN personality p ON pt.personality_id = p.personality_id
            ORDER BY pt.personality_test_id ASC
        """)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ POST (Add new question)
@router.post("/api/personality-questions", status_code=status.HTTP_201_CREATED)
def add_personality_question(data: Dict):
    try:
        personality_type = data.get("personality_type")
        question = data.get("questions")

        if not personality_type or not question:
            raise HTTPException(status_code=400, detail="Missing required fields: 'personality_type' and 'questions' are required.")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get the matching personality_id from the personality table
        cursor.execute(
            "SELECT personality_id FROM personality WHERE personality_type = %s LIMIT 1",
            (personality_type,)
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=400, detail=f"Personality type '{personality_type}' not found.")

        personality_id = result["personality_id"]

        # Insert the new question
        cursor.execute("""
            INSERT INTO personality_test (personality_id, questions)
            VALUES (%s, %s)
        """, (personality_id, question))
        conn.commit()
        new_id = cursor.lastrowid

        # Return the newly inserted record joined with personality name
        cursor.execute("""
            SELECT 
                pt.personality_test_id,
                pt.questions,
                pt.personality_id,
                p.personality_type
            FROM personality_test pt
            JOIN personality p ON pt.personality_id = p.personality_id
            WHERE pt.personality_test_id = %s
        """, (new_id,))
        new_row = cursor.fetchone()

        cursor.close()
        conn.close()
        return new_row

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ PUT (Update question)
@router.put("/api/personality-questions/{question_id}")
def update_personality_question(question_id: int, data: Dict):
    try:
        personality_type = data.get("personality_type")
        question = data.get("questions")

        if not personality_type or not question:
            raise HTTPException(status_code=400, detail="Missing required fields: 'personality_type' and 'questions' are required.")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get the personality_id for the given type
        cursor.execute(
            "SELECT personality_id FROM personality WHERE personality_type = %s LIMIT 1",
            (personality_type,)
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=400, detail=f"Personality type '{personality_type}' not found.")

        personality_id = result["personality_id"]

        # Update the question
        cursor.execute("""
            UPDATE personality_test
            SET personality_id = %s, questions = %s
            WHERE personality_test_id = %s
        """, (personality_id, question, question_id))
        conn.commit()

        cursor.close()
        conn.close()

        return {"message": "Question updated successfully."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ DELETE (Remove question)
@router.delete("/api/personality-questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personality_question(question_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM personality_test WHERE personality_test_id = %s", (question_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
