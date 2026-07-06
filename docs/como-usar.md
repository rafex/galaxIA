# Cómo usar galaxIA

Esta guía explica cómo levantar el stack completo de galaxIA.

## Requisitos

- Node.js >= 20
- npm >= 10
- Podman o Docker (para contenedores)
- Un servidor `llama-server` (llama.cpp) corriendo con un modelo GGUF que soporte tool calling, si quieres probar OCR de verdad. Ver `docs/manifiesto-llm.md`.

## Opción rápida: contenedores contra un bastion remoto

Este es el flujo real usado durante el desarrollo (ver `docs/despliegue.md` para el detalle completo).

```bash
# Con una conexión podman remota ya configurada (podman system connection list)
just container-up           # stack completo
# o por partes:
just container-up-core      # atlas + navigator + portal
just container-up-llm       # wrapper FHS de llama.cpp
just container-up-ocr       # wrapper FHS de ether-ocr
```

Esto levanta (puertos del bastion, ver `docs/despliegue.md` para el mapeo completo):

- `fhs-portal` — frontend del chat
- `fhs-atlas` — Registry (catálogo de nodos)
- `fhs-navigator` — Agent Runtime + Chat API (habla con `fhs-atlas` por HTTP, DEC-0035)
- `fhs-star` — wrapper FHS hacia `llama-server`
- `fhs-satellite-ocr` — wrapper FHS hacia `ether-ocr-api`

`ether-ocr-api` y `llama-server` **no** están en `containers/compose.yaml` — corren por separado (ether-ocr-api como su propio contenedor, llama-server como proceso nativo en el host). Ver `docs/despliegue.md`.

## Abrir el chat

Ve a la URL del frontend (`http://<host>:3000`). El header muestra el hash del commit desplegado.

## Probar OCR

1. Adjunta una imagen o PDF con el botón "Adjuntar".
2. El sistema extrae el texto automáticamente y lo muestra en una burbuja colapsada — expándela para ver el resultado.
3. Haz clic en **"Usar documento"** para que el LLM responda usando ese texto, o **"Descartar"** si no lo necesitas (no gasta ninguna llamada al LLM).
4. Si ya habías escrito una pregunta junto con el archivo, se usa automáticamente al confirmar. Si no, escribe tu pregunta después de confirmar.

Ver `spec-native/specs/ocr-confirmacion/SPEC.md` para el diseño completo de este flujo.

## Opción de desarrollo: sin contenedores

### Terminal 1 — Atlas (Registry)

```bash
npm install
just dev-atlas
```

### Terminal 2 — Navigator (Agent Runtime)

```bash
# Requiere atlas corriendo (Terminal 1)
just dev-agent
```

### Terminal 3 — Frontend

```bash
just dev-web
```

### Terminal 4 — LLM Provider (o mock)

```bash
# Con llama.cpp real corriendo en LLAMA_CPP_URL
just dev-llm-provider

# O con un mock determinístico (sin GPU/modelo real, útil para probar el pipeline)
just dev-mock-llm
```

### Terminal 5 — OCR Provider

```bash
# Requiere OCR_SERVICE_URL apuntando a un servicio real compatible con ether-ocr-api
just dev-ocr-provider
```

Ver `just --list` para todas las recetas disponibles (`helpers/just/dev.just`).

## Variables de entorno importantes

Ver `docs/proveedores.md` y `docs/despliegue.md` para la tabla completa por servicio. Las más relevantes:

| Variable | Servicio | Descripción |
|---|---|---|
| `MODEL_ID` / `MODEL_TOOL_CALLING_SUPPORTED` | star | Qué modelo se publica y si soporta tool calling (DEC-0019) — verificar con `curl` antes de cambiar |
| `LLAMA_CPP_URL` | star | URL del `llama-server` real |
| `OCR_SERVICE_URL` | satellite-ocr | URL del servicio OCR compatible con ether-ocr-api |
| `AGENT_SERVER_PORT` | navigator | Puerto HTTP/WebSocket |
| `ATLAS_URL` | navigator | Dónde vive Atlas (DEC-0035) |

## Comandos útiles

```bash
# Ver contenedores corriendo
podman ps

# Ver logs
just container-logs atlas
just container-logs navigator
just container-logs star
just container-logs satellite-ocr

# Detener todo
just container-down
```
