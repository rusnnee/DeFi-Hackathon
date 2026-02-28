import requests

def get_usyc_yield():
    """Fetches real-time APY for USYC from DeFi Llama."""
    try:
        response = requests.get("https://yields.llama.fi/pools", timeout=10)
        data = response.json().get('data', [])
        
        # Search for USYC symbol in the pools list
        for pool in data:
            if pool.get('symbol') == 'USYC':
                return {
                    "apy": pool.get('apy'),
                    "project": pool.get('project'),
                    "tvl": pool.get('tvlUsd')
                }
        return {"apy": 0.0, "project": "None", "tvl": 0}
    except Exception as e:
        print(f"Error fetching yield: {e}")
        return {"apy": 0.0, "project": "Error", "tvl": 0}