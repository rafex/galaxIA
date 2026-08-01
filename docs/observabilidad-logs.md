# Observabilidad de logs multi-host (DEC-0083)

Diagnosticar un problema en la topología multi-host (`docs/despliegue-multi-host.md`) requiere hoy saltar por SSH a cada máquina y revisar `podman logs` uno por uno, sin línea de tiempo unificada ni forma de correlacionar un `conversationId`/`requestId` entre hosts. Esto lo resuelve sin cambiar el protocolo FHS ni el hábito operativo existente: sigue siendo un archivo de texto plano que se abre con `lnav`, solo que ahora también se agrega uno central.

**No forma parte del protocolo FHS** — es una capa operativa, igual que el bridge de eventos NATS (`SPEC-BRIDGE-0001`, DEC-0074) del que reusa la infraestructura y el patrón de degradación.

## Cómo funciona

- **`ship`** (`helpers/scripts/shell/log-agent-ship.sh`, uno por host, uno por cada set de contenedores de su rol): sigue `podman logs -f <container>` de cada contenedor configurado. Cada línea se escribe a un archivo local (`logs/<container>.log` — exactamente lo que `just logs-core`/`logs-llm`/`logs-ocr` ya usaban, sin cambios ahí) y, si `NATS_URL` está seteada, se publica también a `logs.<host>.<container>` con el CLI de NATS. **Sin runtime aparte** — solo `podman` (ya presente en cada host) y el binario CLI de `nats` (un ejecutable estático, sin dependencias).
- **`collect`** (`apps/log-agent`, corre una vez, junto al servidor NATS): se suscribe a `logs.>` (todos los hosts) y arma `logs/all.log`, formato `[host/container] línea` — el archivo para ver **todo el sistema en una sola vista** con `lnav -f logs/all.log`. Esta pieza sí es una app Node/TypeScript (reusa el cliente oficial de NATS) — pero corre en **un solo host**, no en los tres.
- **Degradación**: sin `NATS_URL`, o si `nats pub` falla, `ship` sigue escribiendo su archivo local exactamente igual — nunca depende de NATS para eso (mismo patrón que `apps/atlas/src/atlas/nats-bridge.ts`, DEC-0074). `collect` sí requiere NATS (sin conexión no hay nada que agregar) y falla explícito si no la tiene.

## Por qué esta división (Node solo para `collect`)

`ship` originalmente también iba en TypeScript, pero eso hubiera exigido instalar Node en **los tres hosts** solo para poder invocar `podman logs -f` — footprint innecesario en máquinas que hoy no lo tienen (Bastion no traía Node instalado). Un script de shell + el CLI de `nats` (un solo binario, sin runtime) resuelve lo mismo con muchísimo menos peso. `collect` sí se queda en Node porque corre una sola vez, en un solo nodo (el mismo que aloja NATS), y ahí sí vale la pena reusar el cliente oficial de la librería.

## Levantar NATS (una vez, en el nodo que hará de `collect` — recomendado: el más "siempre encendido" de la topología)

```bash
podman run -d --name fhs-nats -p 4222:4222 --restart unless-stopped nats:2.10-alpine
```

A diferencia del overlay `containers/compose.nats.yaml` (que no publica el puerto, solo red interna del compose), aquí se publica `4222` a la LAN para que otros hosts lo alcancen.

## Instalar el CLI de NATS (en cada host que corre `ship`)

Un solo binario estático, sin sudo necesario si se instala en `~/.local/bin` (ver [instalación oficial](https://github.com/nats-io/natscli#installation)):

```bash
curl -sf https://binaries.nats.dev/nats-io/natscli/nats@latest | sh
```

## Correr `collect` (en el mismo nodo que NATS — requiere Node 20+)

```bash
cd apps/log-agent
npm install && npm run build
NATS_URL=nats://localhost:4222 LOG_AGENT_LOCAL_DIR=./logs npm start
```

## Correr `ship` (en cada host, con los contenedores de su rol — sin Node)

```bash
NATS_URL=nats://<ip-del-nodo-nats>:4222 \
  helpers/scripts/shell/log-agent-ship.sh <host_label> ./logs <contenedor1> [contenedor2 ...]
```

Ejemplo real de la topología actual (Bastion = core + LLM, Raspi4B = OCR, Laptop = Portal — ver `docs/despliegue-multi-host.md`, sección de topología invertida):

| Host | `host_label` | Contenedores |
|---|---|---|
| Bastion | `bastion` | `fhs-atlas fhs-navigator fhs-star` |
| Raspi4B | `raspi4b` | `fhs-satellite-ocr ether-ocr-api` |
| Laptop | `laptop` | `fhs-portal-chat` |

## Ver todo junto

```bash
lnav -f logs/all.log
```

Mismos atajos de siempre: `/` para filtrar, `e`/`E` para saltar entre errores. Buscar un `conversationId` ahora encuentra las líneas de los 3 hosts entrelazadas por timestamp, sin abrir 3 sesiones SSH.

## Puertos y firewall

| Servicio | Puerto | Quién debe alcanzarlo |
|---|---|---|
| NATS | `4222` | Cada host que corre `ship` — misma regla UFW que ya se abrió para Atlas (`docs/despliegue-multi-host.md`, sección de firewall), ajustando el puerto:<br>`sudo ufw allow from <red-lan>/24 to any port 4222 proto tcp comment 'FHS log-agent NATS'` |

## Extra opcional: activar el bridge de eventos existente

Ya que NATS corre de todos modos, se puede activar gratis el bridge `node.online`/`node.lost` que ya existe en el código (DEC-0074) pero no estaba activo en este despliegue — agregar `NATS_URL=nats://localhost:4222` (o la IP correspondiente) a los `podman run` de `fhs-atlas`/`fhs-navigator`. No es necesario para que este sistema de logs funcione, es una mejora aparte.

## Límites conocidos, no resueltos por este cambio

- Sin rotación de logs — `logs/*.log` crece sin límite. Aceptable para el alcance actual (PoC/comunidad, hardware modesto); si se vuelve un problema real, `logrotate` estándar del sistema operativo resuelve esto sin tocar el código.
- Sin persistencia/replay en NATS (core, sin JetStream, misma decisión que DEC-0074) — si `collect` se reinicia, no recupera lo que se perdió mientras estuvo caído. El archivo local de cada `ship` sigue siendo la fuente completa para ese host.
- `nats pub` por línea via CLI tiene un costo de proceso por línea — aceptable al volumen de logs de esta PoC; si el volumen crece mucho, la alternativa es un cliente NATS persistente (lo que hacía la versión en TypeScript descartada) a cambio de instalar Node en ese host.
