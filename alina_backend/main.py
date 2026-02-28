import sys
import os
import importlib.util
import threading
import time
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. PATH & CONFIGURATION FIX ---
# Define paths to find 'services' and the local 'config.py'
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_path = Path(backend_dir).parent

# Force-load the LOCAL config.py to avoid root shadowing
config_path = os.path.join(backend_dir, "config.py")
spec = importlib.util.spec_from_file_location("local_config", config_path)
local_config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local_config)

# Map variables needed for the FastAPI routes
EMPLOYEES = local_config.EMPLOYEES

# Add root to sys.path to find 'services/circle_client.py'
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

# --- 2. INTERNAL MODULE IMPORTS ---
# These now work because pathing is resolved
from decisions import evaluate
from logger import get_recent_decisions, init_db
from signals import get_usdc_yield

# Your working Circle client functions
try:
    from services.circle_client import check_treasury_balance
except ImportError:
    print("⚠️ Warning: services.circle_client not found. Using fallback balance.")
    def check_treasury_balance(): return 20.0

# --- 3. APP INITIALIZATION ---
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

init_db()

treasury_state = {
    "usdc_balance": 20.0, # Your verified wallet balance
    "usyc_balance": 0.0
}

def agent_loop():
    """Autonomous background loop for treasury management."""
    while True:
        try:
            # Sync live balance from Circle before evaluating
            current_usdc = check_treasury_balance()
            if current_usdc is not None:
                treasury_state["usdc_balance"] = float(current_usdc)
                
            evaluate(
                usdc_balance=treasury_state["usdc_balance"],
                usyc_balance=treasury_state["usyc_balance"]
            )
        except Exception as e:
            print(f"🤖 Agent Loop Error: {e}")
        time.sleep(60)

# Start the autonomous agent in a background thread
threading.Thread(target=agent_loop, daemon=True).start()

# --- 4. API ENDPOINTS ---

@app.get("/treasury")
def treasury():
    """Live treasury endpoint for the hackathon dashboard."""
    real_balance = check_treasury_balance() 
    return {
        "usdc_balance": real_balance if real_balance is not None else treasury_state["usdc_balance"],
        "usyc_balance": treasury_state["usyc_balance"],
        "status": "Connected to Arc Testnet"
    }

@app.get("/signals")
def signals():
    """Returns the current USYC yield from DeFi Llama."""
    return {"yield_rate": get_usdc_yield()}

@app.get("/decisions")
def decisions():
    """Returns a history of autonomous actions."""
    return get_recent_decisions()

@app.get("/employees")
def employees():
    """Returns the registry of employee wallet addresses."""
    return EMPLOYEES

@app.post("/trigger")
def trigger():
    """Manual trigger for judge demonstrations."""
    real_balance = check_treasury_balance()
    usdc = float(real_balance) if real_balance else treasury_state["usdc_balance"]
    result = evaluate(
        usdc_balance=usdc,
        usyc_balance=treasury_state["usyc_balance"]
    )
    return result
if __name__ == "__main__":
    import uvicorn
    # This forces the server to start and show you every error in the console
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")