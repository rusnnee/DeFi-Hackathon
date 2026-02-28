import datetime
import sys
import os
import importlib.util

# --- 1. PATH RESOLUTION: Locate local config and services ---
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# --- 2. LOCAL CONFIG IMPORT: Fixes the 'ImportError' ---
config_path = os.path.join(backend_dir, "config.py")
spec = importlib.util.spec_from_file_location("local_config", config_path)
local_config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local_config)

# Map the variables from local_config
TOTAL_PAYROLL = local_config.TOTAL_PAYROLL
YIELD_THRESHOLD = local_config.YIELD_THRESHOLD
PAY_DAY = local_config.PAY_DAY
DAYS_BEFORE_PAYROLL_PREP = local_config.DAYS_BEFORE_PAYROLL_PREP
EMPLOYEES = local_config.EMPLOYEES

# --- 3. UPDATED INTERNAL IMPORTS ---
# We use local imports for backend files and your working Circle client
from signals import get_usdc_yield
from policies import check_policies
from logger import log_decision, init_db
from services.circle_client import (
    check_treasury_balance as get_balances, # Map to Alina's naming
    send_payout as execute_payroll          # Map to Alina's naming
)

# NOTE: Mocking these two for now since your current Circle client focuses on Payouts
def deposit_to_usyc(amount): return f"Mock Tx: Deposited {amount} to USYC"
def withdraw_from_usyc(amount): return f"Mock Tx: Withdrawn {amount} from USYC"

def days_until_payday():
    today = datetime.date.today()
    # Handle end-of-month logic safely
    try:
        pay_date = today.replace(day=PAY_DAY)
    except ValueError:
        # If PAY_DAY is 31 and month has 30 days
        pay_date = (today.replace(day=1) + datetime.timedelta(days=32)).replace(day=1) - datetime.timedelta(days=1)
        
    if pay_date <= today:
        if today.month == 12:
            pay_date = pay_date.replace(year=today.year+1, month=1)
        else:
            pay_date = pay_date.replace(month=today.month+1)
    return (pay_date - today).days

def evaluate(usdc_balance=None, usyc_balance=None):
    if usdc_balance is None or usyc_balance is None:
        # Sync with your real Circle SCA wallet balance
        usdc_balance = float(get_balances())
        usyc_balance = 0.0 # Starting fresh on USYC

    yield_rate = get_usdc_yield()
    days_to_pay = days_until_payday()
    reasoning = []
    action = "monitor"
    execution = None

    if days_to_pay == 0:
        action = "execute_payroll"
        reasoning.append(f"Pay day. Treasury holds {usdc_balance:.2f} USDC. Total payroll: {TOTAL_PAYROLL} USDC.")
        policy = check_policies(action, usdc_balance, usyc_balance)
        if not policy["approved"]:
            action = "blocked"
            reasoning += policy["violations"]
        else:
            reasoning.append("All policy checks passed. Executing payroll.")
            # Sending to first employee for the test demo
            execution = execute_payroll(1.0, EMPLOYEES[0]["wallet_id"])

    elif days_to_pay <= DAYS_BEFORE_PAYROLL_PREP:
        needed = TOTAL_PAYROLL * 1.1
        if usdc_balance < needed:
            shortfall = needed - usdc_balance
            action = "withdraw_from_usyc"
            reasoning.append(f"Payroll in {days_to_pay} days. Need {needed:.0f} USDC. Withdrawing {shortfall:.0f} from USYC.")
            execution = withdraw_from_usyc(shortfall)
        else:
            action = "monitor"
            reasoning.append(f"Payroll in {days_to_pay} days. Liquidity sufficient at {usdc_balance:.2f} USDC.")

    elif yield_rate > YIELD_THRESHOLD:
        # Logic for deploying excess funds to USYC
        excess = usdc_balance - (TOTAL_PAYROLL * 1.5)
        if excess > 0:
            action = "deposit_to_usyc"
            reasoning.append(f"Yield at {yield_rate:.1f}%, above {YIELD_THRESHOLD}% threshold. Moving {excess:.0f} USDC to USYC.")
            policy = check_policies(action, usdc_balance, usyc_balance, excess)
            if not policy["approved"]:
                action = "blocked"
                reasoning += policy["violations"]
            else:
                execution = deposit_to_usyc(excess)
        else:
            action = "monitor"
            reasoning.append(f"Yield attractive at {yield_rate:.1f}% but no excess funds above buffer to deploy.")
    else:
        reasoning.append(f"Yield at {yield_rate:.1f}%, below {YIELD_THRESHOLD}% threshold. Holding in USDC.")

    approved = action != "blocked"
    log_decision(
        action=action,
        approved=approved,
        reasoning=reasoning,
        usdc=usdc_balance,
        usyc=usyc_balance,
        yield_rate=yield_rate,
        violations=[] if approved else reasoning,
        execution=execution
    )

    return {
        "action": action,
        "reasoning": reasoning,
        "usdc_balance": usdc_balance,
        "usyc_balance": usyc_balance,
        "yield_rate": yield_rate,
        "days_to_payday": days_to_pay,
        "execution": execution
    }

if __name__ == "__main__":
    init_db()
    result = evaluate()
    print(f"Action: {result['action']}")
    print(f"Reasoning: {result['reasoning']}")