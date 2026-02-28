import os
from circle.web3 import developer_controlled_wallets
from dotenv import load_dotenv
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

load_dotenv()

# 1. Initialize the Base Configuration
configuration = developer_controlled_wallets.Configuration()
configuration.api_key = os.getenv("CIRCLE_API_KEY")
configuration.entity_secret = os.getenv("ENTITY_SECRET")

# 2. Create the Client instance
# Note: In the Python SDK, we often use specific API classes for different tasks
api_client = developer_controlled_wallets.ApiClient(configuration)
wallets_api = developer_controlled_wallets.WalletsApi(api_client)
wallet_sets_api = developer_controlled_wallets.WalletSetsApi(api_client)

def get_treasury_balance():
    """Checks USDC balance on Arc Testnet."""
    wallet_id = os.getenv("WALLET_ID")
    if not wallet_id:
        return "No WALLET_ID found in .env. Run create_initial_treasury() first."
    
    try:
        # Fetching balances specifically for your wallet ID
        response = wallets_api.get_wallet_token_balance(id=wallet_id)
        
        for balance in response.data.token_balances:
            if balance.token.symbol == "USDC":
                return f"{balance.amount} USDC"
        return "0 USDC (No balance found)"
    except Exception as e:
        return f"Error connecting to Circle: {e}"
    
def create_initial_treasury():
    """Programmatically creates your first wallet on Arc."""
    try:
        # Step A: Create a Wallet Set
        wallet_set_req = developer_controlled_wallets.CreateWalletSetRequest(name="ArcTic Treasury Set")
        wallet_set_response = wallet_sets_api.create_wallet_set(wallet_set_req)
        wallet_set_id = wallet_set_response.data.wallet_set.id
        print(f"✅ Created Wallet Set: {wallet_set_id}")

        # Step B: Create the Wallet inside that set on Arc Testnet
        # We specify 'ARC-TESTNET' and use 'SCA' (Smart Contract Account)
        wallet_req = developer_controlled_wallets.CreateWalletsRequest(
            blockchains=["ARC-TESTNET"],
            count=1,
            wallet_set_id=wallet_set_id,
            account_type="SCA" 
        )
        wallet_response = wallets_api.create_wallets(wallet_req)
        
        new_wallet = wallet_response.data.wallets[0]
        print(f"🚀 New Treasury Wallet Created!")
        print(f"Address: {new_wallet.address}")
        print(f"Wallet ID: {new_wallet.id}")
        
        return new_wallet.id
    except Exception as e:
        print(f"❌ Error creating wallet: {e}")

def send_payout(amount, destination_address):
    """Sends USDC to an employee on Arc Testnet."""
    try:
        # Create a transaction request
        # USDC address on Arc is 0x3600000000000000000000000000000000000000
        transfer_req = developer_controlled_wallets.CreateTransactionRequest(
            amount=[str(amount)],
            destination_address=destination_address,
            token_address="0x3600000000000000000000000000000000000000",
            blockchain="ARC-TESTNET",
            wallet_id=os.getenv("WALLET_ID"),
            fee={"type": "level", "config": {"feeLevel": "MEDIUM"}}
        )
        
        response = wallets_api.create_transaction(transfer_req)
        return response.data.id # Returns Transaction ID
    except Exception as e:
        print(f"Payout failed: {e}")
        return None

if __name__ == "__main__":
    # If your .env is empty, run this first to generate your wallet
    # create_initial_treasury() 
    create_initial_treasury()
    
    print(f"💰 Current Treasury Balance: {get_treasury_balance()}")