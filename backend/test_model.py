import os
import time
import torch
import librosa

from transformers import (
    WhisperProcessor,
    WhisperForConditionalGeneration,
)
from peft import PeftModel


# ============================================================
# CONFIG
# ============================================================

BASE_MODEL = "openai/whisper-medium"
HADRA_MODEL = "algerian-nlp/Hadra-ASR-whisper-medium"

AUDIO_DIR = "audio"
RESULTS_DIR = "results"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ============================================================
# BASIC INFORMATION
# ============================================================

print("=" * 60)
print("HADRA ASR - LOCAL TEST")
print("=" * 60)

print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"Device: {DEVICE}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(
        f"GPU memory: "
        f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB"
    )

print("=" * 60)


# ============================================================
# LOAD PROCESSOR
# ============================================================
#
# IMPORTANT:
# We deliberately load the processor from the BASE Whisper model.
#
# The Hadra model card currently documents a processor-config
# compatibility problem in its own repository. The feature
# extractor itself loads correctly, but we avoid depending on
# Hadra's problematic processor configuration.
#
# The actual ASR weights still come from:
# Whisper Medium + Hadra LoRA adapter.
# ============================================================

print("\n[1/4] Loading Whisper processor...")

processor = WhisperProcessor.from_pretrained(BASE_MODEL)

print("Processor loaded successfully.")


# ============================================================
# LOAD WHISPER BASE MODEL
# ============================================================

print("\n[2/4] Loading Whisper Medium base model...")
print("This may take a while the first time.")
print("The base model will be downloaded from Hugging Face.")

model = WhisperForConditionalGeneration.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float16,
)

print("Whisper Medium loaded.")


# ============================================================
# LOAD HADRA LORA ADAPTER
# ============================================================

print("\n[3/4] Loading Hadra Medium LoRA adapter...")

model = PeftModel.from_pretrained(
    model,
    HADRA_MODEL,
)

print("Hadra adapter loaded successfully.")

# Put model on GPU
model = model.to(DEVICE)

model.eval()

print("Model moved to:", DEVICE)


# ============================================================
# AUDIO TRANSCRIPTION FUNCTION
# ============================================================

def transcribe(audio_path):
    print("\n" + "-" * 60)
    print(f"FILE: {audio_path}")
    print("-" * 60)

    # Load audio as mono, 16 kHz
    audio, sample_rate = librosa.load(
        audio_path,
        sr=16000,
        mono=True,
    )

    duration = len(audio) / sample_rate

    print(f"Duration: {duration:.2f} seconds")
    print(f"Sample rate: {sample_rate} Hz")

    # Convert audio to Whisper input features
    inputs = processor(
        audio,
        sampling_rate=16000,
        return_tensors="pt",
    )

    input_features = inputs.input_features.to(
        DEVICE,
        dtype=torch.float16,
    )

    # Reset GPU memory statistics
    if torch.cuda.is_available():
        torch.cuda.reset_peak_memory_stats()

    # Run inference
    start_time = time.time()

    with torch.inference_mode():
        generated_ids = model.generate(
            input_features=input_features,
            language="arabic",
            task="transcribe",
            max_new_tokens=200,
)

    elapsed = time.time() - start_time

    # Decode
    text = processor.batch_decode(
        generated_ids,
        skip_special_tokens=True,
    )[0]

    print(f"Transcription: {text}")
    print(f"Inference time: {elapsed:.2f} seconds")

    if duration > 0:
        print(f"Real-time factor: {elapsed / duration:.2f}x")

    if torch.cuda.is_available():
        peak_memory = torch.cuda.max_memory_allocated() / 1024**3
        print(f"Peak GPU memory: {peak_memory:.2f} GB")

    return text


# ============================================================
# RUN ALL WAV FILES
# ============================================================

audio_files = [
    os.path.join(AUDIO_DIR, filename)
    for filename in os.listdir(AUDIO_DIR)
    if filename.lower().endswith(".wav")
]

audio_files.sort()

if not audio_files:
    print("\nNo WAV files found in the audio folder.")
    raise SystemExit(1)


print("\n[4/4] Starting transcription tests...")
print(f"Found {len(audio_files)} WAV files.")


results = []

for audio_path in audio_files:
    try:
        text = transcribe(audio_path)

        results.append(
            {
                "file": os.path.basename(audio_path),
                "transcription": text,
            }
        )

    except torch.cuda.OutOfMemoryError:
        print("\n!!! CUDA OUT OF MEMORY !!!")
        print("The model does not fit in the current configuration.")
        print("Stopping the test.")

        torch.cuda.empty_cache()
        break

    except Exception as e:
        print(f"\nERROR processing {audio_path}")
        print(type(e).__name__)
        print(str(e))

        results.append(
            {
                "file": os.path.basename(audio_path),
                "transcription": f"ERROR: {type(e).__name__}: {e}",
            }
        )


# ============================================================
# SAVE RESULTS
# ============================================================

results_path = os.path.join(
    RESULTS_DIR,
    "transcriptions.txt",
)

with open(
    results_path,
    "w",
    encoding="utf-8",
) as f:

    for result in results:
        f.write(f"FILE: {result['file']}\n")
        f.write(f"TEXT: {result['transcription']}\n")
        f.write("-" * 60 + "\n")


print("\n" + "=" * 60)
print("TEST FINISHED")
print("=" * 60)

print(f"Results saved to: {results_path}")