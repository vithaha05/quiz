import urllib.request
import json

# 1. Login
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login/', 
    data=json.dumps({"username":"admin", "password":"admin"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
token = json.loads(res.read())['access']

# 2. Create Quiz
req = urllib.request.Request('http://127.0.0.1:8000/api/quizzes/',
    data=json.dumps({"title": "Test Groq Final", "topic": "bts", "difficulty": "Easy", "question_count": 2}).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
try:
    res = urllib.request.urlopen(req)
    print("SUCCESS", res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode('utf-8'))
