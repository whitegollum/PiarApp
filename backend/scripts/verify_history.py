import asyncio
import json
import websockets
import os
import sys

# Add parent dir to path to import config if needed, or just hardcode for script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_history():
    uri = "ws://192.168.1.6:18789"
    password = "0neeyedNas"
    
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            # 1. Challenge
            resp = await websocket.recv()
            print(f"Challenge: {resp}")
            
            # 2. Handshake
            handshake = {
                "type": "req", "id": "1", "method": "connect",
                "params": {
                    "minProtocol": 3, "maxProtocol": 3,
                    "client": {"id": "gateway-client", "version": "1.0.0", "platform": "python", "mode": "backend"},
                    "role": "operator",
                    "scopes": ["operator.read", "operator.write", "operator.admin"],
                    "auth": {"token": password, "password": password},
                    "locale": "es-ES", "userAgent": "gateway-client/1.0.0"
                }
            }
            await websocket.send(json.dumps(handshake))
            res = await websocket.recv()
            print(f"Handshake Res: {res}")
            
            # 3. History
            req_id = "hist_test_1"
            history_req = {
                "type": "req", "id": req_id, "method": "chat.history",
                "params": {
                    "sessionKey": "agent:main:main",
                    "limit": 5
                }
            }
            print(f"Sending history request: {history_req}")
            await websocket.send(json.dumps(history_req))
            
            # 4. Wait for response
            while True:
                msg = await websocket.recv()
                print(f"Received: {msg}")
                try:
                    data = json.loads(msg)
                    if data.get("id") == req_id:
                        print("History payload received!")
                        break
                except:
                    pass
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_history())