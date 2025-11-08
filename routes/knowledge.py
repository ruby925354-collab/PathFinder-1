from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()


# ✅ Pydantic model
class KnowledgeQuestion(BaseModel):
    knowledge_type: str
    category: str
    category_type: str | None = None
    question: str
    options: list[str]
    answer: str
    timer: int | None = 60


# 🟢 GET all questions (with options)
@router.get("/api/knowledge-questions")
def get_knowledge_questions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Join questions and their options
        cursor.execute("""
            SELECT kt.knowledge_id, kt.knowledge_type, kt.category, kt.category_type,
                   kt.question, kt.answer, kt.timer,
                   ko.options_id, ko.choises
            FROM knowledge_test kt
            LEFT JOIN knowledge_options ko ON kt.knowledge_id = ko.knowledge_id
            ORDER BY kt.knowledge_id ASC;
        """)
        rows = cursor.fetchall()
        conn.close()

        # Group options by question
        questions = {}
        for row in rows:
            qid = row["knowledge_id"]
            if qid not in questions:
                questions[qid] = {
                    "knowledge_id": qid,
                    "knowledge_type": row["knowledge_type"],
                    "category": row["category"],
                    "category_type": row.get("category_type"),
                    "question": row["question"],
                    "options": [],
                    "answer": row["answer"],
                    "timer": int(row["timer"])
                }

            if row["choises"]:
                questions[qid]["options"].append(row["choises"])
        print(list(questions.values()))

        return list(questions.values())

    except Exception as e:
        print(f"⚠️ ERROR in /api/knowledge-questions:", e)
        raise HTTPException(status_code=500, detail=str(e))


# 🟡 ADD question
@router.post("/api/knowledge-questions")
def add_knowledge_question(question: KnowledgeQuestion):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert into knowledge_test
        cursor.execute("""
            INSERT INTO knowledge_test (knowledge_type, category, category_type, question, answer, timer)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            question.knowledge_type,
            question.category,
            question.category_type,
            question.question,
            question.answer,
            question.timer or 60
        ))

        knowledge_id = cursor.lastrowid  # Get ID of inserted question

        # Insert options into knowledge_options
        for opt in question.options:
            cursor.execute("""
                INSERT INTO knowledge_options (knowledge_id, choises)
                VALUES (%s, %s)
            """, (knowledge_id, opt))

        conn.commit()
        conn.close()
        return {"message": "Question added successfully.", "knowledge_id": knowledge_id}

    except Exception as e:
        print("⚠️ ERROR adding question:", e)
        raise HTTPException(status_code=500, detail=str(e))


# 🟠 UPDATE question
@router.put("/api/knowledge-questions/{knowledge_id}")
def update_knowledge_question(knowledge_id: int, data: dict):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if question exists
        cursor.execute("SELECT knowledge_id FROM knowledge_test WHERE knowledge_id = %s;", (knowledge_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Question not found.")

        # 🔸 Dynamically build update fields
        fields = []
        values = []

        for field in ["knowledge_type", "category", "question", "answer", "timer", "category_type"]:
            if field in data:
                fields.append(f"{field} = %s")
                values.append(data[field])

        if fields:
            sql = f"UPDATE knowledge_test SET {', '.join(fields)} WHERE knowledge_id = %s"
            values.append(knowledge_id)
            cursor.execute(sql, tuple(values))

        # 🔹 Update ALL options if provided as a list
        if "options" in data and isinstance(data["options"], list):
            cursor.execute("DELETE FROM knowledge_options WHERE knowledge_id = %s;", (knowledge_id,))
            for opt in data["options"]:
                cursor.execute("""
                    INSERT INTO knowledge_options (knowledge_id, choises)
                    VALUES (%s, %s)
                """, (knowledge_id, opt))

        # 🔹 Update a SINGLE option if old/new provided
        elif "old_option" in data and "new_option" in data and data["old_option"] and data["new_option"]:
            cursor.execute("""
                UPDATE knowledge_options
                SET choises = %s
                WHERE knowledge_id = %s AND choises = %s
            """, (data["new_option"], knowledge_id, data["old_option"]))

        conn.commit()
        conn.close()

        return {"message": "Knowledge question updated successfully."}

    except Exception as e:
        print("⚠️ ERROR updating knowledge question:", e)
        raise HTTPException(status_code=500, detail=str(e))



# 🔴 DELETE question
@router.delete("/api/knowledge-questions")
def delete_knowledge_question(id: int = Query(...)):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check existence
        cursor.execute("SELECT knowledge_id FROM knowledge_test WHERE knowledge_id = %s;", (id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Question not found.")

        # Delete from both tables
        cursor.execute("DELETE FROM knowledge_options WHERE knowledge_id = %s;", (id,))
        cursor.execute("DELETE FROM knowledge_test WHERE knowledge_id = %s;", (id,))

        conn.commit()
        conn.close()

        return {"message": f"Question and its options deleted successfully (ID: {id})."}

    except Exception as e:
        print("⚠️ ERROR deleting question:", e)
        raise HTTPException(status_code=500, detail=str(e))
