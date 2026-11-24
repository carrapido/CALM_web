# Costurando a la medida — Panel de administración

Aplicación web para la administradora de *Costurando a la medida*, un taller de costura en Cancún. Desde aquí gestiona su agenda de citas, los pedidos de sus clientes y el catálogo de servicios. La parte del cliente (catálogo, cotización, reservación y estado del pedido) es una app de Android aparte y no forma parte de este repositorio.

La administradora es una persona mayor con poca experiencia en tecnología, así que cada pantalla está pensada para ella: texto grande, alto contraste, palabras en lugar de íconos, una acción obvia por pantalla, sin gestos ni controles que dependan del *hover*, y acciones que se pueden deshacer o que piden confirmación en lenguaje claro.

## Funcionalidades

- **Agenda:** vista por día y por semana en espacios de 30 minutos, en hora de Cancún. Cada cita muestra su ticket de 4 dígitos, el nombre del cliente y la cotización preliminar. Permite bloquear un día, cancelar citas, mandar un recordatorio por WhatsApp y configurar los días y horarios de atención en «Mi horario».
- **Pedidos:** registrar un pedido a partir de una cita (conserva su ticket) o para un cliente sin cita (genera un ticket nuevo), con precio final y fecha de entrega. Cada pedido avanza por Recibido → En proceso → Listo para entrega → Entregado, o se cancela. Se puede buscar por ticket y avisar por WhatsApp cuando el pedido está listo.
- **Catálogo de servicios:** agregar, editar, desactivar y eliminar servicios con precio base en MXN (o «se cotiza en el local») y tiempo estimado en días.

Los clientes no tienen cuenta: cada cita y cada pedido se consulta con un ticket de 4 dígitos.

## Tecnologías

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) con los *design tokens* del diseño en Google Stitch (`src/index.css`)
- [Vite](https://vite.dev/) como servidor de desarrollo y empaquetador
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) para las pruebas
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) como *linter*

## Requisitos

- Node.js 24
- npm

## Primeros pasos

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

## Scripts

| Comando           | Descripción                                          |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Levanta el servidor de desarrollo con recarga en caliente. |
| `npm run build`   | Revisa los tipos (`tsc -b`) y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la versión de producción.           |
| `npm test`        | Ejecuta las pruebas con Vitest.                      |
| `npm run lint`    | Analiza el código con Oxlint.                        |

## Estructura del proyecto

El código se organiza por tipo de archivo, con la misma forma que appVeterinaria:

```text
src/
├── App.tsx      # Acceso de la administradora, shell y navegación por hash (#/agenda, #/catalogo, #/clientes)
├── main.tsx     # Punto de entrada: crea el cliente de Supabase y monta la aplicación
├── index.css    # Design tokens de Tailwind v4
├── pages/       # Pantallas: Agenda, Catálogo, Clientes e inicio de sesión
├── components/  # Componentes de React (contenedores y presentacionales)
├── services/    # Acceso a datos con Supabase: repositorios, sus interfaces, mapeo de filas y casos de uso
├── types/       # Tipos de datos (cita, cliente, servicio, tipos de la base de datos)
├── utils/       # Reglas de negocio puras, fechas en hora de Cancún y formatos
├── hooks/       # Hooks de React (consultas, navegación, detalle elegido)
└── test/        # Pruebas, kits de prueba, repositorios en memoria y configuración
```

Las secciones del panel son **Agenda**, **Catálogo** y **Clientes**.

## Estado actual

- Los datos viven en memoria y se reinician al recargar la página; todavía no hay API ni base de datos.
- El inicio y cierre de sesión de la administradora quedan pendientes hasta que se defina la tecnología de la API.

## Documentación del proyecto

Los objetivos, decisiones y especificaciones de cada funcionalidad están en [`odd/`](odd/objectives.md).
