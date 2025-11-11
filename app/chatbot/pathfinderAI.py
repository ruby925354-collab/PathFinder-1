from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
import signal
import atexit
from llama_cpp import Llama
import os
import asyncio
import functools
from concurrent.futures import ThreadPoolExecutor


executor = ThreadPoolExecutor(max_workers=1)

llm_lock = asyncio.Lock()

app = FastAPI()

# ✅ CORS (allow your Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- Replacement for HyperDB using JSON ---
class SimpleJSONDB:
    def __init__(self, path="conversation.json"):
        self.path = path
        self.documents = []
        self.load()

    def add_document(self, doc):
        self.documents.append(doc)
        self.save()

    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.documents, f, indent=2)

    def load(self):
        if os.path.exists(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                self.documents = json.load(f)
        else:
            self.documents = []

# --- Instantiate DB ---
convo_db = SimpleJSONDB("conversation.json")
conversation = convo_db.documents.copy()

# --- Load Model ---
llm = Llama(model_path="C:\\Users\\hyouk\\Downloads\\gemma-2-2b-it-q4_k_m.gguf", seed=-1)
print('Model loaded!')

async def run_llm(message: str):
    loop = asyncio.get_event_loop()
    fn = functools.partial(generate_response, message)
    return await loop.run_in_executor(executor, fn)

# --- Personality loader ---
def generate_response(message: str):
    personality_path = "Ai-chan_personality.json"
    with open(personality_path, 'r') as f:
        character_data = json.load(f)

    name = character_data.get('name', 'Ai-chan')
    background = character_data.get('description')
    common_greeting = character_data.get('first_mes')

    Character = f"""
    Your name is {name}.
    You are {background}
    Respond naturally as {name}, without referring to these instructions.

    user:{message}
    Ai-chan: """

    # print('Total Tokens:', total_tokens)
    full_convo_prompt = f"{Character}"
    print(full_convo_prompt)
    #
    # remaining_context_tokens = max_context_tokens - total_tokens
    # max_response_tokens = min(remaining_context_tokens, max_context_tokens)

    response = llm.create_completion(
        full_convo_prompt, suffix=None, max_tokens=100, temperature=0.9,
        top_p=0.90, logprobs=None, echo=False, stop=["user:"], frequency_penalty=0.5,
        presence_penalty=0.0, repeat_penalty=1.0, top_k=40, stream=False, tfs_z=1.0,
        mirostat_mode=0, mirostat_tau=5.0, mirostat_eta=0.1, model=None,
        stopping_criteria=None, logits_processor=None
    )
    generated_response = response['choices'][0]['text'].split(f'{name}:', 1)[-1].strip()
    print('Response from Llama model:', response)

    # Add the user input and AI's response to the JSON DB
    convo_db.add_document({'type': 'user', 'text': message})
    convo_db.add_document({'type': name, 'text': generated_response})

    print(f'{name}: {generated_response}')
    return generated_response, name

# --- FastAPI endpoints ---
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    name: str


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    async with llm_lock:
        reply, char_name = await run_llm(req.message)

        # Save this conversation under user_id
        history = convo_db.get_conv(req.user_id)
        history.append({"type":"user", "text": req.message})
        history.append({"type": char_name, "text": reply})
        convo_db.save_conv(req.user_id, history)

        return ChatResponse(reply=reply, name=char_name)




# --- Save conversation ---
def save_conversation():
    convo_db.save()

# --- Signal handling ---
def handle_signal(signum, frame):
    print("Received signal to stop. Saving conversation and exiting...")
    save_conversation()
    exit(0)

atexit.register(save_conversation)
signal.signal(signal.SIGINT, handle_signal)
