# Observabilidad de logs multi-host (`apps/log-agent`, DEC-0083)

Diagnosticar un problema en la topología multi-host (`docs/despliegue-multi-host.md`) requiere hoy saltar por SSH a cada máquina y revisar `podman logs` uno por uno, sin línea de tiempo unificada ni forma de correlacionar un `conversationId`/`requestId` entre hosts. `apps/log-agent` resuelve esto sin cambiar el protocolo FHS ni el hábito operativo existente: sigue siendo un archivo de texto plano que se abre con `lnav`, solo que ahora también se agrega uno central.

**No forma parte del protocolo FHS** — es una capa operativa, igual que el bridge de eventos NATS (`SPEC-BRIDGE-0001`, DEC-0074) del que reusa la infraestructura y el patrón de degradación.

## Cómo funciona

- **Modo `ship`** (uno por host, uno por cada set de contenedores de su rol): sigue `podman logs -f <container>` de cada contenedor configurado. Cada línea se escribe a un archivo local (`logs/<container>.log` — exactamente lo que `just logs-core`/`logs-llm`/`logs-ocr` ya usaban, sin cambios ahí) y, si hay conexión NATS, se publica también a `logs.<host>.<container>`.
- **Modo `collect`** (una vez, junto al servidor NATS): se suscribe a `logs.>` (todos los hosts) y arma `logs/all.log`, formato `[host/container] línea` — el archivo para ver **todo el sistema en una sola vista** con `lnav -f logs/all.log`.
- **Degradación**: sin `NATS_URL`, o si la conexión falla, `ship` sigue escribiendo su archivo local exactamente igual — nunca depende de NATS para eso. `collect` sí requiere NATS (sin conexión no hay nada que agregar) y falla explícito si no la tiene.

## Levantar NATS (una vez, en el nodo que hará de `collect` — recomendado: el más "siempre encendido" de la topología)

```bash
podman run -d --name fhs-nats -p 4222:4222 --restart unless-stopped nats:2.10-alpine
```

A diferencia del overlay `containers/compose.nats.yaml` (que no publica el puerto, solo red interna del compose), aquí se publica `4222` a la LAN para que otros hosts lo alcancen.

## Correr `collect` (en el mismo nodo que NATS)

```bash
cd apps/log-agent
LOG_AGENT_MODE=collect \
NATS_URL=nats://localhost:4222 \
LOG_AGENT_LOCAL_DIR=./logs \
  npm start
```

## Correr `ship` (en cada host, con los contenedores de su rol)

```bash
cd apps/log-agent
LOG_AGENT_MODE=ship \
LOG_AGENT_HOST_LABEL=<nombre-del-host> \
LOG_AGENT_CONTAINERS=<contenedor1>,<contenedor2> \
NATS_URL=nats://<ip-del-nodo-nats>:4222 \
LOG_AGENT_LOCAL_DIR=./logs \
  npm start
```

Ejemplo real de la topología actual (Bastion = core + LLM, Raspi4B = OCR, Laptop = Portal — ver `docs/despliegue-multi-host.md`, sección de topología invertida):

| Host | `LOG_AGENT_HOST_LABEL` | `LOG_AGENT_CONTAINERS` |
|---|---|---|
| Bastion | `bastion` | `fhs-atlas,fhs-navigator,fhs-star` |
| Raspi4B | `raspi4b` | `fhs-satellite-ocr,ether-ocr-api` |
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

Ya que NATS corre de todos modos, se puede activar gratis el bridge `node.online`/`node.lost` que ya existe en el código (DEC-0074) pero no estaba activo en este despliegue — agregar `NATS_URL=nats://localhost:4222` (o la IP correspondiente) a los `podman run` de `fhs-atlas`/`fhs-navigator`. No es necesario para que `log-agent` funcione, es una mejora aparte.

## Límites conocidos, no resueltos por este cambio

- Sin rotación de logs — `logs/*.log` crece sin límite. Aceptable para el alcance actual (PoC/comunidad, hardware modesto); si se vuelve un problema real, `logrotate` estándar del sistema operativo resuelve esto sin tocar el código.
- Sin persistencia/replay en NATS (core, sin JetStream, misma decisión que DEC-0074) — si `collect` se reinicia, no recupera lo que se perdió mientras estuvo caído. El archivo local de cada `ship` sigue siendo la fuente completa para ese host.
