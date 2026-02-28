import requests
import os
from dotenv import load_dotenv

load_dotenv()

# The DeFi Llama Yields API endpoint
YIELD_API_URL = "https://yields.llama.fi/pools"

# USYC Pool ID on DeFi Llama (This is a constant for the USYC pool)
USYC_POOL_ID = "616f7f24-4f51-469b-8f96-339797204689"

def get_usyc_yield():
    """Fetches the current APY for USYC from DeFi Llama."""
    print("🔍 Fetching USYC yield data from DeFi Llama...")
    try:
        response = requests.get(YIELD_API_URL)
        if response.status_code == 200:
            data = response.json()['data']
            # Find the USYC pool in the list
            for pool in data:
                if pool['pool'] == USYC_POOL_ID:
                    apy = pool['apy']
                    print(f"📈 Current USYC APY: {apy}%")
                    return apy
            return None
        else:
            print(f"❌ Failed to fetch yield: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error connecting to DeFi Llama: {e}")
        return None


if __name__ == "__main__":
    # Test the signal
    current_yield = get_usyc_yield()
    
    # Example logic: if yield > 4%, we might want to trigger a 'Joy' action
    if current_yield and current_yield > 4.0:
        print("✨ Signal: High Yield Detected! Ready for Action.")