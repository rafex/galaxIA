# Despliegue en el bastion

Guía para desplegar el stack completo de galaxIA en el bastion (`192.168.3.173`) usando Podman.

## Requisitos previos

- **Bastion** accesible por SSH: `ssh bastion`
- **Podman** instalado en el bastion y configurado como socket remoto: `podman system connection list`
- **llama.cpp** corriendo en el bastion con un modelo GGUF
- **ether-ocr** corriendo en el bastion (container `ether-ocr-api`)
- **UFW** configurado con los puertos del rango `30000-30099` (Podman Web) y `3000` (Apps)

## Servicios

| Servicio | Puerto host | Puerto container | Red interna |
|---|---|---|---|
| **fhs-web** | `3000` | `80` | `fhs` |
| **fhs-agent-server** | `30083` | `8081` | `fhs` |
| **fhs-llm-provider** | `43111` | `43111` | `fhs` |
| **fhs-ocr-provider** | `43112` | `43112` | `fhs` |
| **llama.cpp** | `8080` | — | host |
| **ether-ocr-api** | `8001→8000, 9011→9001` | — | `containers_default` |

`llm-provider`/`ocr-provider` ya no remapean puerto (antes `30084`/`30085` → `43111`/`43112`) — el manifiesto que cada provider anuncia usa el mismo puerto en el que escucha internamente, así que host y contenedor deben coincidir para que un despliegue en otra máquina (ver `docs/despliegue-multi-host.md`) no intente conectarse al puerto equivocado.

## Redes

Los servicios de galaxIA usan la red `fhs` (bridge). El `ether-ocr-api` está en `containers_default`. Para que se comuniquen, se conecta a ambas redes:

```bash
podman network connect fhs ether-ocr-api
```

Esto permite que el `ocr-provider` llegue a `ether-ocr-api:8000` por Docker DNS.

## Levantar el stack

```bash
# Desde el repositorio local
cd /path/to/galaxIA

# Stack completo (todos los servicios)
just container-up

# O por partes
just container-up-core    # web + agent-server
just container-up-llm     # wrapper FHS de llama.cpp
just container-up-ocr     # wrapper FHS de ether-ocr
```

`just container-up` reconstruye las imágenes y pasa el hash del commit como build arg para el versionado.

## Verificar el despliegue

```bash
# Estado de contenedores
podman ps

# Health del agent-server
curl http://192.168.3.173:30083/health
# {"ok":true,"fhsVersion":"0.1","version":"abc1234","buildDate":"..."}

# Frontend
curl -s http://192.168.3.173:3000 | head -5

# LLM Provider registrado
curl -s http://192.168.3.173:30083/api/fhs/models

# OCR Provider registrado
curl -s http://192.168.3.173:30083/api/fhs/providers
```

## Logs

```bash
# Todos los contenedores
just container-logs

# Un servicio específico
just container-logs agent-server
just container-logs llm-provider
just container-logs ocr-provider

# O directo con podman
podman logs fhs-agent-server --tail 20
podman logs fhs-llm-provider -f
```

## Actualizar un servicio

```bash
# Reconstruir y redesplegar un solo servicio
podman-compose -f containers/compose.yaml build --no-cache <servicio>
podman-compose -f containers/compose.yaml up -d --force-recreate <servicio>
```

## Detener el stack

```bash
just container-down
# o: podman-compose -f containers/compose.yaml down
```

## Variables de entorno

El archivo `.env` en la raíz contiene las variables por defecto:

```bash
AGENT_SERVER_PORT=8083
LLM_PROVIDER_PORT=43111
OCR_PROVIDER_PORT=43112
MOCK_LLM_PORT=43110
REGISTRY_URL=ws://localhost:8083/fhs/v1/ws
LLAMA_CPP_URL=http://localhost:8080/v1
OCR_SERVICE_URL=http://ether-ocr-api:8000
OCR_API_KEY=dev-key-ether-ocr
MODEL_ID=qwen2.5-coder-3b-instruct
MODEL_DISPLAY_NAME="Qwen 2.5 Coder 3B Instruct"
MODEL_CONTEXT_WINDOW=4096
MODEL_TOOL_CALLING_SUPPORTED=true
```

`MODEL_*` controla qué modelo se publica en el manifiesto del `llm-provider` (DEC-0019) — cambiar de modelo ya no requiere editar código ni reconstruir la imagen, solo estas variables. `LLAMA_CPP_URL` debe apuntar al puerto real donde corre `llama-server` en el bastion (gestionado fuera de este repo, en `/opt/llama.cpp/current/scripts/start-server.sh` con `--jinja` — ver `docs/manifiesto-llm.md`).

Para desarrollo local, cambiar los hostnames a `localhost`. Para contenedores, usar Docker DNS (`agent-server`, `llm-provider`, `ether-ocr-api`).

## Firewall (UFW en el bastion)

Los puertos externos deben estar en la whitelist de UFW:

```bash
sudo ufw allow 3000/tcp    # Web frontend
sudo ufw allow 8080/tcp    # llama.cpp
# 30083 (agent-server) ya está en el rango 30000-30099 (Podman Web)
# 43111/43112 (llm-provider/ocr-provider) necesitan regla explícita —
# ya no van remapeados dentro del rango 30000-30099. Ver docs/despliegue-multi-host.md
# para el caso de despliegue en dos máquinas, donde esto se confirmó necesario
# (UFW con policy DROP bloqueaba todo lo que no fuera SSH).
sudo ufw allow from 192.168.3.0/24 to any port 43111 proto tcp
sudo ufw allow from 192.168.3.0/24 to any port 43112 proto tcp
```

## Notas

- **Red `fhs`**: el `ether-ocr-api` debe conectarse manualmente tras cada reinicio del container OCR: `podman network connect fhs ether-ocr-api`
- **Modelo LLM**: Qwen 2.5 Coder 3B en `/srv/models/gguf/qwen2.5-coder-3b-instruct-q4_k_m.gguf`, configurado por env vars (ver arriba, DEC-0019) — no hardcodeado
- **`llama-server`**: se gestiona fuera de este repo, en el proyecto `PoC-Llama.cpp` del bastion (`/opt/llama.cpp/current/scripts/start-server.sh`, con `--jinja`). Tras cambiar de modelo ahí, verificar con `curl` que el tool calling funciona antes de actualizar `MODEL_TOOL_CALLING_SUPPORTED` en `containers/compose.yaml` (ver `docs/protocolo-provider.md`, "Lecciones de integración")
- **`llama-server` puede quedar en estado degradado** tras varias corridas seguidas (un slot queda `is_processing: false` con tokens ya decodificados pero sin devolver respuesta — observado en sesiones de prueba largas). Si una petición se cuelga más de ~5 minutos, verificar `curl http://<bastion>:8080/slots` y reiniciar el servidor con el mismo script de arranque si hace falta
- **Timeout**: 300s en el bridge y 310s en el gateway para tolerar hardware lento
- **Versión**: el hash del commit se muestra en el header del frontend y en `/health`
