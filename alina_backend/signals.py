import requests

USYC_POOL_ID = "616f7f24-4f51-469b-8f96-339797204689"

def get_usdc_yield():
    try:
        response = requests.get("https://yields.llama.fi/pools", timeout=10)
        pools = response.json()["data"]
        
        # Priority 1: Specific USYC Pool
        for p in pools:
            if p["pool"] == USYC_POOL_ID:
                return float(p["apy"])

        # Priority 2: Best performing USDC pool
        usdc_pools = [p for p in pools if "USDC" in p["symbol"] and p.get("tvlUsd", 0) > 1000000]
        if usdc_pools:
            best = max(usdc_pools, key=lambda p: p["apy"])
            return float(best["apy"])
            
        return 4.5 
    except Exception as e:
        print(f"⚠️ Signal Error: {e}")
        return 4.5