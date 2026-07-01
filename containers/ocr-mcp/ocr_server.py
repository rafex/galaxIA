"""
Servidor MCP mínimo para OCR.
Implementa JSON-RPC sobre HTTP compatible con el cliente MCP del agent-server.
"""
import os
import json
import base64
import asyncio
import threading
from io import BytesIO
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from PIL import Image
import pytesseract
import websockets

PORT = int(os.environ.get("PORT", "8082"))
REGISTRY_URL = os.environ.get("REGISTRY_URL", f"ws://localhost:8081/fhs/v1/ws")
PROVIDER_ID = os.environ.get("PROVIDER_ID", "did:key:ocr-container-01")
PROVIDER_NAME = os.environ.get("PROVIDER_NAME", "OCR Container")

app = FastAPI(title="FHS OCR MCP Provider")

# Estado simple del servidor MCP
session_initialized = False


def make_response(request_id: Any, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


@app.post("/mcp")
async def handle_mcp(request: Request):
    body = await request.json()
    method = body.get("method")
    request_id = body.get("id")
    params = body.get("params", {})

    if method == "initialize":
        return JSONResponse(
            make_response(
                request_id,
                {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "fhs-ocr", "version": "0.1.0"},
                },
            )
        )

    if method == "notifications/initialized":
        global session_initialized
        session_initialized = True
        return Response(status_code=202)

    if method == "tools/list":
        return JSONResponse(
            make_response(
                request_id,
                {
                    "tools": [
                        {
                            "name": "ocr_extract",
                            "description": "Extrae texto de una imagen en base64 usando OCR.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "image_base64": {
                                        "type": "string",
                                        "description": "Imagen codificada en base64",
                                    }
                                },
                                "required": ["image_base64"],
                            },
                        }
                    ]
                },
            )
        )

    if method == "tools/call":
        name = params.get("name")
        arguments = params.get("arguments", {})
        if name == "ocr_extract":
            text = run_ocr(arguments.get("image_base64", ""))
            return JSONResponse(
                make_response(
                    request_id,
                    {"content": [{"type": "text", "text": text}]},
                )
            )
        return JSONResponse(
            make_response(request_id, {"content": [{"type": "text", "text": "Tool no soportada"}]}),
            status_code=400,
        )

    return JSONResponse(
        {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32601, "message": "Method not found"}},
        status_code=404,
    )


def run_ocr(image_base64: str) -> str:
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(data))
        text = pytesseract.image_to_string(image, lang="spa+eng")
        return text.strip() or "No se detectó texto en la imagen."
    except Exception as e:
        return f"Error en OCR: {str(e)}"


async def register_with_registry():
    """Conecta con el Registry FHS y mantiene el registro vivo."""
    while True:
        try:
            async with websockets.connect(REGISTRY_URL) as ws:
                await ws.send(
                    json.dumps(
                        {"type": "hello", "providerId": PROVIDER_ID, "timestamp": now_ms()}
                    )
                )
                welcome = await ws.recv()
                print("Registry welcome:", welcome)

                manifest = {
                    "fhsVersion": "0.1",
                    "provider": {
                        "id": PROVIDER_ID,
                        "name": PROVIDER_NAME,
                        "type": "mcp",
                        "visibility": "community",
                    },
                    "endpoint": {
                        "protocol": "mcp",
                        "transport": "streamable-http",
                        "url": f"http://{get_container_ip()}:{PORT}/mcp",
                    },
                    "capabilities": [
                        {
                            "id": "document.ocr",
                            "name": "Extracción de texto",
                            "inputMediaTypes": ["image/jpeg", "image/png", "application/pdf"],
                            "languages": ["es", "en"],
                        }
                    ],
                }

                async def send_register():
                    await ws.send(
                        json.dumps(
                            {
                                "type": "register",
                                "providerId": PROVIDER_ID,
                                "manifest": manifest,
                                "timestamp": now_ms(),
                            }
                        )
                    )

                await send_register()

                while True:
                    try:
                        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=25))
                        print("Registry message:", msg)
                        if msg.get("type") == "registered":
                            pass
                    except asyncio.TimeoutError:
                        await send_register()

        except Exception as e:
            print(f"Registry connection error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)


def get_container_ip() -> str:
    # En compose, el hostname del contenedor se resuelve internamente.
    # Para registros externos, idealmente se usa la IP del host o un nombre DNS.
    return os.environ.get("HOSTNAME", "ocr-mcp")


def now_ms() -> int:
    return int(asyncio.get_event_loop().time() * 1000)


def start_registry_client():
    asyncio.run(register_with_registry())


@app.on_event("startup")
def startup():
    thread = threading.Thread(target=start_registry_client, daemon=True)
    thread.start()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
