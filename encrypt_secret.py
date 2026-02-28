import base64
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Hash import SHA256

# 1. Paste the 64-character Entity Secret YOU generated earlier here
entity_secret_hex = 'c28c0f21c50e22deeb023cecbb0a42a0a2d93c592f3ad6983989d33d607737be'

# 2. Your specific Circle Public Key
public_key_pem = """-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA0K8CJGF5t5d/dZIN8eTm
8sUlHDvOeS93DO501JKpCmWlQE+3XTIor29jjdPcBIq+IRa5FPVEn/vI6dm1YANG
nSYwFTdRFvkF41x/GgMfR0eu/Wzyx/MxUnYXByr77nHvH+i9mBV4JKGVRtTO4guN
pCXbwgWmNJnzeqFARRc8TJizhtwgS8+QfT6Ji+X8Dq6zrcWQu++OJ0YEdJipXNBR
gWRCIMZ1u3jhgr598DOKIK7+soEmsMuW9dlxNaJXJgD06+hBIh0VWRGHXgpUehOM
KjDJF+LmauvGbxyMJ6hRFiyfe+jglIiDR5OzdepkeugZxPps9kbckIF16DvzR8dP
3VLzAvNlgNZ6QRGLg23k5oEM5zqxr2kSdIGjOz9c8Q1OXHdvbEJKLKksd2FTBsjn
4hq+pvJ29xMjkQfhtRCwY3d3dchD5tnNTE4CZvIttzsSrKdcCllDWffu1Et6TJ5a
oXYz3igfBTJtZuGuKWsWbubX7bQUvsso2VoU2EuszhwX1SDoNYRfH25zpCHKsJSI
wdcvB3RSQOudzbLcTRxYLfS34SdUH1Tu6lwpAHXn/BSMXIUSzH9szIsbEx73auI1
Ktw4T0tF80Nip16pNj1yJBFZzA9HA1DuCGAZlfsNv93hKWM19Cz2/fsotHzpbTqG
pA8JZPaRD3Gzaotkm21KNacCAwEAAQ==
-----END PUBLIC KEY-----"""

def generate_ciphertext(hex_secret, public_key):
    secret_bytes = bytes.fromhex(hex_secret)
    rsa_key = RSA.importKey(public_key)
    cipher = PKCS1_OAEP.new(rsa_key, hashAlgo=SHA256)
    ciphertext = cipher.encrypt(secret_bytes)
    return base64.b64encode(ciphertext).decode('utf-8')

print(f"\n🚀 YOUR CIPHERTEXT:\n{generate_ciphertext(entity_secret_hex, public_key_pem)}")