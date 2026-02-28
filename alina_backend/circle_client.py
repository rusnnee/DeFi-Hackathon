# circle_client.py
import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load .env from root folder
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("CIRCLE_API_KEY", "").strip()
WALLET_ID = os.getenv("WALLET_ID", "").strip()

BASE_URL = "https://api.circle.com/v1/w3s"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "accept": "application/json"
}

def get_balances():
    """Fetch real USDC balance from Circle API for your Arc Testnet wallet."""
    try:
        res = requests.get(
            f"{BASE_URL}/wallets/{WALLET_ID}/balances",
            headers=headers,
            timeout=5
        )
        if res.status_code == 200:
            token_balances = res.json().get("data", {}).get("tokenBalances", [])
            usdc = 0.0
            for b in token_balances:
                if b.get("token", {}).get("symbol") == "USDC":
                    usdc = float(b.get("amount", 0))
            return {
                "usdc_balance": usdc,
                "usyc_balance": 0.0  # USYC is simulated
            }
        else:
            print(f"⚠️ Circle API error {res.status_code}: {res.text}")
            return {"usdc_balance": 20.0, "usyc_balance": 0.0}  # fallback
    except Exception as e:
        print(f"⚠️ get_balances failed: {e}")
        return {"usdc_balance": 20.0, "usyc_balance": 0.0}  # fallback


def deposit_to_usyc(amount):
    print(f"[MOCK] Transferring {amount} USDC to USYC wallet")
    return {"status": "success", "amount": amount, "mock": True}


def withdraw_from_usyc(amount):
    print(f"[MOCK] Withdrawing {amount} USDC from USYC wallet")
    return {"status": "success", "amount": amount, "mock": True}


def execute_payroll(employees):
    results = []
    for emp in employees:
        print(f"[MOCK] Paying {emp['name']} {emp['salary']} USDC")
        results.append({
            "employee": emp["name"],
            "amount": emp["salary"],
            "status": "success",
            "mock": True
        })
    return results