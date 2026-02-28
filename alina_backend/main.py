from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from decisions import evaluate
from logger import get_recent_decisions, init_db
from signals import get_usdc_yield
from circle_client import get_balances
from config import EMPLOYEES
import threading
import time

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

def agent_loop():
    while True:
        balances = get_balances()
        evaluate(
            usdc_balance=balances["usdc_balance"],
            usyc_balance=balances["usyc_balance"]
        )
        time.sleep(300)  # 5 minutes

threading.Thread(target=agent_loop, daemon=True).start()

@app.get("/treasury")
def treasury():
    balances = get_balances()
    return {
        "usdc_balance": balances["usdc_balance"],
        "usyc_balance": balances["usyc_balance"],
        "total": balances["usdc_balance"] + balances["usyc_balance"]
    }

@app.get("/signals")
def signals():
    return {"yield_rate": get_usdc_yield()}

@app.get("/decisions")
def decisions():
    return get_recent_decisions()

@app.get("/employees")
def employees():
    return EMPLOYEES

@app.post("/trigger")
def trigger():
    balances = get_balances()
    result = evaluate(
        usdc_balance=balances["usdc_balance"],
        usyc_balance=balances["usyc_balance"]
    )
    return result

from pydantic import BaseModel

class BridgeRequest(BaseModel):
    destinationAddress: str
    destinationChain: str
    amount: str

@app.post("/bridge")
def bridge(payload: BridgeRequest):
    import requests as req
    r = req.post(
        "http://localhost:3001/bridge",
        json=payload.model_dump(),
        timeout=120
    )
    return r.json()