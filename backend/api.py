import os
import tempfile

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pipeline import get_summary, process_audio


app = FastAPI(
    title="Algerian Financial Assistant API",
    version="0.1.0",
)

# Minimal local-dev CORS so the Next.js frontend can call the API
# directly from the browser. No wildcard: only the local dev origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "Algerian Financial Assistant",
        "status": "running",
    }


@app.post("/process")
async def process(file: UploadFile = File(...)):
    """
    Process one audio file through:
    ASR → Groq extraction → validation → storage
    """

    suffix = os.path.splitext(file.filename or ".wav")[1]

    audio_bytes = await file.read()

    if not audio_bytes:
        return JSONResponse(
            status_code=400,
            content={"error": "Empty audio file."},
        )

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp:
            temp.write(audio_bytes)
            temp_path = temp.name

        result = process_audio(temp_path)

        return result

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"error": str(exc)},
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@app.get("/summary")
async def summary():
    return get_summary()