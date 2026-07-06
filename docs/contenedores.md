# Despliegue con contenedores

galaxIA se despliega con Podman o Docker. Cada componente tiene su propio contenedor. Este repo solo contiene el **core del protocolo** (Atlas, Navigator, Portal) — los providers de referencia (Star, Satellite/OCR, RAG, KB) se despliegan desde [`galaxIA-satellite-star`](https://github.com/rafex/galaxIA-satellite-star), que tiene su propio `containers/compose.yaml`. Para el despliegue real usado durante el desarrollo (bastion remoto), ver [`despliegue-multi-host.md`](./despliegue-multi-host.md).

## Estructura de contenedores (este repo)

```
containers/
├── atlas/              # Registry — catálogo de nodos (DEC-0035)
├── navigator/          # Agent Runtime + Chat API (DEC-0035, habla con atlas por HTTP)
├── portal/             # Frontend con Nginx
└── compose.yaml        # Orquestación del core
```

Los providers (`star`, `satellite-ocr`, `rag-provider`, `kb-provider`) tienen su propia estructura equivalente en `galaxIA-satellite-star`, apuntando `PROVIDER_REGISTRY_URL` al Atlas de este repo.

`ether-ocr-api` (el servicio REST de OCR real) y `llama-server` (el motor de inferencia) **no** tienen contenedor propio en ningún repo de este proyecto — corren por separado. Ver `docs/despliegue-multi-host.md` para el detalle.

## Levantar el core

```bash
cd containers
podman-compose up --build
# o: docker compose up --build
```

Con `just` (recomendado, gestiona el hash del commit para el versionado):

```bash
just container-up
```

## Servicios expuestos (desarrollo local)

| Servicio | Puerto | Descripción |
|---|---|---|
| `fhs-portal` | 3000 | Chat web |
| `fhs-atlas` | 8081 | Registro de nodos (WebSocket) + catálogo (REST) |
| `fhs-navigator` | 8090 (sin publicar al host) | API REST + WebSocket de chat — solo Docker DNS interno |

Los providers de `galaxIA-satellite-star` exponen `43111` (star), `43112` (satellite-ocr), `43113` (rag-provider), `43114` (kb-provider) — ver el `README.md` de ese repo.

En el bastion los puertos externos son distintos — ver la tabla de mapeo en `docs/despliegue-multi-host.md`.

## Red entre contenedores

Los contenedores de este repo se comunican a través de la red `fhs` (Docker DNS): `atlas`, `navigator`, `portal`. Los providers de `galaxIA-satellite-star` se conectan a Atlas por su URL pública/LAN (`PROVIDER_REGISTRY_URL`), no comparten la misma red Docker por defecto (viven en un compose distinto).

## Construir imágenes individualmente

```bash
podman build -t fhs-atlas -f containers/atlas/Containerfile .
podman build -t fhs-navigator -f containers/navigator/Containerfile .
podman build -t fhs-portal -f containers/portal/Containerfile .
```

## Modelo LLM y variables de entorno

El modelo publicado por `star` (id, nombre, soporte de tool calling) se configura por variables de entorno en el `compose.yaml` de `galaxIA-satellite-star` — no está hardcodeado en el código. Ver `docs/proveedores.md` y `spec-native/DECISIONS.md` DEC-0019.
