import requests
import sys

BASE_URL = "http://localhost:8000/api"

# Credenciales (ajustar segun usuarios existentes)
ADMIN_EMAIL = "admin@piar.com"
ADMIN_PASS = "Admin123" # O lo que sea
MEMBER_EMAIL = "pepe@test.com"
MEMBER_PASS = "Test1234"

CLUB_ID = 1 # Club de prueba

def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if resp.status_code == 200:
        return resp.json()["tokens"]["access_token"]
    print(f"Login failed for {email}: {resp.text}")
    return None

def test_instalacion():
    # 1. Login Admin
    print("Logging in Admin...")
    admin_token = login("admin@piar.com", "Admin123456") # From create_test_users.py
    if not admin_token: return

    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Set Password
    print("\nSetting Password (Admin)...")
    payload = {"codigo": "1234", "descripcion": "Puerta Principal"}
    resp = requests.post(f"{BASE_URL}/clubes/{CLUB_ID}/instalacion/password", json=payload, headers=headers_admin)
    print(resp.status_code, resp.json())
    
    # 3. Get Password (Admin) - Should verify it works for members too
    # Admin is member? Usually yes.
    # Let's use a normal member
    
    print("\nLogging in Member...")
    member_token = login("pepe@test.com", "Test1234") # From previous tool run
    if not member_token: 
        print("Skipping member test (User not found).")
    else:
        headers_member = {"Authorization": f"Bearer {member_token}"}
        print("\nGetting Password (Member)...")
        # Try club 2 where pepe is member
        # But password was set for club 1? Admin is created for club 1?
        # Let's check where admin is member. Likely Created default club 1.
        # pepe is member of club 2. So he should fail for club 1.
        
        resp = requests.get(f"{BASE_URL}/clubes/{CLUB_ID}/instalacion/password", headers=headers_member)
        print(f"Club 1 Access (Should fail): {resp.status_code}") # 403
        
        # Admin sets password for club 2 (where pepe is member)
        # Assuming Admin is superadmin or owner of club 2? Check create_test_users...
        # Let's try to set for Club 2 with Admin (if allowed) or skip.
        
    # 4. History
    print("\nGetting History (Admin)...")
    resp = requests.get(f"{BASE_URL}/clubes/{CLUB_ID}/instalacion/history", headers=headers_admin)
    print(resp.status_code, resp.json())

if __name__ == "__main__":
    test_instalacion()
