import urllib.request
import json
import urllib.error

data = json.dumps({'email':'admin@gppl.in', 'password':'Admin@1234'}).encode('utf-8')
req = urllib.request.Request('http://localhost:5001/api/v1/auth/login', data=data, headers={'Content-Type': 'application/json'})

try:
    res = urllib.request.urlopen(req)
    print(res.read())
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(e)
