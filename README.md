# CALM — Panel de administración de *Costurando a la medida*

Aplicación web para la administradora de *Costurando a la medida*, un taller de costura en Cancún. El repositorio tiene **dos proyectos**: el panel en React (`src/`) y su API REST en Express (`backend/`). Los datos viven en Postgres (Supabase) y la administradora inicia sesión con Supabase Auth.

## Inicio rápido

1. Instala Node.js 24 o superior.
2. Instala dependencias: `npm install` y `npm --prefix backend install`.
3. Crea `.env.local` (panel) y `backend/.env` (API) a partir de sus `.env.example` ([Configuración](#configuración)).
4. Prepara la base de datos y crea una administradora ([Base de datos](#base-de-datos)).
5. En una terminal: `npm --prefix backend run dev` → API en `http://localhost:3000`.
6. En otra terminal: `npm run dev` → panel en `http://localhost:5173`.
7. Comprueba: `curl http://localhost:3000/api/health` responde `{"status":"ok"}`, y entra al panel con el celular y la contraseña de la administradora.

## Alcance del módulo

El módulo es el **panel de administración**. La parte de la clienta (catálogo, cotización, reservación y estado del pedido) es una app de Android aparte (`calm_mobil`), que sigue hablando directo con Supabase y no usa esta API.

| Sección | Qué hace la administradora |
|---------|----------------------------|
| Agenda / calendario | Ve las citas por día, semana o mes en hora de Cancún; cancela citas, bloquea días y manda recordatorios por WhatsApp. |
| Pedidos | Registra un pedido desde una cita (conserva su folio) o de mostrador (folio nuevo), y lo avanza: Recibido → En proceso → Listo para entrega → Entregado, o lo cancela. Busca por folio. |
| Catálogo | Agrega, edita, desactiva y elimina servicios con precio en MXN o «se cotiza en el local». |
| Clientes | Da de alta clientas con su NIP de la app y renueva el NIP de quien lo olvidó. |
| Mi horario | Define los días y horas de atención. |

La administradora es una persona mayor con poca experiencia en tecnología: texto grande, alto contraste, palabras en lugar de íconos, una acción obvia por pantalla y confirmaciones en lenguaje claro.

## Integrantes y aportaciones

| Integrante | Rol | Aportaciones |
|------------|-----|--------------|
| Lainez Mejia Jacson Esau | Backend | Diseñó y construyó la API Express en `backend/`: rutas, controladores y repositorios con SQL parametrizado sobre Postgres de Supabase, el middleware que verifica el token de Supabase Auth y que quien llama sea admin, el manejo centralizado de errores (400, 404, 409, 413, 415 y 500) y las transacciones de pedidos y alta de clientes con NIP. |
| Gonzalez Mollinedo Jorge | Frontend | Construyó el panel en React y TypeScript con la estructura `pages/`, `components/`, `services/`: el calendario mensual que une citas y pedidos con sus filtros y vistas Mes/Semana/Día, el catálogo, los clientes, el horario y la conexión del panel con la API mediante los repositorios `Api*`. |
| Cambos Buendia Brandon | Diseño y documentación | Hizo las maquetas del panel con el estilo Apple que sigue la app y el sistema de diseño en `design/`; escribió este README, el contrato de la API (`docs/api.md`), la arquitectura y el modelo de datos (`docs/arquitectura.md`) y los scripts `database/schema.sql` y `database/seed.sql`. |
| Lugo Mena Hector Anthony | Pruebas e integración | Escribió y mantuvo las pruebas del frontend (Vitest y Testing Library) y del backend (Vitest y Supertest), la tabla de casos de `docs/pruebas.md` y la verificación de punta a punta React → API → base de datos; corrigió los fallos de integración entre el panel, la API y Supabase. |

## Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js | 24 o superior |
| npm | El que trae Node |
| Proyecto de Supabase | Con las migraciones de `supabase/migrations/` aplicadas, o un Postgres con `database/schema.sql` |

## Estructura

Misma organización por tipo de archivo que appVeterinaria:

```text
.
├── src/                  # Panel (React + Vite)
│   ├── pages/            # Pantallas: Agenda, Catálogo, Clientes, inicio de sesión
│   ├── components/       # Contenedores y vistas
│   ├── services/         # Api*Repository y ApiClient (hablan con la API); sesión con Supabase Auth
│   ├── hooks/            # Consultas, navegación por hash (#/agenda, #/catalogo, #/clientes)
│   ├── types/            # Tipos de datos
│   ├── utils/            # Reglas puras, fechas en hora de Cancún, formatos
│   └── test/             # Pruebas del panel
├── backend/              # API REST (Express + TypeScript)
│   ├── src/
│   │   ├── config/       # Variables de entorno, pool de Postgres, Supabase Auth
│   │   ├── routes/       # Método + URL → controlador
│   │   ├── controllers/  # Validación y reglas de negocio
│   │   ├── repositories/ # SQL parametrizado
│   │   ├── middlewares/  # Guardia de administradora y errores centralizados
│   │   ├── types/        # Formas JSON e interfaces
│   │   └── utils/        # asyncHandler, HttpError, hash del NIP
│   └── test/             # Pruebas de la API (Vitest + Supertest)
├── database/             # schema.sql y seed.sql
├── docs/                 # Contrato de la API, pruebas y arquitectura
└── supabase/             # Migraciones (fuente de verdad del esquema) y Edge Functions de la app móvil
```

## Configuración

Copia cada `.env.example` y llena los valores. Los archivos `.env` y `.env.local` están en `.gitignore`: **nunca subas valores reales**.

### Panel: `.env.example` → `.env.local`

| Variable | Para qué | Ejemplo |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase (inicio de sesión). | `https://<proyecto>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Llave pública (*publishable*) de Supabase. | `sb_publishable_...` |
| `VITE_API_URL` | URL de la API, terminada en `/api`. | `http://localhost:3000/api` |

### API: `backend/.env.example` → `backend/.env`

| Variable | Obligatoria | Para qué |
|----------|-------------|----------|
| `PORT` | No (3000) | Puerto de la API. |
| `DATABASE_URL` | Sí | Cadena de conexión de Postgres (Supabase → Project Settings → Database → Connection string). No le pongas `sslmode`: el TLS lo configura `DATABASE_SSL_CA`. |
| `DATABASE_SSL_CA` | No | Ruta al certificado de Supabase (Project Settings → Database → SSL Configuration → Download certificate). Con él, la API **verifica** que habla con Supabase. Sin él la conexión sigue cifrada pero sin verificar el servidor: úsalo así solo en desarrollo. |
| `SUPABASE_URL` | Sí | URL del proyecto; la API verifica con Supabase Auth el token de cada petición. |
| `SUPABASE_PUBLISHABLE_KEY` | Sí | Llave pública, para esa verificación. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Llave secreta (*service role*). Solo la usa la API para cambiar el correo de Supabase Auth de una clienta de la app cuando cambia su celular. **Nunca** va en el panel ni en Git. |
| `CORS_ORIGIN` | No (`http://localhost:5173`) | Origen del panel que puede llamar a la API. |

Plantilla sin secretos:

```dotenv
PORT=3000
# safe-anything:ignore (plantilla sin credenciales reales)
DATABASE_URL=postgresql://postgres:<contraseña>@<host>:5432/postgres
DATABASE_SSL_CA=
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<llave-publishable>
SUPABASE_SERVICE_ROLE_KEY=<llave-service-role>
CORS_ORIGIN=http://localhost:5173
```

Si falta una variable obligatoria, la API no arranca y dice cuál.

## Base de datos

Elige una opción:

| Opción | Cuándo | Cómo |
|--------|--------|------|
| Migraciones de Supabase | Proyecto real (la fuente de verdad) | `supabase db push` con el proyecto enlazado. |
| Script consolidado | Revisar el esquema o crear un Postgres vacío | `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql` |

Después:

1. **Crea una administradora.** El panel pide celular y contraseña, y entra con el correo `<celular>@panel.calm.invalid`. En Supabase: Authentication → Users → Add user, con correo `9980000000@panel.calm.invalid` (tu celular de 10 dígitos) y una contraseña. Luego, en el SQL Editor: `insert into public.admins (id) select id from auth.users where email = '9980000000@panel.calm.invalid';`
2. **Carga los datos de prueba** (opcional, con las tablas vacías): `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seed.sql`. Trae clientas, servicios, horario, citas con servicios, un pedido en cada estado y un día bloqueado; todo inventado.

El modelo de datos está en [docs/arquitectura.md](docs/arquitectura.md#modelo-de-datos).

## Comandos

| Qué | Panel (raíz) | API |
|-----|--------------|-----|
| Instalar | `npm install` | `npm --prefix backend install` |
| Desarrollo | `npm run dev` | `npm --prefix backend run dev` |
| Pruebas | `npm test` (modo observación; `npm test -- --run` una vez) | `npm --prefix backend test` |
| Compilar | `npm run build` (revisa tipos y genera `dist/`) | `npm --prefix backend run build` (genera `backend/dist/`) |
| Producción | `npm run preview` | `npm --prefix backend start` |
| *Linter* | `npm run lint` | — |

## Puertos

| Servicio | URL |
|----------|-----|
| Panel (Vite) | `http://localhost:5173` |
| API (Express) | `http://localhost:3000/api` |

## CORS

La API acepta peticiones del navegador solo desde `CORS_ORIGIN` (por omisión `http://localhost:5173`). Si el panel corre en otro puerto o dominio, cambia esa variable en `backend/.env` (sin `/` al final; la API la quita si la pones) y reinicia la API. `VITE_API_URL` del panel debe apuntar a la API.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/api.md](docs/api.md) | Contrato de cada endpoint: método, URL, entradas, JSON de salida, códigos de error y regla de negocio. |
| [docs/pruebas.md](docs/pruebas.md) | Tabla de casos con entrada, resultado esperado y observado, y pasos para la evidencia en vivo. |
| [docs/arquitectura.md](docs/arquitectura.md) | Diagrama de arquitectura, modelo de datos y el recorrido de «Registrar pedido». |
| [database/](database/) | `schema.sql` y `seed.sql`. |
| [odd/](odd/objectives.md) | Objetivos, decisiones y especificaciones de cada funcionalidad. |

## Tecnologías

React 19, TypeScript, Tailwind CSS v4, Vite, Vitest + Testing Library, Oxlint · Express 5, node-postgres (`pg`), Supabase (Auth y Postgres), Vitest + Supertest.
