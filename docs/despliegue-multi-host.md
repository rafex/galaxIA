# Despliegue multi-host: laptop + bastion

Hasta ahora todo el stack (`portal`, `navigator`, `star`, `satellite-ocr`) corría en un solo host (el bastion, `192.168.3.173`), simulando federación pero en realidad todo en una sola máquina. Este documento describe el paso a una topología real de **dos nodos en la misma LAN**, que es lo que el protocolo FHS está diseñado para demostrar: recursos de IA repartidos en hardware distinto, descubiertos por WebSocket, no por Docker DNS local.

> Desde DEC-0035, el core de la laptop son **tres** servicios, no dos: `apps/atlas` (Registry) se separó de `apps/navigator` (Agent Runtime). Los providers del bastion se registran directamente contra Atlas, no contra Navigator — ver `docs/atlas.md`/`docs/navigator.md`.
>
> **Nota (split de repos):** `examples/star-example` y `examples/satellite-ocr-example`, referenciados en este documento, ya no viven en este repo (`galaxIA`) — se movieron a [`galaxIA-satellite-star`](https://github.com/rafex/galaxIA-satellite-star). El checkout del bastion debe clonar ese repo por separado; el resto de esta topología (puertos, UFW, `PROVIDER_REGISTRY_URL`) no cambia.

## Topología objetivo

- **laptop** — el core: `apps/portal-chat` (chat), `apps/atlas` (Registry — catálogo de proveedores) y `apps/navigator` (Agent Runtime + Chat API, habla con Atlas por HTTP). Es donde el usuario abre el navegador.
- **bastion** — los providers pesados: `examples/star-example` (wrapper FHS) + `llama-server` (el modelo real), y `examples/satellite-ocr-example` (wrapper FHS) + `ether-ocr-api` (OCR real).
- Ambas máquinas están en la **misma LAN**, alcanzables por IP directa. El bastion es además el punto de entrada SSH habitual, pero eso es solo para administración — el tráfico del protocolo FHS (WebSocket) va directo laptop↔bastion por la LAN, sin túnel.

```mermaid
flowchart TB
    subgraph Laptop["💻 Laptop — el core"]
        Web["apps/portal-chat<br/>chat"]
        Nav["apps/navigator<br/>Agent Runtime + Chat API"]
        Atlas["apps/atlas<br/>Registry (catálogo)"]
        Web -->|WebSocket local| Nav
        Nav -->|HTTP local<br/>AtlasClient| Atlas
    end

    subgraph Bastion["🖥️ Bastion — providers pesados"]
        LlmProvider["examples/star-example<br/>wrapper FHS"]
        Llama["llama-server<br/>Qwen2.5-Coder-3B"]
        OcrProvider["examples/satellite-ocr-example<br/>wrapper FHS"]
        EtherOcr["ether-ocr-api<br/>Tesseract"]
        LlmProvider -->|curl localhost| Llama
        OcrProvider -->|curl -F localhost| EtherOcr
    end

    Usuario["🧑 Usuario"] -->|navegador| Web

    LlmProvider -.->|"FHS WebSocket<br/>hello/register/ping<br/>saliente hacia laptop"| Atlas
    OcrProvider -.->|"FHS WebSocket<br/>hello/register/ping<br/>saliente hacia laptop"| Atlas

    Nav -.->|"chat.request<br/>FHS WebSocket"| LlmProvider
    Nav -.->|"tool.call<br/>FHS WebSocket"| OcrProvider
```

**Punto clave**: las conexiones FHS **siempre las inician los providers hacia Atlas** (`hello`/`register`/`ping`), nunca al revés — esto ya estaba en el protocolo (`docs/protocolo.md`, regla 2). Eso significa que el bastion solo necesita **salida** hacia la laptop; la laptop necesita tener el puerto de Atlas **accesible desde la LAN** (no solo `localhost`).

## Qué cambia respecto al despliegue de un solo host

| Antes (todo en bastion) | Ahora (laptop + bastion) |
|---|---|
| Providers se registran vía Docker DNS (`ws://atlas:8081/...`) | Providers se registran vía IP LAN de la laptop (`ws://<ip-laptop>:8081/...`) |
| Providers anuncian su endpoint con nombre Docker (`star`, `satellite-ocr`) | Providers anuncian su endpoint con la IP LAN del bastion |
| Un solo `docker network fhs` conecta todo | No hay red Docker compartida entre hosts — todo pasa por puertos publicados en cada host y la LAN real |
| `llama-server`/`ether-ocr-api` alcanzables solo desde el mismo host | Siguen siendo solo-locales al bastion — los providers FHS siguen siendo el único punto de entrada externo |

### Cambio de código necesario (ya aplicado)

`containers/compose.yaml` tenía el `REGISTRY_URL` y el hostname anunciado por cada provider **hardcodeados** a nombres de Docker DNS — imposible de usar entre dos hosts. Se cambió a variables sobreescribibles:

```yaml
- LLM_PROVIDER_HOST=${LLM_PROVIDER_HOST:-star}
- REGISTRY_URL=${PROVIDER_REGISTRY_URL:-ws://atlas:8081/fhs/v1/ws}
```

Los defaults preservan el comportamiento de un solo host sin tocar nada. Para multi-host, se sobreescriben por variable de entorno del shell (tiene precedencia sobre `.env`) al momento de levantar los providers en el bastion.

> Se usó `PROVIDER_REGISTRY_URL`, no `REGISTRY_URL`, a propósito: el `.env` del repo ya define `REGISTRY_URL` para desarrollo local sin contenedores (apunta a `localhost`) — reusar ese nombre habría hecho que `podman-compose` lo cargara automáticamente y rompiera el default de un solo host.

También se quitó `depends_on: atlas` de `star`/`satellite-ocr` en `compose.yaml` — con dependencia, `podman-compose` intentaba levantar `atlas` localmente en el bastion aunque solo se pidiera `star`, lo cual no tiene sentido cuando `atlas` vive en otra máquina.

> **Trampa real encontrada en el bastion (DEC-0075, `podman-compose` 1.3.0):** esa versión (la que trae Debian/apt) **no interpola** la sintaxis `${VAR:-default}` dentro de `environment:` cuando `VAR` no está exportada en el shell que invoca `podman-compose` — pasa el string literal `${ATLAS_URL:-http://atlas:8081}` como valor de la variable de entorno del contenedor. Con `portal-chat`, esto rompe el `envsubst` del template de nginx (`the closing bracket in "ATLAS_URL" variable is missing`) porque el valor sustituido contiene a su vez un `${...}` sin cerrar correctamente para el parser de nginx. **Workaround:** exportar los valores explícitamente antes de invocar `podman-compose` (o `just container-up-core`), aunque sean iguales al default:
> ```bash
> export ATLAS_URL=http://atlas:8081 NAVIGATOR_URL=http://navigator:8090
> just container-up-core
> ```
> `docker compose` v2+ y versiones más nuevas de `podman-compose` sí interpolan `${VAR:-default}` correctamente sin este paso — la trampa es específica de la versión vieja empaquetada por la distro.

### Separar también el core: Atlas/Navigator/Portal en máquinas distintas

Lo de arriba resuelve "los providers en otra máquina" — `apps/atlas`, `apps/navigator` y `apps/portal-chat` seguían asumiendo que viven juntos en el mismo host (mismo `docker network fhs`). Ya no hace falta: los tres son configurables por variable de entorno sin reconstruir ninguna imagen.

- `apps/atlas`/`apps/navigator` ya eran 100% configurables (`PORT`, `HOST`, `ATLAS_URL`) desde antes.
- `containers/portal-chat/nginx.conf.template` (antes `nginx.conf`, hardcodeado a `http://atlas:8081`/`http://navigator:8090`) ahora es un template real: la imagen `nginx:alpine` corre `envsubst` sobre él al arrancar, sustituyendo `${ATLAS_URL}`/`${NAVIGATOR_URL}` — variables de entorno del contenedor, no de nginx (`$host`, `$http_upgrade`, etc. quedan intactos porque no son variables de entorno del proceso).

Para un despliegue real de tres máquinas (Atlas en una, Navigator en otra, Portal en una tercera):

```bash
# En la máquina de Atlas
podman run -d -p 8081:8081 --name atlas ghcr.io/rafex/galaxia-atlas  # (o build local)

# En la máquina de Navigator
podman run -d -p 8090:8090 -e ATLAS_URL=http://<ip-atlas>:8081 ghcr.io/rafex/galaxia-navigator

# En la máquina del Portal
podman run -d -p 3000:80 \
  -e ATLAS_URL=http://<ip-atlas>:8081 \
  -e NAVIGATOR_URL=http://<ip-navigator>:8090 \
  ghcr.io/rafex/galaxia-portal-chat
```

Los defaults (`http://atlas:8081`/`http://navigator:8090`) preservan el comportamiento de un solo host vía `docker-compose` sin tocar nada — ver `containers/compose.yaml`. El overlay TLS (`compose.tls.yaml`) usa el mismo mecanismo con defaults `https://` (ver `nginx-tls.conf.template`).

**Riesgo conocido, no resuelto por este cambio:** nginx resuelve el hostname de `proxy_pass` **al arrancar** el contenedor, no de forma perezosa — si `ATLAS_URL`/`NAVIGATOR_URL` apunta a un hostname que no resuelve en ese momento (a diferencia de una IP, que nunca necesita DNS), el contenedor de portal-chat falla al arrancar con `host not found in upstream`. Con IPs directas (recomendado para multi-host real) esto no aplica.

## Ciclo de vida del registro entre hosts

```mermaid
sequenceDiagram
    participant LP as star (bastion)
    participant OP as satellite-ocr (bastion)
    participant REG as atlas / Registry (laptop)

    Note over LP,REG: Ambos providers corren en el bastion,<br/>Atlas corre en la laptop, misma LAN

    LP->>REG: hello (ws://<ip-laptop>:8081/fhs/v1/ws)
    REG-->>LP: welcome (lease: 30s)
    LP->>REG: register (manifest con endpoint ws://<ip-bastion>:43111/...)
    REG-->>LP: registered

    OP->>REG: hello
    REG-->>OP: welcome
    OP->>REG: register (manifest con endpoint ws://<ip-bastion>:43112/...)
    REG-->>OP: registered

    loop cada 10s
        LP->>REG: ping
        REG-->>LP: pong
        OP->>REG: ping
        REG-->>OP: pong
    end

    Note over REG: Si algún provider no hace ping en 30s,<br/>el Registry lo marca "lost" y notifica al chat
```

## Descubrimiento automático del Registry por mDNS (opcional, SPEC-P2P-0001)

En vez de configurar `REGISTRY_URL`/`PROVIDER_REGISTRY_URL` a mano en cada provider, `atlas` puede anunciarse por mDNS en la LAN (`_fhs-registry._tcp.local`) y que los providers lo encuentren solos:

- **Activado por default** en `atlas` — se puede desactivar con `MDNS_ENABLED=false` si no se quiere el anuncio (ej. redes que bloquean multicast, o se prefiere no anunciar el Registry).
- En cada provider, si `REGISTRY_URL` **no está definido** (o vale `"auto"`), se intenta el descubrimiento por mDNS antes de conectar. Si `REGISTRY_URL` sí trae una URL concreta, mDNS ni se intenta — coexisten sin conflicto.
- El anuncio va firmado con la identidad Ed25519 propia del Registry (DEC-0032) — el provider verifica la firma antes de confiar en lo encontrado. Para anclar explícitamente **qué** Registry se espera en esta comunidad (y no solo "alguno que firme válidamente"), define `REGISTRY_EXPECTED_DID=did:key:...` en cada provider — el `did` del Registry se ve en su log al arrancar (`Anunciando Registry por mDNS (did: ...)`).
- Si mDNS no encuentra ningún Registry válido, o encuentra más de uno, el provider **falla al arrancar** con un mensaje claro pidiendo `REGISTRY_URL` manual — nunca se queda esperando en silencio ni elige uno arbitrariamente.

**Límite explícito, no un bug**: mDNS solo funciona dentro del mismo segmento de multicast/broadcast (misma LAN). No resuelve el caso de un dispositivo con red remota distinta a la del resto (ej. un router 4G/5G aparte en el sitio de una demo) — ese caso sigue requiriendo `REGISTRY_URL` manual, como ya pasó en despliegues reales de esta PoC. Tampoco reemplaza el Registry centralizado ni cambia el protocolo `hello`/`register`/Pulse — solo resuelve "¿en qué IP:puerto está?".

## Puertos y firewall

| Servicio | Host | Puerto | Quién debe alcanzarlo |
|---|---|---|---|
| `apps/portal-chat` (chat) | laptop | `3000` (o el que uses en dev) | El navegador del usuario (localhost en la laptop, o la LAN si otros quieren probar) |
| `apps/atlas` (Registry) | laptop | `8081` (dev y contenedor — puerto sin cambios desde antes de DEC-0035) | Los providers del bastion (`hello`/`register`/`ping`), y Navigator (`AtlasClient`, HTTP) |
| `apps/navigator` (Chat API) | laptop | `8083` (dev) / `8090` (contenedor) | El Portal (WebSocket de chat) — no necesita ser alcanzable desde el bastion |
| `examples/star-example` | bastion | `43111` (sin remapeo, ver nota) | El navigator de la laptop (`chat.request`) |
| `examples/satellite-ocr-example` | bastion | `43112` (sin remapeo, ver nota) | El navigator de la laptop (`tool.call`) |
| `llama-server` | bastion | `8080` | Solo `star`, local al bastion — **no** necesita ser alcanzable desde la laptop |
| `ether-ocr-api` | bastion | `8000` | Solo `satellite-ocr`, local al bastion — **no** necesita ser alcanzable desde la laptop |

**En la laptop**: abrir el puerto de Atlas (`8081`) a la LAN — hoy probablemente solo escucha en `127.0.0.1` si se corrió con `HOST` por defecto. Revisar `HOST=0.0.0.0` en el contenedor (ya está así en `containers/compose.yaml`) o en `just dev-atlas` si se corre sin contenedor. El puerto de Navigator (`8083`/`8090`) **no** necesita abrirse a la LAN del bastion — solo lo usa el Portal, en la misma laptop.

**En el bastion**: abrir `43111`/`43112` a la LAN — son los puertos reales que `star`/`satellite-ocr` publican (sin remapeo, a propósito: el manifiesto anuncia el mismo puerto en el que escuchan; remapear a otro puerto externo, como se hacía antes con `30084`/`30085` en el caso de un solo host, haría que Navigator intentara conectarse al puerto equivocado). FHS es bidireccional sobre la misma conexión WebSocket que el provider abrió — no se abre una conexión nueva desde la laptop, pero Navigator sí necesita poder alcanzar estos puertos para `chat.request`/`tool.call`.

### Firewall real: UFW, no solo "abrir el puerto en teoría"

Verificado en el despliegue real: ambas máquinas corren UFW con policy `DROP` en `INPUT` y solo SSH permitido por defecto — el resto del tráfico entrante se descarta en silencio (sin rechazar explícitamente, así que el síntoma es un timeout de conexión, no un error claro). No es fail2ban (verificar con `sudo fail2ban-client status` para descartarlo primero) — es la configuración base del firewall. Comandos que se necesitan, acotados a la LAN, no a "Anywhere":

```bash
# En la laptop — abre el puerto de Atlas (Registry)
sudo ufw allow from 192.168.3.0/24 to any port 30083 proto tcp comment 'FHS atlas (Registry)'
sudo ufw reload

# En el bastion — abre los puertos de los providers
sudo ufw allow from 192.168.3.0/24 to any port 43111 proto tcp comment 'FHS star'
sudo ufw allow from 192.168.3.0/24 to any port 43112 proto tcp comment 'FHS satellite-ocr'
sudo ufw reload
```

Ajustar `192.168.3.0/24` y el puerto de `atlas` (`30083` es el mapeo de contenedor; `8081` si se corre en modo dev) según tu red real. Verificar con `sudo ufw status numbered` en ambas máquinas.

Diagnóstico usado para confirmar que era UFW y no otra cosa: el puerto respondía correctamente en `localhost` y en la IP LAN propia de la máquina, pero no desde la otra máquina — eso descarta un problema de *binding* (la app sí escucha en `0.0.0.0`) y apunta directo a un firewall de host filtrando por origen.

## Cómo desplegar

### En la laptop (el core)

```bash
cd galaxIA
just container-up-core   # atlas + navigator + portal-chat
# o en modo dev sin contenedores:
just dev-atlas
just dev-agent
just dev-web
```

Verificar que Atlas escuche en todas las interfaces, no solo localhost:

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

Debe listar `did:key:macmini-raul` (llm) y `did:key:satellite-ocr-01` (mcp) con sus endpoints apuntando al bastion.

## Ver logs de cada máquina en vivo (lnav)

Cada máquina de la topología corre el mismo checkout del repo pero levanta
contenedores distintos según su rol. `helpers/just/status.just` trae una
receta de logs por rol, pensada para pararse en esa máquina y correrla ahí
mismo — combinan los logs de sus contenedores en una sola vista de
[`lnav`](https://lnav.org) (colores por nivel, filtro en vivo con `/`, salto
entre errores con `e`/`E`), sin importar si el contenedor se levantó con
`podman-compose` o con `podman run` suelto (como los providers de bastion y
raspi4b en este despliegue):

```bash
# En la laptop (core): atlas + navigator + portal-chat
just logs-core

# En el bastion (llm): star
just logs-llm

# En raspi4b (ocr): satellite-ocr + ether-ocr-api
just logs-ocr

# Cualquier otro contenedor, en cualquier máquina
just logs-lnav <contenedor> [contenedor2 ...]
```

`lnav` requiere una terminal interactiva real (no funciona bien sobre un
`ssh host "comando"` no interactivo) — conéctate primero (`ssh laptop`,
`ssh bastion-alqrab`, `ssh raspi4b`, según corresponda) y corre la receta
ya dentro de esa sesión.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Atlas (laptop) escucha solo en `127.0.0.1` | Alto — los providers del bastion nunca logran conectar | Confirmar `HOST=0.0.0.0` (ya es el default en `containers/compose.yaml`); en dev sin contenedores, exportar `HOST=0.0.0.0` antes de `just dev-atlas` |
| Firewall de la laptop bloquea el puerto de Atlas | Alto | Abrir el puerto correspondiente solo a la LAN, no a internet — la laptop no debería exponer Atlas públicamente |
| La laptop se apaga o pierde red — Atlas desaparece | Alto | Es un único punto de fallo (antes el Registry vivía en el bastion, la máquina "siempre encendida"); documentar como riesgo operativo, no resuelto en esta iteración — ver `spec-native/ROADMAP.md` |
| `PROVIDER_REGISTRY_URL` mal escrito silenciosamente cae al default de Docker DNS (`ws://atlas:8081`), que no existe en el bastion | Medio | El provider lo intentará y nunca conectará — revisar logs (`podman logs fhs-star`) buscando "Conectado al Registry" ausente, no asumir que "sin error visible" significa que funcionó (misma lección de `docs/protocolo-provider.md`, "Lecciones de integración") |
| `ATLAS_URL` de Navigator mal escrito o Atlas caído | Medio | Navigator no puede resolver providers — falla visible al primer intento de chat (no silencioso), ver logs de Navigator |
| Latencia extra por ida-vuelta en la LAN (mínima, pero real) sumada a la latencia ya alta del modelo en el bastion | Bajo | No debería ser perceptible en LAN local; medir con las mismas pruebas end-to-end que se usaron para OCR determinístico si hay dudas |

## Verificación end-to-end (checklist)

Siguiendo la lección de `spec-native/TRACEABILITY.md` ("registrado no es probado"): no dar por terminado este cambio solo porque `/api/fhs/providers` muestra los providers en línea.

1. `curl http://<ip-laptop>:30083/api/fhs/providers` — ambos providers `online`. ✅ Verificado 2026-07-02.
2. Enviar un mensaje simple (sin adjunto) por `/api/chat/ws` en la laptop — confirmar respuesta del LLM. ✅ Verificado.
3. Adjuntar un documento — confirmar que `ocr.extracted` llega con el texto correcto (no solo que no hay error). ✅ Verificado: texto extraído coincidió exacto con el contenido real del PDF de prueba.
4. Confirmar "Usar documento" — confirmar que la respuesta final del LLM usa el texto extraído. ✅ Verificado: *"El documento dice: 'HOLA MUNDO PDF TEST - prueba OCR galaxIA'."*
5. Revisar logs de ambos providers en el bastion durante la prueba — deben mostrar `tool.call`/`chat.request` entrantes desde la IP de la laptop, no timeouts. ✅ Verificado.

**Resultado**: topología multi-host (laptop `192.168.3.137` core + bastion `192.168.3.173` providers) validada de punta a punta con tráfico real cruzando ambas máquinas — no solo diseñada. El único trabajo adicional necesario más allá de lo ya documentado en este archivo fue abrir UFW en ambas máquinas (ver sección de firewall arriba) — el protocolo FHS en sí no necesitó ningún cambio de código para funcionar entre dos hosts.

> **Nota (DEC-0035):** esta verificación (2026-07-02) fue contra la arquitectura anterior, con Atlas y Navigator en el mismo proceso. La separación en dos servicios se verificó end-to-end en local (ver DEC-0035 en `spec-native/DECISIONS.md`), pero repetir esta misma prueba multi-host real (laptop + bastion) contra la versión separada sigue pendiente — bloqueada por la misma falta de acceso a hardware físico que TASK-P2P-0006/issue #1.

## Enlaces relacionados

- `docs/despliegue.md` — despliegue de un solo host (referencia histórica, sigue siendo válido si no se separan las máquinas).
- `docs/protocolo.md` — regla 2 (registro por lease) y regla 3 (heartbeat), la base de por qué los providers inician la conexión.
- `docs/protocolo-provider.md` — contrato que cualquier provider debe cumplir, incluida la sección "Lecciones de integración".
- `spec-native/DECISIONS.md` DEC-0022 — decisión de adoptar esta topología y el cambio de `compose.yaml`.
