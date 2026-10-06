"""PaddleOCR microservice used by the Node API (server/src/routes/ocr.ts).

Run:  .venv/Scripts/python -m uvicorn main:app --host 127.0.0.1 --port 8001
"""

import base64
import re
from statistics import mean

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from paddleocr import PaddleOCR
from pydantic import BaseModel

app = FastAPI(title="Hospital intake OCR")

# English only for now; add lang models later if Malayalam/Hindi cards are needed.
_ocr = PaddleOCR(
    lang="en",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    # Off: the line-orientation classifier misjudged left-aligned address lines beside a QR code and
    # garbled them ("S/O: Manoj P Varghese" -> "Lar4rjik"); documents are captured upright anyway.
    use_textline_orientation=False,
    # Paddle 3.x's oneDNN CPU path crashes on some machines ("ConvertPirAttribute2RuntimeAttribute").
    enable_mkldnn=False,
)

# Boxes whose vertical centres are within this fraction of the line height are on the same text row.
ROW_TOLERANCE = 0.6


class OcrRequest(BaseModel):
    image: str  # data URL or raw base64


class OcrResponse(BaseModel):
    text: str
    confidence: float  # 0-100, same scale as Tesseract
    lines: list[str]


def _decode(image: str) -> np.ndarray:
    payload = re.sub(r"^data:[^,]*,", "", image)
    try:
        raw = base64.b64decode(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="invalid_image") from exc
    decoded = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if decoded is None:
        raise HTTPException(status_code=400, detail="invalid_image")
    return decoded


def _rows(items: list[tuple[str, float, np.ndarray]]) -> list[str]:
    """Groups recognised boxes into text rows (top-to-bottom, left-to-right) so line-based parsing works."""
    boxed = []
    for text, _score, poly in items:
        ys, xs = poly[:, 1], poly[:, 0]
        boxed.append({"text": text, "x": float(xs.min()), "cy": float(ys.mean()), "h": float(ys.max() - ys.min())})
    boxed.sort(key=lambda b: b["cy"])

    rows: list[list[dict]] = []
    for box in boxed:
        if rows and abs(box["cy"] - mean(b["cy"] for b in rows[-1])) <= ROW_TOLERANCE * max(box["h"], 1):
            rows[-1].append(box)
        else:
            rows.append([box])
    return [" ".join(b["text"] for b in sorted(row, key=lambda b: b["x"])) for row in rows]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ocr", response_model=OcrResponse)
def run_ocr(request: OcrRequest) -> OcrResponse:
    result = _ocr.predict(_decode(request.image))
    if not result:
        return OcrResponse(text="", confidence=0, lines=[])

    page = result[0]
    texts = page["rec_texts"]
    scores = page["rec_scores"]
    polys = page["rec_polys"]
    items = [(t, float(s), np.asarray(p)) for t, s, p in zip(texts, scores, polys) if t.strip()]
    if not items:
        return OcrResponse(text="", confidence=0, lines=[])

    lines = _rows(items)
    return OcrResponse(
        text="\n".join(lines),
        confidence=round(mean(score for _t, score, _p in items) * 100, 1),
        lines=lines,
    )
