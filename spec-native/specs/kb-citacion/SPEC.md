# SPEC-KB-0003 — Metadata de citación y fuente primaria en resultados de KB

## Estado

`accepted` (diseño cerrado) — sin implementar. Extiende `SPEC-KB-0001`. Ver DEC-0049.

## Owner

Raúl Fletes (rafex)

## Problema

`kb.query` hoy devuelve `chunks: [{ text, score }]` — texto y score, nada más. Para que una respuesta generada a partir de una KB sea **citable** (mostrar de qué documento, versión, página y sección viene cada fragmento — no solo texto suelto), el protocolo necesita poder transportar metadata de citación por chunk, y una referencia a la fuente primaria (ej. el PDF oficial de un reglamento).

## Aclaración de alcance (por qué esto no repite el error de TASK-KB-0002)

Este spec **no define cómo un provider construye o cura su KB** — eso sigue siendo responsabilidad exclusiva del operador, sin cambios respecto a DEC-0026/DEC-0037/TASK-KB-0002. Un provider puede seguir cualquier pipeline interno (PDF → texto → SQLite+FTS5 → embeddings, o cualquier otro) sin que el protocolo lo sepa ni lo imponga.

Lo que sí es dominio del protocolo: **qué forma puede tener la metadata que un provider decide exponer**, para que cualquier consumidor (Navigator, Portal, otro provider) sepa dónde buscarla y pueda mostrarla de forma consistente entre KBs distintas. Sin esta forma compartida, cada KB inventaría su propio formato de citación dentro de `text` (texto libre, no estructurado) y ningún consumidor podría procesarlo de forma confiable.

## Propuesta

Nuevo tipo de protocolo en `packages/fhs-protocol/src/types.ts`, junto a `ArtifactRef` (DEC-0046):

```ts
export interface KbCitation {
  documentTitle: string;
  sourceArtifact?: ArtifactRef;       // fuente primaria (ej. el PDF), reutiliza DEC-0046 — inline o IPFS
  sourceUrl?: string;                 // alternativa ligera: solo URL, sin transportar el binario
  versionDate?: string;               // ISO date
  pageStart?: number;
  pageEnd?: number;
  tags?: string[];
  metadata?: Record<string, string>;  // libre, específico de dominio — ver más abajo
}
```

Y el resultado de `kb.query` pasa de `{ text, score }` a `{ text, score, citation?: KbCitation }` — `citation` es opcional, un provider que no quiera exponer esta metadata simplemente no la incluye (compatible con el `kb-provider` de referencia actual, que no la usa).

### Por qué `metadata` es un bag libre, no campos de dominio fijos

Los campos de primera clase (`documentTitle`, `sourceArtifact`/`sourceUrl`, `versionDate`, páginas, `tags`) aplican a cualquier KB, sin importar el dominio. Campos específicos de un dominio (ej. `jurisdiction`, `legalLevel`, `articleNumber` para una KB jurídica; `modelo`, `seccion` para un manual técnico) viven en `metadata: Record<string, string>` — un mapa clave→valor libre. Esto evita que el protocolo se comprometa con vocabulario de un solo tipo de contenido (legal, técnico, médico, etc.). Si con el tiempo un campo se vuelve común entre casi todas las KBs, subirlo a un campo de primera clase sería una decisión posterior, no algo que se resuelve aquí.

**Ejemplo concreto** (KB jurídica, Reglamento de Tránsito CDMX):

```json
{
  "text": "Artículo 38.- Queda prohibido el uso de teléfonos celulares...",
  "score": 0.87,
  "citation": {
    "documentTitle": "Reglamento de Tránsito de la Ciudad de México",
    "sourceUrl": "https://www.ssc.cdmx.gob.mx/...",
    "versionDate": "2026-05-06",
    "pageStart": 42,
    "pageEnd": 43,
    "tags": ["seguridad vial", "distracciones al conducir"],
    "metadata": {
      "jurisdiction": "Ciudad de México",
      "legalLevel": "reglamento",
      "articleNumber": "38"
    }
  }
}
```

## Alcance

### Dentro del alcance

- `KbCitation` como tipo de protocolo compartido (`packages/fhs-protocol/src/types.ts`).
- Extender el resultado de `kb.query` (`{ text, score }` → `{ text, score, citation? }`), campo opcional, sin romper providers existentes que no lo implementen.
- Reutilizar `ArtifactRef` (DEC-0046) para `sourceArtifact` — sin inventar un segundo mecanismo de referencia a binarios.

### Fuera del alcance

- Cómo un provider construye/cura el contenido detrás de una KB (pipeline de extracción, normalización, motor de indexado/embeddings) — sigue siendo responsabilidad exclusiva del operador (DEC-0026/DEC-0037/TASK-KB-0002, sin cambios).
- Un esquema o vocabulario controlado para `metadata` — queda deliberadamente libre.
- Validar o verificar que la metadata de citación declarada por un provider sea verídica — mismo problema ya identificado para `capability.tags`/`description` (DEC-0028): autodeclarado, no verificable, bloqueado por `SPEC-AUTH-0001` si se quisiera resolver con confirmación de comunidad.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Metadata de citación falsa o engañosa (ej. `versionDate` incorrecta) declarada por un provider malicioso o descuidado | Medio | Mismo riesgo ya aceptado para `description`/`tags` (DEC-0028) — sin identidad de usuario real (`SPEC-AUTH-0001`), no hay mitigación técnica real disponible; queda como responsabilidad de confianza en el operador del nodo |
| `metadata` como bag libre permite que cada KB use claves distintas para lo mismo (`jurisdiction` vs. `jurisdiccion` vs. `estado`), dificultando comparar entre KBs | Bajo | Aceptado a propósito — normalizar vocabulario de dominio no es responsabilidad del protocolo; si hace falta, es una convención a nivel de comunidad/documentación, no una restricción de tipo |

## Enlaces y decisiones relacionadas

- `spec-native/specs/kb-provider/SPEC.md` (SPEC-KB-0001) — spec base que este documento extiende.
- `spec-native/specs/kb-multi-consulta/SPEC.md` (SPEC-KB-0002, DEC-0048) — ya identificaba la necesidad de un campo de procedencia (`source`) para atribución al fusionar resultados de varias KBs; `KbCitation` es la forma completa de esa necesidad, no limitada al caso multi-KB.
- DEC-0046 — `ArtifactRef`, reutilizado aquí para `sourceArtifact`.
- DEC-0026/DEC-0037/TASK-KB-0002 — el protocolo nunca define el motor/proceso interno de un provider; este spec define solo la forma del contrato, no lo reabre.
- DEC-0028 — mismo patrón de "autodeclarado, no verificable" que ya se aceptó para `capability.tags`/`description`.

## Tareas relacionadas

- Aún no creadas — `spec-native/tasks/kb-citacion/TASKS.md` se escribe cuando se priorice la implementación.
