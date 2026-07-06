# Despliegue con contenedores

galaxIA se despliega con Podman o Docker. Cada componente tiene su propio contenedor. Para el despliegue real usado durante el desarrollo (bastion remoto), ver [`despliegue.md`](./despliegue.md) — este documento cubre la estructura general de contenedores.

## Estructura de contenedores

```
containers/
├── atlas/              # Registry — catálogo de nodos (DEC-0035)
├── navigator/          # Agent Runtime + Chat API (DEC-0035, habla con atlas por HTTP)
├── portal/             # Frontend con Nginx
├── star/               # Wrapper FHS hacia llama.cpp
├── satellite-ocr/      # Wrapper FHS hacia ether-ocr-api
└── compose.yaml        # Orquestación
```

`ether-ocr-api` (el servicio REST de OCR real) y `llama-server` (el motor de inferencia) **no** tienen contenedor propio en este repositorio — corren por separado. Ver `docs/despliegue.md` para el detalle.

## Levantar todo

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
| `fhs-star` | 43111 | Wrapper FHS de chat |
| `fhs-satellite-ocr` | 43112 | Wrapper FHS de tools |

En el bastion los puertos externos son distintos — ver la tabla de mapeo en `docs/despliegue.md`.

## Red entre contenedores

Los contenedores se comunican a través de la red `fhs` (Docker DNS): `atlas`, `navigator`, `portal`, `star`, `satellite-ocr`.

## Construir imágenes individualmente

```bash
podman build -t fhs-atlas -f containers/atlas/Containerfile .
podman build -t fhs-navigator -f containers/navigator/Containerfile .
podman build -t fhs-portal -f containers/portal/Containerfile .
podman build -t fhs-star -f containers/star/Containerfile .
podman build -t fhs-satellite-ocr -f containers/satellite-ocr/Containerfile .
```

## Modelo LLM y variables de entorno

El modelo publicado por `star` (id, nombre, soporte de tool calling) se configura por variables de entorno en `compose.yaml` — no está hardcodeado en el código. Ver `docs/proveedores.md` y `spec-native/DECISIONS.md` DEC-0019.
