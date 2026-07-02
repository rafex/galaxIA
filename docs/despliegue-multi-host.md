# Despliegue multi-host: laptop + bastion

Hasta ahora todo el stack (`web`, `agent-server`, `llm-provider`, `ocr-provider`) corría en un solo host (el bastion, `192.168.3.173`), simulando federación pero en realidad todo en una sola máquina. Este documento describe el paso a una topología real de **dos nodos en la misma LAN**, que es lo que el protocolo FHS está diseñado para demostrar: recursos de IA repartidos en hardware distinto, descubiertos por WebSocket, no por Docker DNS local.

## Topología objetivo

- **laptop** — el core: `apps/web` (chat) + `apps/agent-server` (Registry + Agent Runtime + Chat API). Es donde vive el catálogo de proveedores y donde el usuario abre el navegador.
- **bastion** — los providers pesados: `examples/llm-provider` (wrapper FHS) + `llama-server` (el modelo real), y `examples/ocr-provider` (wrapper FHS) + `ether-ocr-api` (OCR real).
- Ambas máquinas están en la **misma LAN**, alcanzables por IP directa. El bastion es además el punto de entrada SSH habitual, pero eso es solo para administración — el tráfico del protocolo FHS (WebSocket) va directo laptop↔bastion por la LAN, sin túnel.

```mermaid
flowchart TB
    subgraph Laptop["💻 Laptop — el core"]
        Web["apps/web<br/>chat"]
        Agent["apps/agent-server<br/>Registry + Runtime + Chat API"]
        Web -->|WebSocket local| Agent
    end

    subgraph Bastion["🖥️ Bastion — providers pesados"]
        LlmProvider["examples/llm-provider<br/>wrapper FHS"]
        Llama["llama-server<br/>Qwen2.5-Coder-3B"]
        OcrProvider["examples/ocr-provider<br/>wrapper FHS"]
        EtherOcr["ether-ocr-api<br/>Tesseract"]
        LlmProvider -->|curl localhost| Llama
        OcrProvider -->|curl -F localhost| EtherOcr
    end

    Usuario["🧑 Usuario"] -->|navegador| Web

    LlmProvider -.->|"FHS WebSocket<br/>hello/register/ping<br/>saliente hacia laptop"| Agent
    OcrProvider -.->|"FHS WebSocket<br/>hello/register/ping<br/>saliente hacia laptop"| Agent

    Agent -.->|"chat.request<br/>FHS WebSocket"| LlmProvider
    Agent -.->|"tool.call<br/>FHS WebSocket"| OcrProvider
```

**Punto clave**: las conexiones FHS **siempre las inician los providers hacia el Registry** (`hello`/`register`/`ping`), nunca al revés — esto ya estaba en el protocolo (`docs/protocolo.md`, regla 2). Eso significa que el bastion solo necesita **salida** hacia la laptop; la laptop necesita tener su puerto de Registry **accesible desde la LAN** (no solo `localhost`).

## Qué cambia respecto al despliegue de un solo host

| Antes (todo en bastion) | Ahora (laptop + bastion) |
|---|---|
| Providers se registran vía Docker DNS (`ws://agent-server:8081/...`) | Providers se registran vía IP LAN de la laptop (`ws://<ip-laptop>:8081/...`) |
| Providers anuncian su endpoint con nombre Docker (`llm-provider`, `ocr-provider`) | Providers anuncian su endpoint con la IP LAN del bastion |
| Un solo `docker network fhs` conecta todo | No hay red Docker compartida entre hosts — todo pasa por puertos publicados en cada host y la LAN real |
| `llama-server`/`ether-ocr-api` alcanzables solo desde el mismo host | Siguen siendo solo-locales al bastion — los providers FHS siguen siendo el único punto de entrada externo |

### Cambio de código necesario (ya aplicado)

`containers/compose.yaml` tenía el `REGISTRY_URL` y el hostname anunciado por cada provider **hardcodeados** a nombres de Docker DNS — imposible de usar entre dos hosts. Se cambió a variables sobreescribibles:

```yaml
- LLM_PROVIDER_HOST=${LLM_PROVIDER_HOST:-llm-provider}
- REGISTRY_URL=${PROVIDER_REGISTRY_URL:-ws://agent-server:8081/fhs/v1/ws}
```

Los defaults preservan el comportamiento de un solo host sin tocar nada. Para multi-host, se sobreescriben por variable de entorno del shell (tiene precedencia sobre `.env`) al momento de levantar los providers en el bastion.

> Se usó `PROVIDER_REGISTRY_URL`, no `REGISTRY_URL`, a propósito: el `.env` del repo ya define `REGISTRY_URL` para desarrollo local sin contenedores (apunta a `localhost`) — reusar ese nombre habría hecho que `podman-compose` lo cargara automáticamente y rompiera el default de un solo host.

También se quitó `depends_on: agent-server` de `llm-provider`/`ocr-provider` en `compose.yaml` — con dependencia, `podman-compose` intentaba levantar `agent-server` localmente en el bastion aunque solo se pidiera `llm-provider`, lo cual no tiene sentido cuando `agent-server` vive en otra máquina.

## Ciclo de vida del registro entre hosts

```mermaid
sequenceDiagram
    participant LP as llm-provider (bastion)
    participant OP as ocr-provider (bastion)
    participant REG as agent-server / Registry (laptop)

    Note over LP,REG: Ambos providers corren en el bastion,<br/>el Registry corre en la laptop, misma LAN

    LP->>REG: hello (ws://<ip-laptop>:8081/fhs/v1/ws)
    REG-->>LP: welcome (lease: 30s)
    LP->>REG: register (manifest con endpoint ws://<ip-bastion>:30084/...)
    REG-->>LP: registered

    OP->>REG: hello
    REG-->>OP: welcome
    OP->>REG: register (manifest con endpoint ws://<ip-bastion>:30085/...)
    REG-->>OP: registered

    loop cada 10s
        LP->>REG: ping
        REG-->>LP: pong
        OP->>REG: ping
        REG-->>OP: pong
    end

    Note over REG: Si algún provider no hace ping en 30s,<br/>el Registry lo marca "lost" y notifica al chat
```

## Puertos y firewall

| Servicio | Host | Puerto | Quién debe alcanzarlo |
|---|---|---|---|
| `apps/web` (chat) | laptop | `3000` (o el que uses en dev) | El navegador del usuario (localhost en la laptop, o la LAN si otros quieren probar) |
| `apps/agent-server` (Registry + Chat API) | laptop | `8081` (dev) / `8083` (contenedor, ver `.env`) | Los providers del bastion (`hello`/`register`/`ping`), y el navegador (WebSocket de chat) |
| `examples/llm-provider` | bastion | `43111` (interno) / `30084` (publicado) | El agent-server de la laptop (`chat.request`) |
| `examples/ocr-provider` | bastion | `43112` (interno) / `30085` (publicado) | El agent-server de la laptop (`tool.call`) |
| `llama-server` | bastion | `8080` | Solo `llm-provider`, local al bastion — **no** necesita ser alcanzable desde la laptop |
| `ether-ocr-api` | bastion | `8000` | Solo `ocr-provider`, local al bastion — **no** necesita ser alcanzable desde la laptop |

**En la laptop**: abrir el puerto del agent-server (`8081`/`8083` según se use contenedor o dev) a la LAN — hoy probablemente solo escucha en `127.0.0.1` si se corrió con `HOST` por defecto. Revisar `HOST=0.0.0.0` en el contenedor (ya está así en `containers/compose.yaml`) o en `just dev-agent` si se corre sin contenedor.

**En el bastion**: no se necesita abrir nada nuevo — los providers solo hacen conexiones salientes hacia la laptop. Los puertos `30084`/`30085` ya estaban publicados para el caso de un solo host; en multi-host esos son los puertos que el agent-server de la laptop usa para conectarse *de vuelta* cuando envía `chat.request`/`tool.call` (FHS es bidireccional sobre la misma conexión WebSocket que el provider abrió — no se abre una conexión nueva desde la laptop).

## Cómo desplegar

### En la laptop (el core)

```bash
cd galaxIA
just container-up-core   # web + agent-server
# o en modo dev sin contenedores:
just dev-agent
just dev-web
```

Verificar que el Registry escuche en todas las interfaces, no solo localhost:

```bash
curl http://<ip-laptop>:8081/health
```

### En el bastion (los providers)

```bash
cd galaxIA

# Apuntar los providers al Registry de la laptop
export PROVIDER_REGISTRY_URL="ws://<ip-laptop>:8081/fhs/v1/ws"
export LLM_PROVIDER_HOST="<ip-bastion>"
export OCR_PROVIDER_HOST="<ip-bastion>"

just container-up-llm
just container-up-ocr
```

### Verificar que los providers se registraron

Desde cualquier máquina de la LAN:

```bash
curl http://<ip-laptop>:8081/api/fhs/providers
```

Debe listar `did:key:macmini-raul` (llm) y `did:key:ocr-provider-01` (mcp) con sus endpoints apuntando al bastion.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El agent-server de la laptop escucha solo en `127.0.0.1` | Alto — los providers del bastion nunca logran conectar | Confirmar `HOST=0.0.0.0` (ya es el default en `containers/compose.yaml`); en dev sin contenedores, exportar `HOST=0.0.0.0` antes de `just dev-agent` |
| Firewall de la laptop bloquea el puerto del agent-server | Alto | Abrir el puerto correspondiente solo a la LAN, no a internet — la laptop no debería exponer el Registry públicamente |
| La laptop se apaga o pierde red — el Registry desaparece | Alto | Es un único punto de fallo nuevo (antes el Registry vivía en el bastion, la máquina "siempre encendida"); documentar como riesgo operativo, no resuelto en esta iteración — ver `spec-native/ROADMAP.md`, "Separar Registry del Agent Backend" |
| `PROVIDER_REGISTRY_URL` mal escrito silenciosamente cae al default de Docker DNS (`ws://agent-server:8081`), que no existe en el bastion | Medio | El provider lo intentará y nunca conectará — revisar logs (`podman logs fhs-llm-provider`) buscando "Conectado al Registry" ausente, no asumir que "sin error visible" significa que funcionó (misma lección de `docs/protocolo-provider.md`, "Lecciones de integración") |
| Latencia extra por ida-vuelta en la LAN (mínima, pero real) sumada a la latencia ya alta del modelo en el bastion | Bajo | No debería ser perceptible en LAN local; medir con las mismas pruebas end-to-end que se usaron para OCR determinístico si hay dudas |

## Verificación end-to-end (checklist)

Siguiendo la lección de `spec-native/TRACEABILITY.md` ("registrado no es probado"): no dar por terminado este cambio solo porque `/api/fhs/providers` muestra los providers en línea.

1. `curl http://<ip-laptop>:8081/api/fhs/providers` — ambos providers `online`.
2. Abrir el chat en `http://<ip-laptop>:3000`, mandar un mensaje simple (sin adjunto) — confirmar respuesta del LLM.
3. Adjuntar un documento — confirmar que `ocr.extracted` llega con el texto correcto (no solo que no hay error).
4. Confirmar "Usar documento" — confirmar que la respuesta final del LLM usa el texto extraído.
5. Revisar logs de ambos providers en el bastion durante la prueba — deben mostrar `tool.call`/`chat.request` entrantes desde la IP de la laptop, no timeouts.

## Enlaces relacionados

- `docs/despliegue.md` — despliegue de un solo host (referencia histórica, sigue siendo válido si no se separan las máquinas).
- `docs/protocolo.md` — regla 2 (registro por lease) y regla 3 (heartbeat), la base de por qué los providers inician la conexión.
- `docs/protocolo-provider.md` — contrato que cualquier provider debe cumplir, incluida la sección "Lecciones de integración".
- `spec-native/DECISIONS.md` DEC-0022 — decisión de adoptar esta topología y el cambio de `compose.yaml`.
