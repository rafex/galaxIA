# PoC con contenedores — Atlas + Star + Navigator

Esta guía describe cómo levantar la prueba de concepto P2P completa usando **Podman** (rootless) con red `pasta` — el mismo setup que se verificó en Bastion.

> Los comandos usan `podman`. Si usas Docker, sustituye `podman` por `docker` y omite el prefijo `host.containers.internal` (usa `host-gateway` como alias o la IP real del host).

---

## Requisitos

- Podman ≥ 4.x con soporte `pasta` (instalado por defecto en Fedora/RHEL/Alma Linux; en Ubuntu instalar `podman-rootless`)
- `llama-server` corriendo en el host en el puerto `43110`
- Las imágenes construidas localmente (ver sección Construir imágenes)
- **UFW (o el firewall del host) con los puertos correctos abiertos** (ver sección Firewall)

---

## Arquitectura en pasta

En el modo `pasta` (red rootless de Podman), cada contenedor ve su propia IP como `192.168.X.X` pero las conexiones a esa dirección se resuelven **en loopback** — no llegan al host ni a otros contenedores.

Para comunicarse entre contenedores y con el host se usa:

```
host.containers.internal → 169.254.1.2
```

Esta IP es la "puerta de entrada" al host. Los contenedores publican puertos en el host con `-p HOST_PORT:CONTAINER_PORT` y se alcanzan entre sí vía `169.254.1.2:HOST_PORT`.

---

## Construir imágenes

```bash
cd galaxIA-Core

# Atlas
podman build -f apps/atlas/Containerfile -t galaxia-atlas:latest .

# Navigator
podman build -f apps/navigator/Containerfile -t galaxia-navigator:latest .

cd ../galaxIA-satellite-star

# Star
podman build -f examples/star-example/Containerfile -t galaxia-star:latest .
```

---

## Paso 1 — Levantar Atlas

Atlas es el bootstrap peer. Arranca primero y siempre.

```bash
mkdir -p ~/data/atlas

podman run -d \
  --name fhs-atlas \
  --restart unless-stopped \
  -p 4001:4001 \
  -p 8081:8081 \
  -v ~/data/atlas:/app/apps/atlas/data \
  -e IDENTITY_KEY_PATH=/app/apps/atlas/data/.fhs-identity-atlas.json \
  -e FHS_LISTEN_ADDRS=/ip4/0.0.0.0/tcp/4001/ws \
  -e PORT=8081 \
  -e HOST=0.0.0.0 \
  galaxia-atlas:latest
```

Verificar que levantó:

```bash
curl http://localhost:8081/health
```

Obtener el PeerID de Atlas (necesario para los otros dos nodos):

```bash
podman logs fhs-atlas 2>&1 | grep "PeerID\|peerId\|12D3KooW" | head -5
```

El PeerID tiene la forma `12D3KooW...`. Guárdalo en una variable:

```bash
ATLAS_PEER_ID="12D3KooW..."   # pegar el valor real
ATLAS_MULTIADDR="/ip4/169.254.1.2/tcp/4001/ws/p2p/${ATLAS_PEER_ID}"
```

---

## Paso 2 — Levantar Star

Star es el proveedor LLM. Se conecta al bootstrap de Atlas y anuncia su presencia.

```bash
podman volume create star-data   # identidad persistente entre reinicios

podman run -d \
  --name fhs-star \
  --restart unless-stopped \
  -p 4002:4002 \
  -v star-data:/data \
  -e IDENTITY_KEY_PATH=/data/.fhs-identity-star.json \
  -e FHS_LISTEN_ADDRS=/ip4/0.0.0.0/tcp/4002/ws \
  -e FHS_ANNOUNCE_ADDRS=/ip4/169.254.1.2/tcp/4002/ws \
  -e FHS_BOOTSTRAP_ADDRS="${ATLAS_MULTIADDR}" \
  -e LLAMA_CPP_URL=http://169.254.1.2:43110/v1 \
  -e PROVIDER_NAME="Star FHS PoC" \
  galaxia-star:latest
```

`FHS_ANNOUNCE_ADDRS` es clave: le dice a Star que anuncie `169.254.1.2:4002` (alcanzable desde otros contenedores) en vez de su IP interna.

Verificar:

```bash
podman logs -f fhs-star
# Debe aparecer: [dht] beacon publicado, [star] P2P activo
```

---

## Paso 3 — Levantar Navigator

Navigator recibe las peticiones HTTP/SSE y orquesta las misiones.

```bash
podman volume create navigator-data

podman run -d \
  --name fhs-navigator \
  --restart unless-stopped \
  -p 4010:4010 \
  -p 8090:8090 \
  -v navigator-data:/data \
  -e IDENTITY_KEY_PATH=/data/.fhs-identity-navigator.json \
  -e FHS_LISTEN_ADDRS=/ip4/0.0.0.0/tcp/4010/ws \
  -e FHS_ANNOUNCE_ADDRS=/ip4/169.254.1.2/tcp/4010/ws \
  -e FHS_BOOTSTRAP_ADDRS="${ATLAS_MULTIADDR}" \
  -e HOST=0.0.0.0 \
  -e PORT=8090 \
  galaxia-navigator:latest
```

Verificar:

```bash
curl http://localhost:8090/health
```

---

## Paso 4 — Esperar y probar

La primera vez que Star arranca, publica un `NodeAdvertise` en FloodSub inmediatamente — pero el Navigator puede no haber terminado de conectarse a Atlas todavía. El ciclo de advertise es de **30 segundos**, así que espera al menos ese tiempo antes de la primera prueba.

```bash
sleep 35
```

Prueba de chat completa:

```bash
CONV="poc-$(date +%s)"

# POST con el mensaje
curl -s -X POST http://localhost:8090/api/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONV\",
    \"message\": {\"role\": \"user\", \"content\": \"Hola, ¿qué eres?\"}
  }"

echo ""

# SSE con la respuesta en streaming
curl -N http://localhost:8090/api/chat/$CONV/events
```

Salida esperada:

```
event: assistant.delta
data: {"text":"Soy...","conversationId":"poc-..."}

event: assistant.completed
data: {"provenance":{"llm":{"providerId":"did:key:z...","model":"auto"},...}}
```

---

## Diagnóstico rápido

**Ver logs de todos los nodos:**

```bash
podman logs fhs-atlas 2>&1 | tail -20
podman logs fhs-star 2>&1 | tail -20
podman logs fhs-navigator 2>&1 | tail -20
```

**Ver peers conectados en Atlas:**

```bash
curl -s http://localhost:8081/api/nodes | python3 -m json.tool
```

**Reiniciar un nodo sin perder identidad:**

```bash
podman restart fhs-star
```

**Detener y limpiar todo:**

```bash
podman stop fhs-navigator fhs-star fhs-atlas
podman rm fhs-navigator fhs-star fhs-atlas
# Los volúmenes se conservan (identidades persistentes)
# Para borrarlos también:
podman volume rm star-data navigator-data
```

---

## Firewall (UFW) — puertos requeridos

En Linux con UFW activo, los contenedores publican sus puertos en el host pero el firewall los bloquea para conexiones externas. Abre todos los puertos necesarios **antes de intentar acceder desde otra máquina**:

```bash
# Protocolo P2P (libp2p WebSocket)
sudo ufw allow 4001/tcp comment "FHS Atlas P2P"
sudo ufw allow 4002/tcp comment "FHS Star P2P"
sudo ufw allow 4010/tcp comment "FHS Navigator P2P"

# APIs HTTP y portal
sudo ufw allow 8081/tcp comment "FHS Atlas REST"
sudo ufw allow 8090/tcp comment "FHS Navigator REST/SSE"
sudo ufw allow 5173/tcp comment "FHS Portal Chat"

# Verificar
sudo ufw status numbered
```

> **Nota:** Si usas `podman rootless` con `pasta`, los puertos se publican vía `rootlessport`. UFW ve estas conexiones como tráfico externo aunque el proceso sea del usuario — la regla de firewall es necesaria igual que para cualquier servicio del sistema.

**Alternativa sin tocar el firewall (port forward SSH):**

```bash
# Ejecutar desde la máquina cliente
ssh -L 5173:127.0.0.1:5173 -L 8090:127.0.0.1:8090 <usuario>@<ip-bastion>
```

Mientras ese túnel esté activo, accede al portal en `http://127.0.0.1:5173`.

---

## Variables de entorno — resumen

| Variable | Nodo | Descripción |
|---|---|---|
| `IDENTITY_KEY_PATH` | todos | Ruta al JSON con la clave privada Ed25519 |
| `FHS_LISTEN_ADDRS` | todos | Multiaddr en la que escucha el nodo libp2p |
| `FHS_ANNOUNCE_ADDRS` | Star, Navigator | Multiaddr que anuncia al swarm (importante en pasta) |
| `FHS_BOOTSTRAP_ADDRS` | Star, Navigator | Multiaddr del Atlas para el bootstrap inicial |
| `LLAMA_CPP_URL` | Star | URL base de llama-server (`/v1`) |
| `PROVIDER_NAME` | Star | Nombre humano del proveedor |
| `HOST` | Atlas, Navigator | IP en la que escucha el servidor HTTP |
| `PORT` | Atlas, Navigator | Puerto del servidor HTTP |

---

## Notas sobre Docker vs Podman rootless

| Aspecto | Docker (rootful) | Podman rootless (pasta) |
|---|---|---|
| IP del host desde un contenedor | `host-gateway` (add-host) o `172.17.0.1` | `169.254.1.2` (`host.containers.internal`) |
| `FHS_ANNOUNCE_ADDRS` | `172.17.0.1` o la IP del bridge | `169.254.1.2` |
| `FHS_BOOTSTRAP_ADDRS` | idem | idem |
| `LLAMA_CPP_URL` | `http://172.17.0.1:43110/v1` | `http://169.254.1.2:43110/v1` |
| Privilegios | root del sistema | usuario sin root |
