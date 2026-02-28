import requests
import uuid
import base64
import os
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("CIRCLE_API_KEY")
ENTITY_SECRET = os.getenv("CIRCLE_ENTITY_SECRET")
TREASURY_WALLET_ID = os.getenv("TREASURY_WALLET_ID")
TREASURY_WALLET_ADDRESS = os.getenv("TREASURY_WALLET_ADDRESS")
USYC_WALLET_ID = os.getenv("USYC_WALLET_ID")
USYC_WALLET_ADDRESS = os.getenv("USYC_WALLET_ADDRESS")
USDC_TOKEN_ID = os.getenv("USDC_TOKEN_ID")

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

BASE = "https://api.circle.com/v1/w3s"


def get_ciphertext():
    r = requests.get(f"{BASE}/config/entity/publicKey", headers=HEADERS)
    pub_key = serialization.load_pem_public_key(r.json()["data"]["publicKey"].encode())
    ciphertext = pub_key.encrypt(
        bytes.fromhex(ENTITY_SECRET),
        padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    )
    return base64.b64encode(ciphertext).decode()


import time

_balance_cache = {"data": None, "timestamp": 0}
CACHE_TTL = 120  # seconds

def get_balances():
    """Fetch live USDC balances, cached for 2 minutes to avoid rate limits."""
    global _balance_cache
    now = time.time()
    if _balance_cache["data"] and now - _balance_cache["timestamp"] < CACHE_TTL:
        return _balance_cache["data"]

    def _usdc_balance(wallet_id):
        try:
            r = requests.get(f"{BASE}/wallets/{wallet_id}/balances", headers=HEADERS, timeout=10)
            if r.status_code != 200 or not r.text:
                print(f"[WARN] Balance check failed for {wallet_id}: status={r.status_code}")
                return 0.0
            data = r.json()
            for t in data["data"]["tokenBalances"]:
                if t["token"]["symbol"] == "USDC":
                    return float(t["amount"])
            return 0.0
        except Exception as e:
            print(f"[WARN] Balance check error for {wallet_id}: {e}")
            return 0.0

    result = {
        "usdc_balance": _usdc_balance(TREASURY_WALLET_ID),
        "usyc_balance": _usdc_balance(USYC_WALLET_ID)
    }
    if result["usdc_balance"] > 0 or result["usyc_balance"] > 0:
        _balance_cache["data"] = result
        _balance_cache["timestamp"] = now
    return result


def _transfer(from_wallet_id, to_address, amount):
    """Core transfer: moves USDC from a Circle wallet to any address."""
    r = requests.post(
        f"{BASE}/developer/transactions/transfer",
        headers=HEADERS,
        json={
            "idempotencyKey": str(uuid.uuid4()),
            "entitySecretCiphertext": get_ciphertext(),
            "walletId": from_wallet_id,
            "tokenId": USDC_TOKEN_ID,
            "destinationAddress": to_address,
            "amounts": [str(amount)],
            "feeLevel": "MEDIUM",
            "blockchain": "ARC-TESTNET"
        }
    )
    data = r.json()
    if r.status_code not in (200, 201):
        print(f"[ERROR] Transfer failed: {data}")
        return {"status": "failed", "error": data}
    tx = data.get("data", {})
    tx_id = tx.get("id") or tx.get("transaction", {}).get("id")
    state = tx.get("state") or tx.get("transaction", {}).get("state", "UNKNOWN")
    print(f"[TX] {from_wallet_id[:8]}... → {to_address[:10]}... | {amount} USDC | state: {state} | id: {tx_id}")
    return {"status": "success", "tx_id": tx_id, "state": state}


def deposit_to_usyc(amount):
    """Treasury → USYC wallet (parking idle funds for yield)."""
    result = _transfer(TREASURY_WALLET_ID, USYC_WALLET_ADDRESS, amount)
    return {"amount": amount, **result}


def withdraw_from_usyc(amount):
    """USYC wallet → Treasury (pulling back before payday)."""
    result = _transfer(USYC_WALLET_ID, TREASURY_WALLET_ADDRESS, amount)
    return {"amount": amount, **result}


def _bridge(to_address, destination_chain, amount):
    """Bridge USDC from ARC-TESTNET treasury to another chain via Node.js bridge service."""
    try:
        r = requests.post(
            "http://localhost:3001/bridge",
            json={
                "destinationAddress": to_address,
                "destinationChain": destination_chain,
                "amount": str(amount)
            },
            timeout=120  # bridging takes time
        )
        data = r.json()
        if data.get("status") == "success":
            print(f"[BRIDGE] → {destination_chain} → {to_address[:10]}... | {amount} USDC | steps: {len(data.get('steps', []))}")
        else:
            print(f"[BRIDGE ERROR] {data}")
        return data
    except Exception as e:
        print(f"[BRIDGE ERROR] {e}")
        return {"status": "failed", "error": str(e)}


def execute_payroll(employees):
    """Treasury → each employee wallet. Routes by chain automatically."""
    results = []
    for emp in employees:
        chain = emp.get("chain", "ARC-TESTNET")
        if chain == "ARC-TESTNET":
            # Direct onchain transfer — same network
            result = _transfer(TREASURY_WALLET_ID, emp["wallet_address"], emp["salary"])
        else:
            # Cross-chain — route through bridge service
            result = _bridge(emp["wallet_address"], chain, emp["salary"])

        results.append({
            "employee": emp["name"],
            "amount": emp["salary"],
            "chain": chain,
            **result
        })
    return results


def get_transaction_status(tx_id):
    """Poll a transaction until it reaches COMPLETED or FAILED."""
    r = requests.get(f"{BASE}/transactions/{tx_id}", headers=HEADERS)
    return r.json()["data"]["transaction"]["state"]


if __name__ == "__main__":
    import time
    from config import EMPLOYEES

    print("=== Balances ===")
    print(get_balances())

    print("\n=== Test payroll (small amounts) ===")
    # Override salary to 0.01 for testing so we don't drain the wallet
    test_employees = [
        {**emp, "salary": 0.01} for emp in EMPLOYEES
    ]
    results = execute_payroll(test_employees)
    for r in results:
        print(r)

    print("\n=== Polling until complete ===")
    for result in results:
        if result.get("tx_id"):
            for _ in range(10):
                state = get_transaction_status(result["tx_id"])
                print(f"{result['employee']}: {state}")
                if state in ("COMPLETE", "COMPLETED", "FAILED"):
                    break
                time.sleep(3)