import requests

def get_usyc_yield():
    """Fetches real-time APY for USYC from DeFi Llama."""
    try:
        # DeFi Llama Pools API endpoint
        url = "https://yields.llama.fi/pools"
        response = requests.get(url, timeout=10) # Added timeout for safety
        data = response.json()
        
        # Search for USYC (Example: Hashnote or Mountain Protocol)
        for pool in data.get('data', []):
            if "USYC" == pool.get('symbol'):
                # We return the APY and the project name for better logs
                return {
                    "apy": pool.get('apy'),
                    "project": pool.get('project'),
                    "tvl": pool.get('tvlUsd')
                }
        return {"apy": 0.0, "project": "None", "tvl": 0}
    except Exception as e:
        print(f"Error fetching yield signal: {e}")
        return {"apy": 0.0, "project": "Error", "tvl": 0}

# --- TEST BLOCK ---
if __name__ == "__main__":
    print("🔍 Fetching USYC Yield Signal...")
    signal = get_usyc_yield()
    print(f"✅ Project: {signal['project']}")
    print(f"📈 Current APY: {signal['apy']}%")
    print(f"💰 Pool TVL: ${signal['tvl']:,.2f}")