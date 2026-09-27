import os

import librosa
import torch
from peft import PeftModel
from transformers import WhisperForConditionalGeneration, WhisperProcessor


BASE_MODEL = "openai/whisper-medium"
ADAPTER_MODEL = "algerian-nlp/Hadra-ASR-whisper-medium"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


print("Loading ASR model...")

processor = WhisperProcessor.from_pretrained(BASE_MODEL)

base_model = WhisperForConditionalGeneration.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
)

model = PeftModel.from_pretrained(
    base_model,
    ADAPTER_MODEL,
)

model = model.to(DEVICE)
model.eval()

print(f"ASR ready on {DEVICE}")


def transcribe(audio_path: str) -> str:
    """
    Transcribe an audio file using Hadra Whisper Medium.
    """

    audio, sample_rate = librosa.load(
        audio_path,
        sr=16000,
        mono=True,
    )

    input_features = processor(
        audio,
        sampling_rate=16000,
        return_tensors="pt",
    ).input_features

    input_features = input_features.to(DEVICE)

    if DEVICE == "cuda":
        input_features = input_features.half()

    with torch.no_grad():
        generated_ids = model.generate(
            input_features=input_features,
            language="arabic",
            task="transcribe",
            max_new_tokens=200,
        )

    transcript = processor.batch_decode(
        generated_ids,
        skip_special_tokens=True,
    )[0]

    return transcript.strip()