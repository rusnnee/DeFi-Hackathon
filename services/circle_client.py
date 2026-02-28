import os, requests, uuid, base64
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
from pathlib import Path

# --- 1. CONFIGURATION & SECRETS ---
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("CIRCLE_API_KEY", "").strip()
ENTITY_SECRET = os.getenv("ENTITY_SECRET", "").strip()
# Using your verified Wallet ID
WALLET_ID = os.getenv("WALLET_ID", "4637768c-9bf8-5cf8-aca3-da209370eb23").strip()

BASE_URL = "https://api.circle.com/v1/w3s"
DEVELOPER_BASE_URL = f"{BASE_URL}/developer"

# Arc Testnet Native USDC Details
USDC_CONTRACT_ADDRESS = "0x3600000000000000000000000000000000000000"
USDC_DECIMALS = 6

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "accept": "application/json"
}

# --- 2. AUTHENTICATION HELPERS ---
def get_public_key():
    res = requests.get(f"{BASE_URL}/config/entity/publicKey", headers=headers)
    if res.status_code != 200:
        raise Exception(f"Failed to fetch public key: {res.text}")
    return res.json()['data']['publicKey']

def generate_entity_secret_ciphertext():
    public_key_pem = get_public_key()
    public_key = serialization.load_pem_public_key(public_key_pem.encode(), backend=default_backend())
    ciphertext = public_key.encrypt(
        bytes.fromhex(ENTITY_SECRET),
        padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    )
    return base64.b64encode(ciphertext).decode()

# --- 3. CORE TREASURY FUNCTIONS ---
def check_treasury_balance():
    """Live balance check for the demo dashboard."""
    try:
        res = requests.get(f"{BASE_URL}/wallets/{WALLET_ID}/balances", headers=headers)
        if res.status_code == 200:
            balances = res.json()['data']['tokenBalances']
            for b in balances:
                if b['token']['symbol'] == "USDC":
                    return float(b['amount'])
        return 0.0
    except:
        return 0.0

def send_payout(amount: float, destination_address: str):
    """
    Executes a USDC transfer on Arc Testnet via manual contractExecution.
    This bypasses standard transfer errors for SCA wallets.
    """
    print(f"💸 Initiating payout of {amount} USDC to {destination_address}...")

    # Convert to 6-decimal integer
    amount_in_units = int(amount * (10 ** USDC_DECIMALS))

    # Manual ABI Encoding for transfer(address,uint256)
    # Selector: 0xa9059cbb
    address_padded = destination_address.lower().replace("0x", "").zfill(64)
    amount_padded = hex(amount_in_units)[2:].zfill(64)
    call_data = "0xa9059cbb" + address_padded + amount_padded

    payload = {
        "idempotencyKey": str(uuid.uuid4()),
        "entitySecretCiphertext": generate_entity_secret_ciphertext(),
        "walletId": WALLET_ID,
        "contractAddress": USDC_CONTRACT_ADDRESS,
        "callData": call_data,
        "feeLevel": "MEDIUM",
        "blockchain": "ARC-TESTNET"
    }

    res = requests.post(f"{DEVELOPER_BASE_URL}/transactions/contractExecution", json=payload, headers=headers)

    if res.status_code == 201:
        tx_id = res.json()['data']['id']
        print(f"✅ SUCCESS! Transaction ID: {tx_id}")
        return tx_id
    else:
        print(f"❌ Payout Failed [{res.status_code}]: {res.text}")
        return None

if __name__ == "__main__":
    # Test block for direct terminal verification
    print(f"💰 Treasury Balance: {check_treasury_balance()} USDC")