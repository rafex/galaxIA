# Despliegue con contenedores

galaxIA se puede desplegar con Podman o Docker. Cada componente tiene su propio contenedor.

## Estructura de contenedores

```
containers/
├── agent-server/      # Backend Fastify
├── web/              # Frontend con Nginx
├── ocr-mcp/          # Servidor OCR en Python
├── llama-provider/   # Instrucciones para llama.cpp
└── compose.yaml      # Orquestación
```

## Levantar todo

```bash
cd containers
podman-compose up --build
```

Para Docker:

```bash
cd containers
docker compose up --build
```

## Servicios expuestos

| Servicio | Puerto | Descripción |
|---|---|---|
| Web | 3000 | Chat web |
| Agent Backend | 8081 | API REST + WebSocket + Registry |
| OCR MCP | 8082 | Servidor MCP OCR |

## Red entre contenedores

Los contenedores se comunican a través de la red `fhs`. Los nombres de servicio se resuelven por DNS:

- `agent-server`
- `fhs-web`
- `ocr-mcp`

## Conectar llama.cpp externo

Si tienes `llama-server` en otra máquina, edita `scripts/mock-providers.ts` y apunta el endpoint a tu servidor:

```typescript
endpoint: {
  protocol: "openai-compatible",
  url: "http://192.168.3.173:43110/v1"
}
```

Luego ejecútalo:

```bash
npx tsx scripts/mock-providers.ts
```

## Construir imágenes individualmente

```bash
podman build -t fhs-agent-server -f containers/agent-server/Containerfile .
podman build -t fhs-web -f containers/web/Containerfile .
podman build -t fhs-ocr-mcp -f containers/ocr-mcp/Containerfile .
```

## Despliegue en producción (para la ponencia)

Para el host `192.168.3.173`:

```bash
# Desde tu máquina local
rsync -avz --exclude node_modules --exclude .git . rafex@192.168.3.173:~/galaxIA

# En el host remoto
ssh rafex@192.168.3.173
cd ~/galaxIA/containers
podman-compose up --build -d
```

Asegúrate de que los puertos 3000, 8081 y 8082 estén abiertos en el firewall.
