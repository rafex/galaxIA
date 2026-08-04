# Diagnóstico del Proyecto

_Fecha: 2026-08-03 (actualizado) | Repositorio: galaxIA_

---

## 1. Exploración

### Estructura general

| Directorio | Contenido |
|---|---|
| `idl/` | Fuente de verdad del protocolo: `fhs-protocol.proto` (proto3, canonical), `asyncapi.yaml` (AsyncAPI 3.0), `gossipsub.md`, `framing.md`, `flows.md` |
| `schemas/` | JSON Schema draft-07 de Beacons: `beacon-{base,nova,satellite,star}.schema.json` |
| `docs/` | 17 markdown: `network.md`, `p2p.md`, `trust.md`, `identity.md`, `handshake.md`, `mission.md`, `transport.md`, `protocolo.md`, `vocabulario.md`, guías de setup/E2E/contenedores |
| `site/` | Portal web público Jekyll → https://galax-ia.rafex.io (`CNAME`, `_config.yml`, `_layouts/`) |
| `spec-native/` | Contexto para agentes: specs por iniciativa (15), tasks, decisiones, roadmap, trazabilidad |
| `.specnative/` | Infraestructura SpecNative: `specnative_mcp.py` + venv Python (MCP server) |
| `.agents/`, `.claude/`, `.codex/` | Skills/commands de agentes |
| `helpers/` | CI local agnóstico: shell (protoc, asyncapi), python/UV (jsonschema), mk (build), just (task-manager) |
| `.github/workflows/` | CI/CD — `ci-idl.yml` (validación IDL) + `jekyll-gh-pages.yml` (sitio) |
| `.githooks/` | pre-commit (info) + pre-push (bloqueante con `just ci`) |

### Lenguajes y tecnologías

- **Código ejecutable: ninguno.** Repositorio IDL-only.
- **Formatos de especificación:** Protobuf proto3, AsyncAPI 3.0, JSON Schema draft-07, Markdown + diagramas Mermaid.
- **Sitio:** Jekyll (Ruby/kramdown).
- **Python:** solo el MCP server de SpecNative (`.specnative/.venv`, Python 3.14).
- **Stack real documentado** (vive en otros repos): TypeScript ≥5 / Node ≥20, Vite, Fastify, Podman/Docker. Rust es la estrategia futura (DEC-0088).
- **Red:** libp2p — DHT Kademlia, GossipSub, streams `/fhs/v1/0.1.0` sobre WSS obligatorio (DEC-P2P-001).

### Sistema de build / dependencias

- **No hay build system** de código ejecutable (repositorio IDL-only).
- Build automático: **Jekyll → GitHub Pages** vía GitHub Actions.
- CI local de validación IDL: `Makefile` (build) + `Justfile` (task-manager) + `helpers/`.
- Generación de código desde `.proto` solo documentada (`protoc` para Go/TS/Python/Rust).

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
- `.githooks/` — pre-commit (info) + pre-push (`just ci`). hooksPath configurado correctamente.
- `Makefile` — build/construcción (include `helpers/mk/`).
- `Justfile` — task-manager: `just setup`, `just lint`, `just ci`.
- `helpers/` — scripts portables: shell (protoc, asyncapi), python/UV (jsonschema).

### Estado del repositorio

- **Rama activa:** `main` (sincronizada con `origin/main`). Ramas limpiadas (30→1).
- **Último commit:** `e4e72d3` "docs(ci): documentar infraestructura CI local…" — rafex, 2026-08-03.
- **Historia:** ~217 commits, ~152 archivos trackeados.
- **Migración libp2p-first:** completada y commiteada. DEC-0089 aplicado en IDL y docs.

---

## 2. Revisión de calidad

### Problemas estructurales o de diseño

- ~~**hooksPath roto.**~~ **Resuelto** — `.githooks/` creado, `just ci` bloquea push.
- ~~**Migración libp2p-first en curso sin commit.**~~ **Resuelto** — DEC-0089 commiteado (`9af5901`).
- ~~**Alta proliferación de ramas (~30).**~~ **Resuelto** — limpieza completa, solo `main` activa.

### Deuda técnica identificada

- El proto (`idl/fhs-protocol.proto`, 495 líneas) está bien organizado y documentado — baja deuda.
- Los schemas JSON son limpios, usan draft-07 con `additionalProperties: false` y descripciones adecuadas — baja deuda.
- Docs actualizados para reflejar DEC-0089. La documentación ya está alineada con el modelo libp2p-first.
- Validación automática de IDL implementada: `just ci` → protoc + jsonschema + asyncapi.

### Prácticas del lenguaje no seguidas

- **Protobuf:** Uso correcto de proto3. Field numbers organizados por rangos semánticos. Comentarios exhaustivos con referencias a ADRs. Opciones `go_package`, `java_package`, `java_outer_classname` configuradas. Sin problemas detectados.
- **JSON Schema:** Uso correcto de `$schema` (draft-07), `$id`, `additionalProperties: false`, `enum`, `pattern`. Sin problemas detectados.
- **AsyncAPI 3.0:** Migración completada de WSS-first a libp2p-first. Consistencia entre canales.

### Riesgos de seguridad

- `.gitignore` correctamente excluye secretos (`*.pem`, `*.key`, `.env`, `*.db`).
- **No se detectaron secrets expuestos** en archivos commiteados.
- `.opencode/node_modules/` en `.gitignore` — cobertura adecuada de artefactos locales.
- **Sin dependencias externas con versión no fijada** (no hay gestor de dependencias de código).

### Cobertura de tests y documentación

- **Sin tests** — esperable y aceptable para un repo IDL-only.
- **17 documentos** en `docs/`, bien organizados por tema.
- **15 specs** en `spec-native/specs/` con trazabilidad documentada en `TRACEABILITY.md`.
- **CI de validación de IDL implementado:** `just ci` cubre proto, schemas JSON y AsyncAPI. Hook pre-push + GitHub Actions.

---

## 3. Síntesis ejecutiva

### Resumen del proyecto

galaxIA es un repositorio de definiciones IDL que especifica el protocolo FHS (Federation of Sovereign Horizons): un protocolo para IA federada y soberana sobre una red P2P descentralizada basada en libp2p (DHT Kademlia + GossipSub + streams directos). No contiene código ejecutable. Es la fuente de verdad de un ecosistema distribuido en 4 repos: galaxIA-Core, galaxIA-SDK, galaxIA-satellite-star y galaxia-parser-catalog. Tecnologías: protobuf proto3, AsyncAPI 3.0, JSON Schema draft-07. Documentación con Jekyll → GitHub Pages. Contexto de agentes vía SpecNative.

### Estado de salud

**🟢 Verde** — La especificación IDL está en buena forma, la migración libp2p-first está commiteada, el CI local valida proto + schemas + AsyncAPI en cada push, las ramas están limpias y los hooks de git funcionan. Sin riesgos operativos activos.

### Top 3 fortalezas

1. **Especificación IDL de alta calidad.** El proto está bien documentado, usa proto3 correctamente, con field numbers organizados por rangos y referencias explícitas a decisiones de diseño (DEC-0086, DEC-0087, DEC-P2P-001). Los schemas JSON son limpios con `additionalProperties: false` y buenas descripciones.
2. **Migración libp2p-first bien ejecutada.** 302 líneas añadidas, 239 eliminadas en 14 archivos con consistencia clara: AsyncAPI migra de WSS a libp2p, schemas exigen `multiaddr`. Todo documentado en DEC-0089.
3. **Gobernanza y trazabilidad ejemplar.** SpecNative con 15 specs, `DECISIONS.md` con ADRs referenciados desde el código IDL, `.gitignore` que cubre secrets y artefactos. El repo tiene madurez organizacional para ser solo-especificación.

### Top 3 riesgos o deudas

1. ~~**Sin CI de validación de IDL.**~~ **Resuelto** — CI local: `helpers/` + `.github/workflows/ci-idl.yml` + `.githooks/pre-push`.
2. ~~**hooksPath roto.**~~ **Resuelto** — `.githooks/` con `pre-push` bloqueante.
3. ~~**~30 ramas locales sin limpiar.**~~ **Resuelto** — limpieza completa, solo `main` activa.

### Próximos pasos recomendados

Sin deudas activas. Los 3 riesgos originales están resueltos. Próximas mejoras opcionales:

1. **Agregar `buf` para lint avanzado de proto** — más estricto que `protoc` (reglas de estilo, breaking changes). Impacto medio.
2. **Generación automática de código desde `.proto`** — `make proto-gen-ts`, `make proto-gen-go` vía `protoc`. Impacto medio.
3. **Extender CI a los repos dependientes** — replicar `just ci` en galaxIA-Core, galaxIA-SDK, etc. Impacto alto.

---

## 4. Archivos relevantes

| Archivo | Tipo | Relevancia |
|---------|------|------------|
| `idl/fhs-protocol.proto` | spec | Definición canónica del protocolo FHS. 495 líneas, proto3, fuente de verdad para todos los mensajes (stream directo + GossipSub + DHT). |
| `schemas/beacon-base.schema.json` | schema | Schema base de Beacons. Define campos obligatorios compartidos por todos los tipos de nodo. Exige `multiaddr` libp2p. |
| `idl/asyncapi.yaml` | spec | Canales lógicos del protocolo FHS. libp2p-first, WSS como binding opcional. |
| `spec-native/DECISIONS.md` | governance | Registro de decisiones arquitectónicas (DEC-0001 a DEC-0089). |
| `.github/workflows/jekyll-gh-pages.yml` | ci | Build del sitio Jekyll → GitHub Pages. |
| `.github/workflows/ci-idl.yml` | ci | CI de validación IDL — llama `just ci` (proto, schemas, asyncapi). |
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
