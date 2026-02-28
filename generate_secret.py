import secrets

# Generate a cryptographically secure 32-byte hex string
entity_secret = secrets.token_hex(32)
print(f"Your Entity Secret: {entity_secret}")