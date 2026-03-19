import requests
import sys

BASE_URL = 'http://127.0.0.1:8000/api/auth'

def test(name, func):
    print(f"Testing {name}...", end=" ")
    try:
        func()
        print("✅ PASS")
    except Exception as e:
        print(f"❌ FAIL: {e}")
        sys.exit(1)

# Variables to share
data = {}

def register():
    payload = {
        "email": "unique_test_1@example.com",
        "password": "Password123!",
        "password_confirm": "Password123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "student"
    }
    r = requests.post(f"{BASE_URL}/register/", json=payload)
    res = r.json()
    if r.status_code != 201 or res.get('error'):
        raise Exception(f"Register failed: {res}")
    data['tokens'] = res['data']['tokens']
    print(f"(Tokens received)", end=" ")

def login():
    payload = {
        "email": "unique_test_1@example.com",
        "password": "Password123!"
    }
    r = requests.post(f"{BASE_URL}/login/", json=payload)
    res = r.json()
    if r.status_code != 200 or res.get('error'):
        raise Exception(f"Login failed: {res}")
    data['tokens'] = res['data']['tokens']
    print(f"(New tokens received)", end=" ")

def me():
    headers = {"Authorization": f"Bearer {data['tokens']['access']}"}
    r = requests.get(f"{BASE_URL}/me/", headers=headers)
    res = r.json()
    if r.status_code != 200 or res.get('error') or res['data']['email'] != 'unique_test_1@example.com':
        raise Exception(f"Me failed: {res}")

def refresh():
    payload = {"refresh": data['tokens']['refresh']}
    r = requests.post(f"{BASE_URL}/token/refresh/", json=payload)
    res = r.json()
    if r.status_code != 200 or res.get('error'):
        raise Exception(f"Refresh failed: {res}")
    data['tokens']['access'] = res['data']['access']

def logout():
    headers = {"Authorization": f"Bearer {data['tokens']['access']}"}
    payload = {"refresh": data['tokens']['refresh']}
    r = requests.post(f"{BASE_URL}/logout/", json=payload, headers=headers)
    res = r.json()
    if r.status_code != 200 or res.get('error'):
        # If it returns 200 but simplejwt blacklist error message is different, check view
        raise Exception(f"Logout failed: {res}")
    
    # Verify blacklist by Trying to refresh again
    r2 = requests.post(f"{BASE_URL}/token/refresh/", json=payload)
    if r2.status_code != 401:
        raise Exception("Blacklist failed! Token still usable.")
    print(f"(Blacklist verified)", end=" ")

test("1. Register", register)
test("2. Login", login)
test("3. Access /me/", me)
test("4. Token Refresh", refresh)
test("5. Logout & Blacklist", logout)

print("\n🎉 ALL 5 VERIFICATION STEPS PASSED!")
