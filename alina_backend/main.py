import sys
import os
import importlib.util
import threading
import time
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. PATH & CONFIGURATION ---
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_path = Path(backend_dir).parent

config_path = os.path.join(backend_dir, "config.py")
spec = importlib.util.spec_from_file_location("local_config", config_path)
local_config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local_config)
EMPLOYEES = local_config.EMPLOYEES

# --- 2. LOCAL IMPORTS ---
from circle_client import get_balances
from decisions import evaluate
from logger import get_recent_decisions, init_db
from signals import get_usdc_yield

# --- 3. APP SETUP ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
init_db()

treasury_state = {
    "usdc_balance": 20.0,
    "usyc_balance": 12400.0,
}

# ✅ Helper: always returns a clean float from get_balances() dict
def fetch_usdc() -> float:
    try:
        result = get_balances()
        if isinstance(result, dict):
            return float(result.get("usdc_balance", treasury_state["usdc_balance"]))
        return float(result)
    except Exception:
        return treasury_state["usdc_balance"]

def agent_loop():
    while True:
        try:
            treasury_state["usdc_balance"] = fetch_usdc()
            evaluate(
                usdc_balance=treasury_state["usdc_balance"],
                usyc_balance=treasury_state["usyc_balance"]
            )
        except Exception as e:
            print(f"🤖 Agent Loop Error: {e}")
        time.sleep(60)

threading.Thread(target=agent_loop, daemon=True).start()

# --- 4. ENDPOINTS ---

def treasury_response():
    """Shared logic: real USDC + simulated USYC."""
    usdc = fetch_usdc()
    return {
        "usdc_balance": usdc,
        "usyc_balance": 12400.0,
        "total": usdc + 12400.0,
        "status": "Connected to Arc Testnet"
    }

# ✅ Both paths work — frontend can use either
@app.get("/treasury")
def treasury():
    return treasury_response()

@app.get("/api/treasury")
def treasury_api():
    return treasury_response()

@app.get("/signals")
def signals():
    return {"yield_rate": get_usdc_yield()}

@app.get("/decisions")
def decisions():
    real_history = get_recent_decisions()
    if not real_history:
        return [{
            "id": 0,
            "timestamp": "2026-02-28T18:00:00Z",
            "action": "MONITOR",
            "reasoning": ["Scanning Arc Testnet for yield signals..."],
            "execution": None
        }]
    return real_history

@app.get("/employees")
def employees():
    return EMPLOYEES

@app.post("/trigger")
def trigger():
    """Manual trigger for judge demonstrations."""
    usdc = fetch_usdc()
    result = evaluate(
        usdc_balance=usdc,
        usyc_balance=treasury_state["usyc_balance"]
    )
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")