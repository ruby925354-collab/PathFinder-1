from fastapi import APIRouter, HTTPException
from fastapi import UploadFile, File, Response
import tempfile
import os
import subprocess
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()

class PersonalityScores(BaseModel):
    r_score: int | None = 0
    i_score: int | None = 0
    a_score: int | None = 0
    s_score: int | None = 0
    e_score: int | None = 0
    c_score: int | None = 0

@router.get("/api/user/{user_id}/report-data")
def get_user_report_data(user_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # 🧩 1️⃣ Fetch User Info (name + email)
            cursor.execute("""
                SELECT first_name, middle_name, last_name, extension, email
                FROM user_information
                WHERE user_id = %s
            """, (user_id,))
            user_info = cursor.fetchone()

            if not user_info:
                raise HTTPException(status_code=404, detail="User not found")

            full_name_parts = [
                user_info.get("first_name", ""),
                user_info.get("middle_name", ""),
                user_info.get("last_name", ""),
                user_info.get("extension", "")
            ]
            full_name = " ".join([part for part in full_name_parts if part]).strip()

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

            # 🧩 3️⃣ Knowledge Scores and Percentages
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

            # Percentages & strand
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
                    "Mathematics": "math_%",
                    "English": "english_%",
                    "Filipino": "filipino_%",
                    "Science": "science_%",
                    "Reading_Comprehension": "rc_%",
                    "Logical_Reasoning": "lr_%",
                    "Technology": "tech_%",
                    "Engineering": "engineer_%",
                    "Business": "business_%",
                    "Management": "manage_%",
                    "Humanities": "human_%",
                    "Accountancy": "acc_%",
                    "Social_Science": "ss_%"
                }
                for db_col, key in percent_map.items():
                    value = percent_row.get(db_col, 0.0)
                    knowledge_scores[key] = round(float(value) * 100, 2)

            # 🧩 4️⃣ Recommended Programs (Top 3)
            cursor.execute("""
                SELECT p.program_name, p.program_details
                FROM user_recommended_program urp
                JOIN program_information p ON urp.program_id = p.program_id
                WHERE urp.user_id = %s
                ORDER BY urp.program_rank ASC
                LIMIT 3;
            """, (user_id,))
            programs = cursor.fetchall()

            recommended = []
            for row in programs:
                recommended.append({
                    "program_name": row["program_name"],
                    "program_details": row["program_details"]
                })

            # 🧩 Combine all sections
            result = {
                "full_name": full_name,
                "email": user_info["email"],
                **personality_scores,
                **knowledge_scores,
                "program1": recommended[0]["program_name"] if len(recommended) > 0 else "",
                "description1": recommended[0]["program_details"] if len(recommended) > 0 else "",
                "program2": recommended[1]["program_name"] if len(recommended) > 1 else "",
                "description2": recommended[1]["program_details"] if len(recommended) > 1 else "",
                "program3": recommended[2]["program_name"] if len(recommended) > 2 else "",
                "description3": recommended[2]["program_details"] if len(recommended) > 2 else "",
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

        result = subprocess.run(
            [
                "libreoffice",
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
