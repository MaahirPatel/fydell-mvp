"""Request signing. Merchants verify ``Kestrel-Signature`` with their secret."""

from __future__ import annotations

import hashlib
import hmac


def sign(secret: str, timestamp: int, body: bytes) -> str:
    signed = str(timestamp).encode() + b"." + body
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


def verify(secret: str, header: str, body: bytes) -> bool:
    try:
        parts = dict(item.split("=", 1) for item in header.split(","))
        timestamp = int(parts["t"])
    except (KeyError, ValueError):
        return False
    return hmac.compare_digest(sign(secret, timestamp, body), header)
