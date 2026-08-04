# Diagnóstico del Proyecto

_Fecha: 2026-08-03 | Repositorio: galaxIA_

---

## 1. Exploración

### Estructura general

| Directorio | Contenido |
|---|---|
| `idl/` | Fuente de verdad del protocolo: `fhs-protocol.proto` (proto3, canonical), `asyncapi.yaml` (AsyncAPI 3.0), `openapi.yaml` (OpenAPI 3.1), `gossipsub.md`, `framing.md`, `flows.md` |
| `schemas/` | JSON Schema draft-07 de Beacons: `beacon-{base,nova,satellite,star}.schema.json` |
| `docs/` | 20 markdown: `network.md`, `p2p.md`, `trust.md`, `identity.md`, `handshake.md`, `mission.md`, `transport.md`, `protocolo.md`, `vocabulario.md`, guías de setup/E2E/contenedores |
| `site/` | Portal web público Jekyll → https://galax-ia.rafex.io (`CNAME`, `_config.yml`, `_layouts/`) |
| `spec-native/` | Contexto para agentes: specs por iniciativa (15), tasks, decisiones, roadmap, trazabilidad |
| `.specnative/` | Infraestructura SpecNative: `specnative_mcp.py` + venv Python (MCP server) |
| `.agents/`, `.claude/`, `.codex/` | Skills/commands de agentes |
| `.github/workflows/` | CI/CD — solo Jekyll → GitHub Pages |

### Lenguajes y tecnologías

- **Código ejecutable: ninguno.** Repositorio IDL-only.
- **Formatos de especificación:** Protobuf proto3, AsyncAPI 3.0, OpenAPI 3.1, JSON Schema draft-07, Markdown + diagramas Mermaid.
- **Sitio:** Jekyll (Ruby/kramdown).
- **Python:** solo el MCP server de SpecNative (`.specnative/.venv`, Python 3.14).
- **Stack real documentado** (vive en otros repos): TypeScript ≥5 / Node ≥20, Vite, Fastify, Podman/Docker. Rust es la estrategia futura (DEC-0088).
- **Red:** libp2p — DHT Kademlia, GossipSub, streams `/fhs/v1/0.1.0` sobre WSS obligatorio (DEC-P2P-001).

### Sistema de build / dependencias

- **No hay build system** de código (sin `package.json`, `Makefile`, `Dockerfile`, `Cargo.toml`, etc.).
- Único build automático: **Jekyll → GitHub Pages** vía GitHub Actions.
- Generación de código desde `.proto` solo documentada (`protoc` para Go/TS/Python/Rust) — sin scripts.

### Puntos de entrada

- **Documental:** `README.md` → `docs/README.md` → `idl/README.md`.
- **Canónico:** `idl/fhs-protocol.proto` (proto3, package `fhs.v1`).
- **CI/Deploy:** `.github/workflows/jekyll-gh-pages.yml` (build `site/` → Pages, trigger en `main` con cambios en `site/**`).

### Módulos y componentes clave

El repo define los contratos que consumen 4 repos externos:
- **galaxIA-Core** — runtime: Atlas, Navigator, Portal Chat/TUI, Log Agent
- **galaxIA-SDK** — paquetes npm `@rafex/galaxia-fhs-protocol`, `satellite-capabilities`
- **galaxIA-satellite-star** — providers Star/Nova/OCR/RAG/KB
- **galaxia-parser-catalog** — parseo tolerante LLM

Dentro del repo: `idl/` → `schemas/` (Beacons) ← `docs/` ↔ `spec-native/` (specs por iniciativa: fhs-mvp, p2p-discovery, ocr-confirmacion, rag-provider, kb-*, ipfs-adjuntos, etc.).

### Archivos de configuración relevantes

- `.gitignore` — declara el repo "IDL-only"; ignora residuos del monorepo original, `.env`, `certs/`, `*.db`, claves `*.pem/*.key`.
- `.containerignore` — artefacto heredado del stack de contenedores.
- `.github/workflows/jekyll-gh-pages.yml` — único CI/CD.
- `site/_config.yml` + `site/CNAME` — sitio Jekyll.
- `.specnative/*` — contrato del framework SpecNative (SCHEMA/CLI/MCP).
- `LICENSE` (MIT), `ECOSYSTEM.md` (topología multi-repo).
- ⚠️ `git config hooksPath` apunta a `.githooks/` que **no existe**.

### Estado del repositorio

- **Rama activa:** `main` (sincronizada con `origin/main`).
- **Último commit:** `1973579` "skills!" — rafex, 2026-08-03.
- **Historia:** 215 commits, 134 archivos trackeados.
- **Ramas:** ~30 locales, ~40 remotas. Activas de trabajo: `ai/*`, `feat/*`, `specnative/install-v0.9.0`.
- **Sin archivos untracked.** **5 archivos modificados sin stagear** (migración P2P en curso): `docs/transport.md`, `idl/asyncapi.yaml`, `idl/fhs-protocol.proto`, `schemas/beacon-base.schema.json`, `spec-native/DECISIONS.md`.

---

## 2. Revisión de calidad

### Problemas estructurales o de diseño

- **hooksPath roto:** `.githooks/` no existe. Los hooks de git no se ejecutan. Si existieran hooks de pre-commit para validar formato o schemas, están inactivos.
- **Migración libp2p-first en curso:** 302 líneas añadidas, 239 eliminadas en 14 archivos. Cambio bien documentado (DEC-0089) pero aún no commiteado — 5 archivos modificados sin stagear.
- **Alta proliferación de ramas:** ~30 ramas locales, muchas `ai/*` y `feat/*` antiguas, generan ruido y confusión.

### Deuda técnica identificada

- El proto (`idl/fhs-protocol.proto`, 495 líneas) está bien organizado y documentado — baja deuda.
- Los schemas JSON son limpios, usan draft-07 con `additionalProperties: false` y descripciones adecuadas — baja deuda.
- Docs activamente actualizados para reflejar DEC-0089; riesgo temporal de inconsistencias entre docs ya migrados y los pendientes.
- Sin herramientas de validación automática de IDL (lint de proto, validación de schemas).

### Prácticas del lenguaje no seguidas

- **Protobuf:** Uso correcto de proto3. Field numbers organizados por rangos semánticos. Comentarios exhaustivos con referencias a ADRs. Opciones `go_package`, `java_package`, `java_outer_classname` configuradas. Sin problemas detectados.
- **JSON Schema:** Uso correcto de `$schema` (draft-07), `$id`, `additionalProperties: false`, `enum`, `pattern`. Sin problemas detectados.
- **AsyncAPI 3.0 / OpenAPI 3.1:** Migración activa de WSS-first a libp2p-first. Buena consistencia entre canales.

### Riesgos de seguridad

- `.gitignore` correctamente excluye secretos (`*.pem`, `*.key`, `.env`, `*.db`).
- **No se detectaron secrets expuestos** en archivos commiteados.
- `.opencode/node_modules/` en `.gitignore` — cobertura adecuada de artefactos locales.
- **Sin dependencias externas con versión no fijada** (no hay gestor de dependencias de código).

### Cobertura de tests y documentación

- **Sin tests** — esperable y aceptable para un repo IDL-only.
- **20 documentos** en `docs/`, bien organizados por tema.
- **15 specs** en `spec-native/specs/` con trazabilidad documentada en `TRACEABILITY.md`.
- **Sin CI de validación de IDL:** no hay lint de `.proto`, validación de JSON Schema, ni verificación de AsyncAPI/OpenAPI. Un error en el IDL se descubrirá solo cuando los repos dependientes fallen.

---

## 3. Síntesis ejecutiva

### Resumen del proyecto

galaxIA es un repositorio de definiciones IDL que especifica el protocolo FHS (Federation of Sovereign Horizons): un protocolo para IA federada y soberana sobre una red P2P descentralizada basada en libp2p (DHT Kademlia + GossipSub + streams directos). No contiene código ejecutable. Es la fuente de verdad de un ecosistema distribuido en 4 repos: galaxIA-Core, galaxIA-SDK, galaxIA-satellite-star y galaxia-parser-catalog. Tecnologías: protobuf proto3, AsyncAPI 3.0, OpenAPI 3.1, JSON Schema draft-07. Documentación con Jekyll → GitHub Pages. Contexto de agentes vía SpecNative.

### Estado de salud

**🟡 Amarillo** — La especificación en sí está bien hecha y la migración libp2p-first está en buena forma. Sin embargo, hay deuda operativa (hooksPath roto, ~30 ramas locales, sin CI de validación de schemas) que, si no se atiende, puede erosionar la calidad del repo a medida que la migración avanza.

### Top 3 fortalezas

1. **Especificación IDL de alta calidad.** El proto está bien documentado, usa proto3 correctamente, con field numbers organizados por rangos y referencias explícitas a decisiones de diseño (DEC-0086, DEC-0087, DEC-P2P-001). Los schemas JSON son limpios con `additionalProperties: false` y buenas descripciones.
2. **Migración libp2p-first bien ejecutada.** 302 líneas añadidas, 239 eliminadas en 14 archivos con consistencia clara: AsyncAPI migra de WSS a libp2p, OpenAPI elimina `/register` HTTP, schemas exigen `multiaddr`. Todo documentado en DEC-0089.
3. **Gobernanza y trazabilidad ejemplar.** SpecNative con 15 specs, `DECISIONS.md` con ADRs referenciados desde el código IDL, `.gitignore` que cubre secrets y artefactos. El repo tiene madurez organizacional para ser solo-especificación.

### Top 3 riesgos o deudas

1. ~~**Sin CI de validación de IDL.**~~ **Resuelto** — CI local implementado en `helpers/` + `.github/workflows/ci-idl.yml` + `.githooks/pre-push`.
2. **hooksPath roto** (`.githooks/` no existe). ~~Los hooks de git no se ejecutan.~~ **Resuelto** — `.githooks/` creado con `pre-commit` (info) y `pre-push` (bloqueante con `just ci`).
3. **~30 ramas locales sin limpiar.** Muchas ramas `ai/*` y `feat/*` antiguas. Genera ruido, confusión al hacer checkout y posible pérdida de contexto sobre qué está activo vs abandonado. **Riesgo bajo-medio.**

### Próximos pasos recomendados

1. ~~**Agregar CI de validación de IDL.**~~ **Hecho** — `helpers/` + `Makefile` + `Justfile` + `.githooks/pre-push` + `.github/workflows/ci-idl.yml`. Validación local y agnóstica al proveedor: `just ci` ejecuta proto, schemas y AsyncAPI.
2. ~~**Arreglar hooksPath.**~~ **Hecho** — `.githooks/` creado. `pre-push` bloquea con `just ci` si el IDL no es válido.
3. **Limpiar ramas.** Hacer un barrido de las ~30 ramas locales: mergear o cerrar las que ya cumplieron su propósito, y documentar cuáles están activas. **Impacto: bajo-medio.**

---

## 4. Archivos relevantes

| Archivo | Tipo | Relevancia |
|---------|------|------------|
| `idl/fhs-protocol.proto` | spec | Definición canónica del protocolo FHS. 495 líneas, proto3, fuente de verdad para todos los mensajes (stream directo + GossipSub + DHT). |
| `schemas/beacon-base.schema.json` | schema | Schema base de Beacons. Define campos obligatorios compartidos por todos los tipos de nodo. Exige `multiaddr` libp2p. |
| `idl/asyncapi.yaml` | spec | Canales lógicos del protocolo FHS. Migrado a libp2p-first con WSS como binding opcional. |
| `idl/openapi.yaml` | spec | Plano de gestión REST + adaptadores de borde WSS/SSE. `/register` eliminado, chat/SSE limitado a gateway. |
| `spec-native/DECISIONS.md` | governance | Registro histórico de todas las decisiones arquitectónicas (DEC-0001 a DEC-0089). Referenciado desde el IDL. |
| `.github/workflows/jekyll-gh-pages.yml` | ci | Único workflow de CI/CD. Solo construye el sitio Jekyll. Falta validación de IDL. |
| `docs/network.md` | doc | Documento central de arquitectura de red: planos P2P, ejecución, borde, distribución y gestión. |
| `ECOSYSTEM.md` | doc | Mapa de la topología multi-repo: galaxIA + 4 repos dependientes con sus responsabilidades. |
| `site/_config.yml` | config | Configuración del sitio Jekyll desplegado en galax-ia.rafex.io. |
| `.gitignore` | config | Exclusiones correctas: secrets, artefactos del monorepo original, sesiones locales. Sin hallazgos de seguridad. |
| `helpers/shell/validate_proto.sh` | ci | Lint de sintaxis Protobuf con `protoc`. |
| `helpers/shell/validate_asyncapi.sh` | ci | Validación AsyncAPI 3.0 con `@asyncapi/cli`. |
| `helpers/python/validate_schemas.py` | ci | Meta-validación draft-07 + resolución de `$ref` con `jsonschema` + `referencing`. |
| `Makefile` | build | Build/construcción — incluye `helpers/mk/build.mk`. |
| `Justfile` | task | Task-manager — incluye `helpers/just/{lint,ci,setup}.just`. `just` puede llamar a `make`. |
| `.githooks/pre-push` | hook | Bloquea el push si `just ci` falla (IDL inválido). |
| `.github/workflows/ci-idl.yml` | ci | CI local agnóstico — llama `just ci` igual que el hook. |

---

## 5. Repositorios de trabajo

| Repositorio | URL | Ruta local |
|---|---|---|
| galaxIA | https://github.com/rafex/galaxIA | `/Users/rafex/repository/github/rafex/galaxIA` |
| galaxIA-Core | https://github.com/rafex/galaxIA-Core | `/Users/rafex/repository/github/rafex/galaxIA-Core` |
| galaxIA-SDK | https://github.com/rafex/galaxIA-SDK | `/Users/rafex/repository/github/rafex/galaxIA-SDK` |
| galaxIA-satellite-star | https://github.com/rafex/galaxIA-satellite-star | `/Users/rafex/repository/github/rafex/galaxIA-satellite-star` |
| galaxia-parser-catalog | https://github.com/rafex/galaxia-parser-catalog | `/Users/rafex/repository/github/rafex/galaxia-parser-catalog` |
