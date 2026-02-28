import time
from services.circle_client import check_treasury_balance, send_payout
from services.yield_signals import get_usyc_yield

# Target Yield: If APY > 4.5%, we send a "Joy" payout
YIELD_THRESHOLD = 4.5 
PAYOUT_AMOUNT = 1.0  # Sending 1 USDC for the test
EMPLOYEE_ADDRESS = "0xYourColleaguesAddressHere" # Replace with a real test address

def run_treasury_check():
    print("🤖 Starting Treasury Agent Cycle...")
    
    # 1. Check Signal
    current_yield = get_usyc_yield()
    
    if current_yield and current_yield > YIELD_THRESHOLD:
        print(f"✨ SIGNAL TRIGGERED: Yield is {current_yield}% (Threshold: {YIELD_THRESHOLD}%)")
        
        # 2. Check Action (Verify Funds)
        balance = check_treasury_balance()
        
        if balance and float(balance.split()[0]) >= PAYOUT_AMOUNT:
            print(f"💸 Action: Sending {PAYOUT_AMOUNT} USDC Payout...")
            tx_id = send_payout(PAYOUT_AMOUNT, EMPLOYEE_ADDRESS)
            print(f"✅ Payout Successful! Transaction ID: {tx_id}")
        else:
            print("⚠️ Action Aborted: Insufficient funds in Treasury.")
    else:
        print("😴 Signal: Yield is below threshold. No action taken.")

if __name__ == "__main__":
    # In a real hackathon project, you'd run this on a loop or Cron Job
    run_treasury_check()