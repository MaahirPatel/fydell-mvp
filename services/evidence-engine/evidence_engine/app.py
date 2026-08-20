from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from evidence_engine.analyze import analyze

app = FastAPI(title="Fydell evidence engine", version="1")


class AnalyzeBody(BaseModel):
    job_type: str
    snapshot: dict


@app.post("/analyze")
def analyze_route(body: AnalyzeBody, authorization: str | None = Header(default=None)):
    secret = os.environ.get("EVIDENCE_ENGINE_SECRET", "")
    if secret:
        token = (authorization or "").removeprefix("Bearer ").strip()
        if token != secret:
            raise HTTPException(status_code=401, detail="unauthorized")
    result = analyze(body.job_type, body.snapshot)
    return {k: v for k, v in result.items() if v is not None}
