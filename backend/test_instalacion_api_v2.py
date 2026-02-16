import requests
import sys
import uuid
import time
import subprocess
import os

BASE_URL = "http://localhost:8000/api"
UNIQUE_ID = uuid.uuid4().hex[:6]
CLUB_ID = 1

ADMIN_EMAIL = f"admin_test_{UNIQUE_ID}@piar.com"
ADMIN_PASS = "Admin123!"
MEMBER_EMAIL = f"member_test_{UNIQUE_ID}@test.com"
MEMBER_PASS = "Test1234!"

def register_user(email, password, name):
    print(f"Registering {email}...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/registro", json={
            "nombre_completo": name,
            "email": email,
            "password": password
        })
        if resp.status_code == 200:
            print("OK")
            return True
        else:
            print(f"FAILED: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def force_join(email, club_id, role):
    print(f"Forcing {email} to join Club {club_id} as {role}...")
    # Assuming running from 'backend' folder
    script_path = os.path.join("scripts", "force_join_club.py")
    if not os.path.exists(script_path):
         script_path = os.path.join("backend", "scripts", "force_join_club.py")
    
    cmd = [sys.executable, script_path, email, str(club_id), role]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"OK: {result.stdout.strip()}")
            return True
        else:
            print(f"Script FAILED: {result.stderr}")
            return False
    except Exception as e:
        print(f"ERROR executing script: {e}")
        return False

def login(email, password):
    print(f"Logging in {email}...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        })
        if resp.status_code == 200:
            token = resp.json()["tokens"]["access_token"]
            print("OK")
            return token
        print(f"Login failed: {resp.text}")
        return None
    except Exception as e:
        print(f"ERROR login: {e}")
        return None

def test_instalacion():
    print(f"--- Facility Password Test Run {UNIQUE_ID} ---")

    # 1. Register
    if not register_user(ADMIN_EMAIL, ADMIN_PASS, "Test Admin"):
        sys.exit(1)
    if not register_user(MEMBER_EMAIL, MEMBER_PASS, "Test Member"):
        sys.exit(1)

    # 2. Force Join with Python script
    if not force_join(ADMIN_EMAIL, CLUB_ID, "administrador"):
        sys.exit(1)
    if not force_join(MEMBER_EMAIL, CLUB_ID, "miembro"):
        sys.exit(1)

    # 3. Login to get tokens
    admin_token = login(ADMIN_EMAIL, ADMIN_PASS)
    member_token = login(MEMBER_EMAIL, MEMBER_PASS)

    if not admin_token or not member_token:
        print("Failed to authenticate test users.")
        sys.exit(1)

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # 4. Test API
    
    # Check initial state (should be 404 or empty if first time, but maybe existing data)
    
    # Admin sets password
    print("\n[TEST] Admin sets new password...")
    payload = {
        "codigo": "CODE123",
        "descripcion": "Main Gate Access 1"
    }
    resp = requests.post(
        f"{BASE_URL}/clubes/{CLUB_ID}/instalacion/password",
        json=payload,
        headers=admin_headers
    )
    if resp.status_code == 200:
        data = resp.json()
        print(f"SUCCESS: Set password to {data['codigo']}")
        assert data["codigo"] == "CODE123"
        assert data["activa"] is True
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        sys.exit(1)

    # Member retrieves password
    print("\n[TEST] Member retrieves password...")
    resp = requests.get(
        f"{BASE_URL}/clubes/{CLUB_ID}/instalacion/password",
        headers=member_headers
    )
    if resp.status_code == 200:
        data = resp.json()
        print(f"SUCCESS: Retrieved password: {data['codigo']}")
        assert data["codigo"] == "CODE123"
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        sys.exit(1)

    # Admin checks history
    print("\n[TEST] Admin checks history...")
    resp = requests.get(
        f"{BASE_URL}/clubes/{CLUB_ID}/instalacion/history",
        headers=admin_headers
    )
    if resp.status_code == 200:
        history = resp.json()
        print(f"SUCCESS: History count: {len(history)}")
        assert len(history) >= 1
        # Check first item is the latest
        assert history[0]["codigo"] == "CODE123"
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        sys.exit(1)

    # Create another to ensure history grows and old one deactivates
    print("\n[TEST] Admin updates password...")
    payload2 = {
        "codigo": "CODE456",
        "descripcion": "Main Gate Access 2"
    }
    resp = requests.post(
        f"{BASE_URL}/clubes/{CLUB_ID}/instalacion/password",
        json=payload2,
        headers=admin_headers
    )
    assert resp.status_code == 200
    
    # Verify Member sees NEW password
    resp = requests.get(
        f"{BASE_URL}/clubes/{CLUB_ID}/instalacion/password",
        headers=member_headers
    )
    data = resp.json()
    assert data["codigo"] == "CODE456"
    print("SUCCESS: Password updated and verified.")

    print("\n--- ALL TESTS PASSED ---")

if __name__ == "__main__":
    test_instalacion()
