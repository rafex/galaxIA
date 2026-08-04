# Guía de infraestructura — persona técnica junior

Esta guía te lleva desde cero hasta tener la pila galaxIA corriendo en tu máquina. Cubre los tres nodos del protocolo P2P: **Atlas** (bootstrap), **Star** (proveedor LLM) y **Navigator** (orquestador).

## Requisitos previos

| Herramienta | Versión mínima | Para qué sirve |
|---|---|---|
| `git` | cualquier reciente | clonar los repos |
| `node` | 22 LTS | compilar y correr los nodos |
| `npm` | 10+ | gestión de paquetes |
| `podman` o `docker` | cualquier reciente | contenedores (opcional, ver sección de contenedores) |
| `llama-server` (llama.cpp) | cualquier reciente | modelo de lenguaje local |

> Si no tienes `llama-server`, el Star no podrá generar respuestas del LLM. Puedes instalarlo desde [github.com/ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp).

---

## 1. Clonar los repositorios

```bash
git clone https://github.com/rafex/galaxIA.git
git clone https://github.com/rafex/galaxIA-Core.git
git clone https://github.com/rafex/galaxIA-satellite-star.git
```

---

## 2. Instalar dependencias

```bash
cd galaxIA-Core && npm install
cd ../galaxIA-satellite-star && npm install
```

---

## 3. Compilar

```bash
cd galaxIA-Core && npm run build
cd ../galaxIA-satellite-star && npm run build
```

---

## 4. Levantar llama-server (el modelo de lenguaje)

Descarga un modelo GGUF (por ejemplo `Llama-3.2-1B-Instruct-Q4_K_M.gguf`) y arranca el servidor:

```bash
llama-server \
  --model /ruta/al/modelo.gguf \
  --host 0.0.0.0 \
  --port 43110 \
  --ctx-size 4096
```

Verifica que responde:

```bash
curl http://localhost:43110/v1/models
```

---

## 5. Levantar Atlas (bootstrap peer)

Atlas es el punto de entrada a la red P2P. No almacena modelos; solo ayuda a los nodos a encontrarse.

```bash
cd galaxIA-Core

IDENTITY_KEY_PATH=./data/atlas/.fhs-identity-atlas.json \
FHS_LISTEN_ADDRS=/ip4/0.0.0.0/tcp/4001/ws \
PORT=8081 \
  node apps/atlas/dist/index.js
```

Verifica que está activo:

```bash
curl http://localhost:8081/health
# → { "ok": true, ... }
```

Anota el **PeerID** que imprime en el log — lo necesitarás para los otros nodos:

```
[atlas] PeerID: 12D3KooW...
```

---

## 6. Levantar Star (proveedor de chat)

Star es el nodo que habla con llama-server y procesa las misiones de chat.

```bash
cd galaxIA-satellite-star

IDENTITY_KEY_PATH=./data/.fhs-identity-star.json \
FHS_LISTEN_ADDRS=/ip4/0.0.0.0/tcp/4002/ws \
FHS_BOOTSTRAP_ADDRS=/ip4/127.0.0.1/tcp/4001/ws/p2p/<PEER_ID_ATLAS> \
LLAMA_CPP_URL=http://localhost:43110/v1 \
PROVIDER_NAME="Mi Star Local" \
  node examples/star-example/dist/index.js
```

Sustituye `<PEER_ID_ATLAS>` por el PeerID que anotaste en el paso 5.

---

## 7. Levantar Navigator (orquestador)

Navigator es el que recibe las peticiones del portal de chat y coordina la misión P2P.

```bash
cd galaxIA-Core

IDENTITY_KEY_PATH=./data/navigator/.fhs-identity-navigator.json \
FHS_LISTEN_ADDRS=/ip4/0.0.0.0/tcp/4010/ws \
FHS_BOOTSTRAP_ADDRS=/ip4/127.0.0.1/tcp/4001/ws/p2p/<PEER_ID_ATLAS> \
HOST=0.0.0.0 \
PORT=8090 \
  node apps/navigator/dist/index.js
```

Verifica:

```bash
curl http://localhost:8090/health
```

---

## 8. Verificar la conexión entre nodos

Espera unos 30 segundos (intervalo de `NodeAdvertise`). Luego prueba un chat completo:

```bash
CONV="test-$(date +%s)"

# Enviar mensaje
curl -s -X POST http://localhost:8090/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$CONV\",\"message\":{\"role\":\"user\",\"content\":\"Hola\"}}"

# Recibir respuesta por SSE
curl -N "http://localhost:8090/api/chat/$CONV/events"
```

Deberías ver eventos `assistant.delta` con texto y un evento `assistant.completed` con la procedencia.

---

## Orden de arranque recomendado

```
llama-server → Atlas → Star → Navigator → Portal Chat (si usas UI)
```

---

## Solución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Star dice "0 peers" | Atlas no está levantado o el PeerID en `FHS_BOOTSTRAP_ADDRS` es incorrecto | Verifica el PeerID de Atlas con el log de arranque |
| Navigator no recibe bids | Star arrancó antes de que el Navigator se conectara | Espera 30 s (el `advertise` es periódico) |
| `curl /health` devuelve "Connection refused" | El nodo no levantó | Revisa los logs del proceso |
| `llama-server` no responde | Modelo no encontrado o fuera de memoria | Usa un modelo más pequeño (Q4 o Q2) |
