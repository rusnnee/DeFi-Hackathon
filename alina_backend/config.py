EMPLOYEES = [
    # Using your treasury as Alice for the demo so you can see the USDC move!
    {"id": "EMP001", "name": "Alice", "wallet_id": "0x0ee6a6da94f16b42ab849c4fc38a6011c7d3f6c1", "salary": 5000},
    {"id": "EMP002", "name": "Bob",   "wallet_id": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "salary": 4500},
    {"id": "EMP003", "name": "Carol", "wallet_id": "TBD", "salary": 6000},
]

TOTAL_PAYROLL = sum(e["salary"] for e in EMPLOYEES)
MIN_LIQUIDITY_RATIO = 0.40
MAX_USYC_RATIO = 0.60
YIELD_THRESHOLD = 4.0 # The agent triggers "Joy/Action" if yield > 4%
PAY_DAY = 28
DAYS_BEFORE_PAYROLL_PREP = 2