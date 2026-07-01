# Cómo usar galaxIA

Esta guía explica cómo levantar el stack completo de galaxIA en tu máquina local.

## Requisitos

- Node.js >= 20
- npm >= 10
- Podman o Docker (para contenedores)
- Un modelo GGUF si quieres probar LLM real

## Opción rápida: con contenedores

### 1. Clonar y entrar

```bash
git clone <repo>
cd galaxIA
```

### 2. Levantar el stack

```bash
cd containers
podman-compose up --build
```

Esto levanta:

- `fhs-agent-server` en http://localhost:8081
- `fhs-web` en http://localhost:3000
- `fhs-ocr-mcp` en http://localhost:8082

### 3. Abrir el chat

Ve a http://localhost:3000.

### 4. Conectar un modelo LLM

Para que el chat funcione, necesitas al menos un proveedor LLM. Si tienes `llama-server` en otra máquina, regístralo con el script mock:

```bash
npx tsx scripts/mock-providers.ts
```

Edita el script para apuntar a tu endpoint real.

### 5. Probar OCR

Escribe en el chat:

> "Extrae el texto de esta imagen"

Y adjunta una imagen. El agente usará el OCR del contenedor `fhs-ocr-mcp`.

## Opción de desarrollo: sin contenedores

### Terminal 1 — Backend

```bash
npm install
npm run dev -w apps/agent-server
```

### Terminal 2 — Frontend

```bash
npm run dev -w apps/web
```

### Terminal 3 — OCR MCP

```bash
cd containers/ocr-mcp
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PORT=8082 REGISTRY_URL=ws://localhost:8081/fhs/v1/ws python ocr_server.py
```

### Registrar LLM mock (para pruebas sin GPU)

```bash
npx tsx scripts/mock-providers.ts
```

## Variables de entorno importantes

### agent-server

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8081` | Puerto HTTP/WebSocket |
| `HOST` | `127.0.0.1` | Interfaz de escucha |

### ocr-mcp

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8082` | Puerto del servidor MCP |
| `REGISTRY_URL` | `ws://agent-server:8081/fhs/v1/ws` | WebSocket del Registry |
| `PROVIDER_ID` | `did:key:ocr-container-01` | DID del proveedor |
| `PROVIDER_NAME` | `OCR Container` | Nombre legible |

## Comandos útiles

```bash
# Ver contenedores corriendo
podman ps

# Ver logs
podman logs -f fhs-agent-server
podman logs -f fhs-web
podman logs -f fhs-ocr-mcp

# Detener todo
cd containers
podman-compose down
```
