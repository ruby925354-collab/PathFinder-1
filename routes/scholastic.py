from fastapi import APIRouter, HTTPException, Query, Body, status
from typing import Dict, List, Any
from database import get_db_connection
from fastapi.responses import JSONResponse

router = APIRouter()


# ✅ GET all or filtered scholastic records
@router.get("/api/scholastic-records")
def get_scholastic_records(strand: str, grade_level: int, semester: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Fetch all records for this combination
        cursor.execute("""
            SELECT scholastic_id, subjects
            FROM scholastic_record
            WHERE strand=%s AND grade_level=%s AND semester=%s
            ORDER BY scholastic_id ASC
        """, (strand, grade_level, semester))
        records = cursor.fetchall()

        result = []
        for rec in records:
            cursor.execute("""
                SELECT category FROM scholastic_categories
                WHERE scholastic_id=%s
            """, (rec["scholastic_id"],))
            categories = [row["category"] for row in cursor.fetchall()]
            result.append({
                "scholastic_id": rec["scholastic_id"],
                "subjects": rec["subjects"],
                "categories": categories
            })
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ✅ POST (Add new subject with one or multiple categories)
@router.post("/api/scholastic-records", status_code=status.HTTP_201_CREATED)
def add_scholastic_record(data: Dict[str, Any] = Body(...)):
    strand = data.get("strand")
    grade_level = data.get("grade_level")
    semester = data.get("semester")
    subject = data.get("subject")
    categories: List[str] = data.get("category", [])

    if not all([strand, grade_level, semester, subject]):
        raise HTTPException(status_code=400, detail="Missing required fields.")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Insert main subject
        cursor.execute("""
            INSERT INTO scholastic_record (strand, grade_level, semester, subjects)
            VALUES (%s, %s, %s, %s)
        """, (strand, grade_level, semester, subject))
        scholastic_id = cursor.lastrowid

        # Insert linked categories
        for cat in categories:
            cursor.execute("""
                INSERT INTO scholastic_categories (scholastic_id, category)
                VALUES (%s, %s)
            """, (scholastic_id, cat))

        conn.commit()
        return {"message": "Record added successfully", "scholastic_id": scholastic_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ✅ PUT (Update subject or its categories)
@router.put("/api/scholastic-records")
def update_scholastic_record(data: Dict[str, Any] = Body(...)):
    strand = data.get("strand")
    grade_level = data.get("grade_level")
    semester = data.get("semester")
    old_subject = data.get("oldSubject")
    new_subject = data.get("newSubject")
    categories: List[str] = data.get("category", [])

    if not all([strand, grade_level, semester, old_subject, new_subject]):
        raise HTTPException(status_code=400, detail="Missing required fields.")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Find scholastic_id
        cursor.execute("""
            SELECT scholastic_id FROM scholastic_record
            WHERE strand=%s AND grade_level=%s AND semester=%s AND subjects=%s
        """, (strand, grade_level, semester, old_subject))
        record = cursor.fetchone()

        if not record:
            raise HTTPException(status_code=404, detail="Record not found.")

        scholastic_id = record["scholastic_id"]

        # Update subject name
        cursor.execute("""
            UPDATE scholastic_record SET subjects=%s WHERE scholastic_id=%s
        """, (new_subject, scholastic_id))

        # Replace categories
        cursor.execute("DELETE FROM scholastic_categories WHERE scholastic_id=%s", (scholastic_id,))
        for cat in categories:
            cursor.execute("""
                INSERT INTO scholastic_categories (scholastic_id, category)
                VALUES (%s, %s)
            """, (scholastic_id, cat))

        conn.commit()
        return {"message": f"Subject '{new_subject}' updated successfully with new categories."}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ✅ DELETE (Remove subject and its categories — cascade)
@router.delete("/api/scholastic-records", status_code=status.HTTP_204_NO_CONTENT)
def delete_scholastic_record(data: Dict[str, Any] = Body(...)):
    strand = data.get("strand")
    grade_level = data.get("grade_level")
    semester = data.get("semester")
    subject = data.get("subject")

    if not all([strand, grade_level, semester, subject]):
        raise HTTPException(status_code=400, detail="Missing required fields.")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Find scholastic_id to delete
        cursor.execute("""
            SELECT scholastic_id FROM scholastic_record
            WHERE strand=%s AND grade_level=%s AND semester=%s AND subjects=%s
        """, (strand, grade_level, semester, subject))
        record = cursor.fetchone()

        if not record:
            raise HTTPException(status_code=404, detail="Subject not found.")

        scholastic_id = record["scholastic_id"]

        # Delete main record (categories will cascade delete)
        cursor.execute("DELETE FROM scholastic_record WHERE scholastic_id=%s", (scholastic_id,))
        conn.commit()

        return JSONResponse(status_code=204, content={"message": "Subject deleted successfully."})
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
