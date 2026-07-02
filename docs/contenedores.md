# Despliegue con contenedores

galaxIA se despliega con Podman o Docker. Cada componente tiene su propio contenedor. Para el despliegue real usado durante el desarrollo (bastion remoto), ver [`despliegue.md`](./despliegue.md) — este documento cubre la estructura general de contenedores.

## Estructura de contenedores

```
containers/
├── agent-server/     # Backend Fastify (Registry + Runtime + Chat API)
├── web/               # Frontend con Nginx
├── llm-provider/       # Wrapper FHS hacia llama.cpp
├── ocr-provider/       # Wrapper FHS hacia ether-ocr-api
└── compose.yaml       # Orquestación
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
| `fhs-web` | 3000 | Chat web |
| `fhs-agent-server` | 8081 | API REST + WebSocket + Registry |
| `fhs-llm-provider` | 43111 | Wrapper FHS de chat |
| `fhs-ocr-provider` | 43112 | Wrapper FHS de tools |

En el bastion los puertos externos son distintos — ver la tabla de mapeo en `docs/despliegue.md`.

## Red entre contenedores

Los contenedores se comunican a través de la red `fhs` (Docker DNS): `agent-server`, `fhs-web`, `llm-provider`, `ocr-provider`.

## Construir imágenes individualmente

```bash
podman build -t fhs-agent-server -f containers/agent-server/Containerfile .
podman build -t fhs-web -f containers/web/Containerfile .
podman build -t fhs-llm-provider -f containers/llm-provider/Containerfile .
podman build -t fhs-ocr-provider -f containers/ocr-provider/Containerfile .
```

## Modelo LLM y variables de entorno

El modelo publicado por `llm-provider` (id, nombre, soporte de tool calling) se configura por variables de entorno en `compose.yaml` — no está hardcodeado en el código. Ver `docs/proveedores.md` y `spec-native/DECISIONS.md` DEC-0019.
