---
status: done
---

# Estructura de carpetas como appVeterinaria

Reorganize CALM_web's frontend from feature-based hexagonal folders into appVeterinaria's type-based layout (`pages/`, `components/`, `services/`, `types/`), keeping Supabase as the database and every behavior unchanged. Rubric: `~/Descargas/Rubrica_Integral_FrontEnd_BackEnd_LITIID41 1.pdf`.

## Specs

- **S1** "Se seguira usando Supabase para la base ded datos. La base de datos es a disposición nuestra."
- **S2** "Copia la forma exacta de appVeterinaria, ya que al hacer la explicación del flujo de alguna funcionalidad es mucho mas facil navegar entre los archivos." Target, from `~/Proyectos/appVeterinaria/src`: `pages/`, `components/`, `services/`, `types/` (+ `App.tsx`, `main.tsx`, `index.css` at `src/` root).
- **S3** User choice for logic, formatters and hooks: "Agregar utils/ y hooks/ (recomendado)" — "Reglas, fechas y formatos en src/utils/, hooks en src/hooks/."
- **S4** User choice for tests: "Todos en src/test/" — "Las carpetas de código quedan solo con código; los 31 tests, los kits y los repositorios en memoria en src/test/."
- **S5** "Si hay algun criterio que aun no se cumple notificamelo" (rubric criteria still unmet are reported, not built, in this feature).

## Tasks

- [x] T1 (S1-S4) Move every file to the target layout, fix imports, keep all tests passing; update README structure and design/system.md paths. Route: worker. Commit: 096a832
- [x] T2 (S5) Verify: tests, tsc, oxlint, build, nothing left in old folders; report unmet rubric criteria. Route: inline. Commit: — (verification only)

## Log

- **L1** User request: "Se va a realizar una refactorización de estructuras de carpetas para CALM_web(~/Proyectos/CALM_web) siguiendo la estructura de carpetas de appVeterinaria(~/Proyectos/appVeterinaria). Antes de hacer modificaciones indicame el nombre de la organización de carpetas en appVeterinaria y explicala. De igual forma te proporciono un archivo .pdf que sirve como rubrica para calificar la organización del proyecto, el archivo esta en ~/Descargas/Rubrica_Integral_FrontEnd_BackEnd_LITIID41\ 1.pdf"
- **L2** Explained: appVeterinaria is a layered client-server architecture: frontend grouped by file type (pages, components, services, types, data, assets), backend Express with routes → controllers → repositories (Repository pattern) → MySQL, plus middlewares, utils (asyncHandler), config. Reported that CALM_web has no Express backend (rubric C1, C2, C5, C8) and lacks C7 deliverables.
- **L3** User: "Se seguira usando Supabase para la base ded datos. La base de datos es a disposición nuestra. Copia la forma exacta de appVeterinaria, ya que al hacer la explicación del flujo de alguna funcionalidad es mucho mas facil navegar entre los archivos. Si hay algun criterio que aun no se cumple notificamelo". The Express backend is not authorized yet; it stays a reported gap.
- **L4** Inventory (explorer): 113 non-test source files (3 pages, 47 components, 3 hooks, 20 services, 2 use cases, 4 type-only, 12 domain logic, 12 helpers, 5 test kits, 5 root/config); 31 tests. No path aliases; relative imports. Collision: `agenda/ui/format.ts` vs `shared/ui/format.ts`. `vite.config.ts` points to `src/test/setup.ts`. README and design/system.md name current paths. No `data/` or `assets/`: CALM_web has no demo data (rubric penalizes simulated data) and no image assets.
- **L5** User answers: "Agregar utils/ y hooks/ (recomendado)"; "Todos en src/test/".
- **L6** User: "Construye el backend para cumplir con los criterios que faltan una vez terminado la reestructuración del front o evalua cual es mejor plan de acción". Backend work authorized after T1/T2; plan and scope questions asked before tracking it as a separate feature.
- **L7** User answers for the backend: scope "Todo el panel admin (recomendado)" (agenda, pedidos, catálogo, clientes y horario through Express); auth "Token de Supabase Auth (recomendado)" (React sends the Supabase access token as Bearer; an Express middleware verifies it and checks the caller is an admin). Tracked as its own feature after T2.
- **L8** T1 in 096a832: 140 renames (git detects all as R), README structure + design/system.md paths. T2: 31 files / 203 tests, tsc, oxlint, build pass; src has only components, hooks, pages, services, test, types, utils. Unmet rubric criteria handed to the backend feature: C1, C2, C5, C7, C8.
