# Instalación

Tres formas de correr galaxIA, de más simple a más flexible. Las tres levantan
el mismo stack: **Atlas** (Registry), **Navigator** (Agent Runtime) y
**Portal-chat** (cliente web) — ver `docs/arquitectura.md` para qué hace cada
uno.

Para instalar solo un servicio en una máquina y otro en otra (Atlas en un
host, el Portal en otro), ver la sección [Multi-host](#multi-host-cada-servicio-en-su-propia-máquina)
al final — aplica a las tres formas de instalación.

## 1. Contenedor + release (recomendado)

No requiere clonar el repositorio ni tener Node instalado — solo Podman o
Docker.

```bash
mkdir galaxia && cd galaxia
curl -O https://raw.githubusercontent.com/rafex/galaxIA/main/containers/compose.release.yaml
curl -O https://raw.githubusercontent.com/rafex/galaxIA/main/containers/.env.example
cp .env.example .env
# editar .env si hace falta (versión a usar, puertos) — los defaults
# funcionan para un solo host sin tocar nada

podman-compose -f compose.release.yaml up -d
# o: docker compose -f compose.release.yaml up -d
```

Esto descarga las imágenes ya publicadas (`ghcr.io/rafex/galaxia-atlas`,
`-navigator`, `-portal-chat`) en vez de construirlas — mismas imágenes que
usa `containers/compose.yaml` para desarrollo, distinto canal (ver
`spec-native/DECISIONS.md` DEC-0060 a DEC-0063).

Verificar que levantó bien:

```bash
curl http://localhost:30083/health     # Atlas
curl -s http://localhost:3000 | head   # Portal (abrir en el navegador)
```

Para detener: `podman-compose -f compose.release.yaml down`.

## 2. npm por servicio (sin contenedores)

Para quien prefiere Node nativo, o quiere correr un solo servicio (ej. solo
Atlas en una máquina, sin los otros dos). Requiere Node 20+.

```bash
# Atlas (Registry) — puerto 8081 por default
npx @galaxia/atlas

# Navigator (Agent Runtime) — puerto 8090 por default, necesita saber
# dónde está Atlas
ATLAS_URL=http://localhost:8081 npx @galaxia/navigator

# Portal-chat (cliente web) — puerto 3000 por default, necesita saber
# dónde están Atlas y Navigator
ATLAS_URL=http://localhost:8081 NAVIGATOR_URL=http://localhost:8090 \
  npx @galaxia/portal-chat
```

Cada uno se configura por variable de entorno — `PORT`/`HOST` en los tres,
`ATLAS_URL` en Navigator y Portal-chat, `NAVIGATOR_URL` en Portal-chat (ver
tabla completa en `docs/arquitectura.md`).

**Nota sobre `@galaxia/atlas`:** depende de `better-sqlite3` (binding
nativo). Si `npm`/`npx` no encuentra un prebuild para tu plataforma exacta,
compila en el momento — necesita `python3`, `make`, `g++` instalados. No es
"cero dependencias del sistema" garantizado en todas las plataformas; si
falla, la ruta de contenedor (opción 1) no tiene este problema (la imagen
ya trae el binding compilado).

## 3. Clonar y compilar (para contribuir)

Ver `CONTRIBUTING.md` — clonar el repo, `npm install`, `npm run build
--workspaces`, y correr cada app con `npm run dev -w apps/<app>` o `node
apps/<app>/dist/index.js`.

## Multi-host (cada servicio en su propia máquina)

Las tres formas de instalación soportan repartir Atlas, Navigator y
Portal-chat en máquinas distintas de la misma red — ninguno tiene un
hostname hardcodeado, todos se configuran por variable de entorno
(`ATLAS_URL`, `NAVIGATOR_URL`).

| Servicio | Variable a configurar | Valor |
|---|---|---|
| Atlas | (ninguna, es el punto de entrada) | — |
| Navigator | `ATLAS_URL` | `http://<ip-de-atlas>:8081` |
| Portal-chat | `ATLAS_URL` + `NAVIGATOR_URL` | `http://<ip-de-atlas>:8081` / `http://<ip-de-navigator>:8090` |

Ejemplo con `npx` en tres máquinas:

```bash
# Máquina A (Atlas)
npx @galaxia/atlas

# Máquina B (Navigator)
ATLAS_URL=http://<ip-A>:8081 npx @galaxia/navigator

# Máquina C (Portal-chat)
ATLAS_URL=http://<ip-A>:8081 NAVIGATOR_URL=http://<ip-B>:8090 \
  npx @galaxia/portal-chat
```

Con contenedores, el mismo patrón vía `-e ATLAS_URL=...`/`-e
NAVIGATOR_URL=...` en cada `podman run`, en vez de un solo
`compose.release.yaml` con los tres juntos. Ver `docs/despliegue-multi-host.md`
para el detalle completo de una topología real de dos hosts (con firewall,
mDNS, y el caso adicional de separar también los providers de referencia).

**Riesgo conocido:** el nginx del contenedor de Portal-chat resuelve
`ATLAS_URL`/`NAVIGATOR_URL` al arrancar, no de forma perezosa — si usas un
hostname que no resuelve todavía en ese momento (en vez de una IP), el
contenedor falla al iniciar con `host not found in upstream`. Con IPs
directas esto no aplica.
