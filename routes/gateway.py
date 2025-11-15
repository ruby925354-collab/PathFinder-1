from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()

# Map user-friendly names to backend URLs
MODEL_BACKENDS = {
    "minichat": "http://localhost:8001",
    "qwen": "http://localhost:8002",
    # add more as needed
}

@router.post("/generate")
async def generate(payload: dict):
    model = payload.get("model", "minichat")  # default to minichat
    text = payload.get("text")

    if model not in MODEL_BACKENDS:
        return {"error": "Model not available"}

    backend_url = MODEL_BACKENDS[model] + "/chat"  # your LLM backend endpoint

    async with httpx.AsyncClient() as client:
        res = await client.post(backend_url, json=payload)
        return res.json()
