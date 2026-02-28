import time
from dotenv import load_dotenv

# Import everything from your services — no duplicate logic here
from services.circle_client import check_treasury_balance, send_payout
from alina_backend.signals import get_usdc_yield

# --- CONFIGURATION ---
load_dotenv()
YIELD_THRESHOLD = 4.5
PAYOUT_AMOUNT = 1.0
TEST_RECIPIENT = "0x0ee6a6da94f16b42ab849c4fc38a6011c7d3f6c1"


def run_autonomous_worker():
    """The core background loop that manages the Arc Treasury."""
    print("🚀 Arc DeFi Worker: Starting Autonomy Loop...")

    while True:
        try:
            current_yield = get_usdc_yield()

            if current_yield and current_yield >= YIELD_THRESHOLD:
                print(f"🔥 Yield {current_yield}% meets threshold! Triggering payout...")

                balance = check_treasury_balance()
                if balance >= PAYOUT_AMOUNT:
                    send_payout(PAYOUT_AMOUNT, TEST_RECIPIENT)
                else:
                    print(f"⚠️  Insufficient balance ({balance} USDC). Skipping payout.")
            else:
                print(f"😴 Yield {current_yield}% is below threshold. Standing by.")

        except Exception as e:
            print(f"❌ Worker Error: {e}")

        print("💤 Sleeping for 60 seconds...")
        time.sleep(60)


if __name__ == "__main__":
    run_autonomous_worker()