import asyncio
import websockets
import json

async def test_connection():
    uri = "ws://openclaw-gateway-piara:18789"
    password = "PiaraClawNiselosabe"
    
    client_ids_to_try = [
        "cli",
        "web-client",
        "gateway-client",
        "vscode",
        "api-client",
        "python-client",
    ]
    
    print(f"Attempting connection to {uri}...")
    
    for client_id in client_ids_to_try:
        print(f"\n🔍 Testing with client_id: '{client_id}'")
        
        try:
            async with websockets.connect(uri) as websocket:
                print("✅ WebSocket connected!")
                
                # Wait for challenge
                print("Waiting for challenge...")
                response = await asyncio.wait_for(websocket.recv(), timeout=10)
                print(f"Received: {response[:200]}...")
                
                challenge = json.loads(response)
                # print(f"Challenge type: {challenge.get('type')}, event: {challenge.get('event')}")
                
                if challenge.get("type") == "event" and challenge.get("event") == "connect.challenge":
                    # print("✅ Challenge received!")
                    
                    # Send handshake
                    handshake = {
                        "type": "req",
                        "id": f"test_{client_id}",
                        "method": "connect",
                        "params": {
                            "minProtocol": 3,
                            "maxProtocol": 3,
                            "client": {
                                "id": client_id,
                                "version": "1.0.0",
                                "platform": "python",
                                "mode": "test"
                            },
                            "role": "operator",
                            "scopes": ["operator.read"],
                            "auth": {
                                "token": password,
                                "password": password
                            },
                            "locale": "es-ES",
                            "userAgent": f"{client_id}/1.0.0"
                        }
                    }
                    
                    # print("Sending handshake...")
                    await websocket.send(json.dumps(handshake))
                    
                    # Wait for response
                    # print("Waiting for handshake response...")
                    connect_response = await asyncio.wait_for(websocket.recv(), timeout=10)
                    # print(f"Handshake response: {connect_response[:200]}...")
                    
                    connect_data = json.loads(connect_response)
                    if connect_data.get("ok"):
                        print(f"✅ SUCCESS! client_id '{client_id}' works!")
                        print(f"Response: {connect_response[:200]}...")
                        return client_id  # Return the working ID
                    else:
                        print(f"❌ Failed: {connect_data.get('error', {}).get('message', 'Unknown error')}")
                else:
                    print(f"❌ Unexpected challenge: {challenge}")
                    
        except asyncio.TimeoutError:
            print("❌ Timeout waiting for response")
        except ConnectionRefusedError as e:
            print(f"❌ Connection refused: {e}")
            break  # If connection is refused, no point trying other IDs
        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {e}")
    
    print("\n❌ No working client_id found")
    return None

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    if result:
        print(f"\n🎉 Use client_id: '{result}' in your code!")
    else:
        print("\n😞 Could not find a working client_id")
