import requests
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("CIRCLE_API_KEY")
INTERNAL_ID = "e401df5a-2a6d-5cc6-a7e9-490ca0be1f71" # Your ID from the log

headers = {"Authorization": f"Bearer {API_KEY}", "accept": "application/json"}
res = requests.get(f"https://api.circle.com/v1/w3s/transactions/{INTERNAL_ID}", headers=headers)

if res.status_code == 200:
    data = res.json()['data']['transaction']
    print(f"Status: {data['state']}")
    print(f"Blockchain Hash: {data.get('txHash', 'Not yet broadcasted')}")
else:
    print(f"Error: {res.text}")