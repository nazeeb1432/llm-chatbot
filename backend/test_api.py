# How to run:
#   1. Start the server:  uvicorn app.main:app --reload --port 8000
#   2. Run this script:   python test_api.py

import asyncio
import httpx

BASE_URL = "http://localhost:8000"


def _result(label: str, passed: bool, detail: str = "") -> None:
    status = "PASS" if passed else "FAIL"
    suffix = f"  ({detail})" if detail else ""
    print(f"[{status}] {label}{suffix}")


async def run_tests() -> None:
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # ── 1. GET /health ────────────────────────────────────────────────────
        try:
            r = await client.get("/health")
            body = r.json()
            ok = r.status_code == 200 and body.get("status") == "ok" and "model" in body
            _result(
                "GET /health → 200 with {status, model}",
                ok,
                f"status={r.status_code} body={body}",
            )
        except Exception as exc:
            _result("GET /health → 200 with {status, model}", False, str(exc))

        # ── 2. GET /api/history without auth ─────────────────────────────────
        try:
            r = await client.get("/api/history")
            ok = r.status_code == 401
            _result(
                "GET /api/history (no auth) → 401",
                ok,
                f"status={r.status_code}",
            )
        except Exception as exc:
            _result("GET /api/history (no auth) → 401", False, str(exc))

        # ── 3. POST /api/chat without auth ────────────────────────────────────
        try:
            r = await client.post("/api/chat", json={"message": "hello"})
            ok = r.status_code == 401
            _result(
                "POST /api/chat (no auth) → 401",
                ok,
                f"status={r.status_code}",
            )
        except Exception as exc:
            _result("POST /api/chat (no auth) → 401", False, str(exc))


if __name__ == "__main__":
    asyncio.run(run_tests())
