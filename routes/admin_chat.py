from fastapi import APIRouter, HTTPException
from datetime import datetime
from database import get_db_connection
from pydantic import BaseModel

router = APIRouter()

# -------------------------
# Pydantic Models
# -------------------------
class UserMessage(BaseModel):
    user_id: int
    conversation_id: int | None = None
    message: str

class AdminReply(BaseModel):
    conversation_id: int
    message: str

# ------------------------------------------------------
# ADMIN — Get all conversations
# ------------------------------------------------------
@router.get("/conversations")
def get_all_conversations():
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
           SELECT 
            ac.id AS conversation_id,
            ac.user_id,
            CONCAT_WS(' ', ui.first_name, ui.middle_name, ui.last_name, ui.extension) AS fullname,
            ac.status,
            ac.created_at,
            ac.updated_at,

            -- Latest message text
            (
                SELECT message
                FROM admin_messages
                WHERE conversation_id = ac.id
                ORDER BY created_at DESC
                LIMIT 1
            ) AS last_message,

            -- Who sent last message
            (
                SELECT sender
                FROM admin_messages
                WHERE conversation_id = ac.id
                ORDER BY created_at DESC
                LIMIT 1
            ) AS last_sender,

            -- Count of all user messages
            (
                SELECT COUNT(*)
                FROM admin_messages
                WHERE conversation_id = ac.id
                AND sender = 'user'
            ) AS total_user_messages

        FROM admin_conversations ac
        JOIN user_information ui ON ui.user_id = ac.user_id
        ORDER BY ac.updated_at DESC;

        """)

        conversations = cursor.fetchall()

    return conversations

# ------------------------------------------------------
# USER — Send message (Create or continue conversation)
# ------------------------------------------------------
@router.post("/")
def user_send_message(data: UserMessage):
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        # If conversation id is not provided → find open convo
        if not data.conversation_id:
            cursor.execute("""
                SELECT id FROM admin_conversations
                WHERE user_id = %s AND status = 'open'
            """, (data.user_id,))
            convo = cursor.fetchone()

            if convo:
                conversation_id = convo["id"]
            else:
                # Create a new conversation
                cursor.execute("""
                    INSERT INTO admin_conversations (user_id, status)
                    VALUES (%s, 'open')
                """, (data.user_id,))
                conn.commit()
                conversation_id = cursor.lastrowid
        else:
            conversation_id = data.conversation_id

        # Save the user message
        cursor.execute("""
            INSERT INTO admin_messages (conversation_id, sender, message)
            VALUES (%s, 'user', %s)
        """, (conversation_id, data.message))
        conn.commit()

    return {
        "conversation_id": conversation_id,
        "reply": "Your message has been sent. An admin will respond soon."
    }

# ------------------------------------------------------
# ADMIN — Load messages using conversation_id
# ------------------------------------------------------
@router.get("/conversation/{conversation_id}")
def load_conversation(conversation_id: int):
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, sender, message, created_at
            FROM admin_messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC
        """, (conversation_id,))
        
        messages = cursor.fetchall()

    return {"messages": messages}

# ------------------------------------------------------
# ADMIN — Check if new messages arrived (polling)
# ------------------------------------------------------
@router.get("/check-new/{conversation_id}/{last_id}")
def check_new_messages(conversation_id: int, last_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                SELECT id, sender, message, created_at
                FROM admin_messages
                WHERE conversation_id = %s
                ORDER BY id DESC
                LIMIT 1
            """, (conversation_id,))

            msg = cursor.fetchone()

            if not msg:
                return {"new": False}

            # Compare message IDs
            if msg["id"] == last_id:
                return {"new": False}

            return {
                "new": True,
                "message": msg
            }

    except Exception as e:
        print("check-new error:", e)
        raise HTTPException(status_code=500, detail="Server error")


# ------------------------------------------------------
#  ADMIN — Reply to user
# ------------------------------------------------------
@router.post("/reply")
def admin_reply(data: AdminReply):
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)

        # Save admin message
        cursor.execute("""
            INSERT INTO admin_messages (conversation_id, sender, message)
            VALUES (%s, 'admin', %s)
        """, (data.conversation_id, data.message))
        conn.commit()

    return {"status": "success", "message": "Reply sent."}

# ------------------------------------------------------
# USER — Load conversation history
# ------------------------------------------------------
@router.get("/{user_id}")
def get_user_conversation(user_id: int):
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id FROM admin_conversations
            WHERE user_id = %s AND status = 'open'
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,))
        conversation = cursor.fetchone()

        if not conversation:
            return {
                "conversation_id": None,
                "messages": []
            }

        conversation_id = conversation["id"]

        cursor.execute("""
            SELECT id, sender, message, created_at
            FROM admin_messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC
        """, (conversation_id,))
        messages = cursor.fetchall()

    return {
        "conversation_id": conversation_id,
        "messages": messages
    }
