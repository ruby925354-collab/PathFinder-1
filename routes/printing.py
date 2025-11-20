from fastapi import APIRouter, HTTPException
from fastapi import UploadFile, File, Response
import tempfile
import os
import subprocess
from pydantic import BaseModel
from database import get_db_connection
from pydantic import BaseModel

router = APIRouter()

class PersonalityScores(BaseModel):
    r_score: int | None = 0
    i_score: int | None = 0
    a_score: int | None = 0
    s_score: int | None = 0
    e_score: int | None = 0
    c_score: int | None = 0

class VisibilityUpdate(BaseModel):
    visibility: str  # "public" or "private"
@router.get("/api/user/{user_id}/visibility")
def get_user_visibility(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                SELECT visibility 
                FROM user_information 
                WHERE user_id = %s
            """, (user_id,))

            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="User not found")

            return {"visibility": row["visibility"]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/user/{user_id}/visibility")
def update_user_visibility(user_id: int, data: VisibilityUpdate):
    if data.visibility not in ["public", "private"]:
        raise HTTPException(status_code=400, detail="Invalid visibility value")

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE user_information
                SET visibility = %s
                WHERE user_id = %s
            """, (data.visibility, user_id))

            conn.commit()

            return {"message": "Visibility updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/user/{user_id}/report-data")
def get_user_report_data(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # 🧩 1️⃣ Fetch User Info
            cursor.execute("""
                SELECT first_name, middle_name, last_name, extension, email
                FROM user_information
                WHERE user_id = %s
            """, (user_id,))
            user_info = cursor.fetchone()

            if not user_info:
                raise HTTPException(status_code=404, detail="User not found")

            full_name = " ".join([
                user_info.get("first_name") or "",
                user_info.get("middle_name") or "",
                user_info.get("last_name") or "",
                user_info.get("extension") or ""
            ]).strip()

            # 🆔 Fetch Information ID (12-digit padded)
            cursor.execute("""
                SELECT information_id 
                FROM information
                WHERE user_id = %s
            """, (user_id,))
            info_row = cursor.fetchone()

            information_id = ""
            if info_row:
                information_id = str(info_row["information_id"]).zfill(12)

            # 🧩 2️⃣ Personality Scores
            cursor.execute("""
                SELECT p.personality_type, SUM(upt.answer) AS total_score
                FROM user_personality_test upt
                JOIN personality_test pt ON upt.personality_test_id = pt.personality_test_id
                JOIN personality p ON pt.personality_id = p.personality_id
                WHERE upt.user_id = %s
                GROUP BY p.personality_type
            """, (user_id,))
            personality_rows = cursor.fetchall()

            personality_scores = {
                "r_score": 0, "i_score": 0, "a_score": 0,
                "s_score": 0, "e_score": 0, "c_score": 0
            }
            mapping = {
                "Realistic": "r_score", "Investigative": "i_score",
                "Artistic": "a_score", "Social": "s_score",
                "Enterprising": "e_score", "Conventional": "c_score"
            }
            for row in personality_rows:
                key = mapping.get(row["personality_type"])
                if key:
                    personality_scores[key] = row["total_score"]

            # 🧩 3️⃣ Knowledge Test Scores
            cursor.execute("""
                SELECT kt.category,
                       COUNT(*) AS total_items,
                       SUM(CASE WHEN ukt.score = 1 THEN 1 ELSE 0 END) AS correct_answers
                FROM user_knowledge_test ukt
                JOIN knowledge_test kt ON ukt.knowledge_id = kt.knowledge_id
                WHERE ukt.user_id = %s
                GROUP BY kt.category;
            """, (user_id,))
            test_results = cursor.fetchall()

            knowledge_scores = {
                "math_score": "0/0", "english_score": "0/0", "filipino_score": "0/0",
                "science_score": "0/0", "lr_score": "0/0", "rc_score": "0/0",
                "tech_score": "0/0", "engineer_score": "0/0", "business_score": "0/0",
                "manage_score": "0/0", "human_score": "0/0", "acc_score": "0/0", "ss_score": "0/0",
                "strand": ""
            }

            category_map = {
                "Mathematics": "math_score",
                "English": "english_score",
                "Filipino": "filipino_score",
                "Science": "science_score",
                "Logical Reasoning": "lr_score",
                "Reading Comprehension": "rc_score",
                "Technology": "tech_score",
                "Engineering": "engineer_score",
                "Business": "business_score",
                "Management": "manage_score",
                "Humanities": "human_score",
                "Accountancy": "acc_score",
                "Social Science": "ss_score"
            }

            for row in test_results:
                key = category_map.get(row["category"])
                if key:
                    correct = row["correct_answers"] or 0
                    total = row["total_items"] or 0
                    knowledge_scores[key] = f"{correct}/{total}"

            # 🧩 3B️⃣ Percentages
            cursor.execute("""
                SELECT *
                FROM user_scholastic_knowledge_test
                WHERE user_id = %s
                ORDER BY user_sk_id DESC
                LIMIT 1;
            """, (user_id,))
            percent_row = cursor.fetchone()

            if percent_row:
                knowledge_scores["strand"] = percent_row.get("strand", "")
                percent_map = {
                    "Mathematics": "math_%", "English": "english_%",
                    "Filipino": "filipino_%", "Science": "science_%",
                    "Reading_Comprehension": "rc_%", "Logical_Reasoning": "lr_%",
                    "Technology": "tech_%", "Engineering": "engineer_%",
                    "Business": "business_%", "Management": "manage_%",
                    "Humanities": "human_%", "Accountancy": "acc_%",
                    "Social_Science": "ss_%"
                }
                for db_col, key in percent_map.items():
                    knowledge_scores[key] = round(float(percent_row.get(db_col, 0.0)) * 100, 2)

            # 🧩 4️⃣ Recommended Programs
            cursor.execute("""
                SELECT p.program_name, p.program_details
                FROM user_recommended_program urp
                JOIN program_information p ON urp.program_id = p.program_id
                WHERE urp.user_id = %s
                ORDER BY urp.program_rank ASC
                LIMIT 3;
            """, (user_id,))
            programs = cursor.fetchall()

            recommended = [
                {
                    "program_name": p["program_name"],
                    "program_details": p["program_details"]
                }
                for p in programs
            ]

            # Scholastic Records
            cursor.execute("""
                SELECT strand
                FROM user_scholastic_knowledge_test
                WHERE user_id = %s
                ORDER BY user_sk_id DESC
                LIMIT 1;
            """, (user_id,))
            strand_row = cursor.fetchone()

            scholastic_data = []

            if strand_row:
                cursor.execute("""
                    SELECT s.scholastic_id, s.grade_level, s.semester, s.subjects,
                           usr.grade
                    FROM scholastic_record s
                    LEFT JOIN user_scholastic_record usr 
                        ON usr.scholastic_id = s.scholastic_id
                        AND usr.user_id = %s
                    WHERE s.strand = %s
                    ORDER BY s.grade_level ASC, s.semester ASC, s.scholastic_id ASC;
                """, (user_id, strand_row["strand"]))

                for row in cursor.fetchall():
                    scholastic_data.append({
                        "grade_level": row["grade_level"],
                        "semester": row["semester"],
                        "subject": row["subjects"],
                        "grade": row["grade"] if row["grade"] is not None else ""
                    })

            # 🧩 6️⃣ Convert scholastic data → DOCX placeholders
            MAX_ROWS = 40  # number of rows in your DOCX
            scholastic_flat = []

            for r in scholastic_data:
                scholastic_flat.append({
                    "subject": r["subject"],
                    "semester": str(r["semester"]),
                    "grades": r["grade"] if r["grade"] != "" else "N/A"
                })

            while len(scholastic_flat) < MAX_ROWS:
                scholastic_flat.append({"subject": "", "semester": "", "grades": ""})

            # Build placeholders
            scholastic_placeholders = {}
            for i in range(MAX_ROWS):
                scholastic_placeholders[f"subject{i+1}"] = scholastic_flat[i]["subject"]
                scholastic_placeholders[f"semester{i+1}"] = scholastic_flat[i]["semester"]
                scholastic_placeholders[f"grades{i+1}"] = scholastic_flat[i]["grades"]

            # 🧩 7️⃣ Final Result
            result = {
                "full_name": full_name,
                "email": user_info["email"],
                "information_id": information_id,
                **personality_scores,
                **knowledge_scores,
                "program1": recommended[0]["program_name"] if len(recommended) > 0 else "",
                "description1": recommended[0]["program_details"] if len(recommended) > 0 else "",
                "program2": recommended[1]["program_name"] if len(recommended) > 1 else "",
                "description2": recommended[1]["program_details"] if len(recommended) > 1 else "",
                "program3": recommended[2]["program_name"] if len(recommended) > 2 else "",
                "description3": recommended[2]["program_details"] if len(recommended) > 2 else "",
                **scholastic_placeholders
            }

            return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/api/convert-pdf")
async def convert_to_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    try:
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_docx:
            tmp_docx.write(contents)
            tmp_docx_path = tmp_docx.name

        pdf_path = tmp_docx_path.replace(".docx", ".pdf")

        # ✅ Use the full path to soffice.exe
        soffice_path = "/usr/bin/soffice"

        result = subprocess.run(
            [
                soffice_path,  # <--- use the full path here
                "--headless",
                "--convert-to", "pdf",
                "--outdir", os.path.dirname(pdf_path),
                tmp_docx_path
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"LibreOffice error: {result.stderr}")

        with open(pdf_path, "rb") as pdf_file:
            pdf_bytes = pdf_file.read()

        os.remove(tmp_docx_path)
        os.remove(pdf_path)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={file.filename.replace('.docx', '.pdf')}"}
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="PDF conversion timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting file: {e}")
    
@router.get("/information/{information_id}")
def get_information_user(information_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                SELECT user_id 
                FROM information
                WHERE information_id = %s
            """, (information_id,))

            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Invalid information ID")

            return row

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

