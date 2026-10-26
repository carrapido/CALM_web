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

El código sigue una arquitectura hexagonal organizada por módulos de negocio (*screaming architecture*):

```text
src/
├── app/         # Shell de la aplicación, layout y navegación por hash (#/agenda, #/pedidos, #/catalogo)
├── agenda/      # Citas, horario y bloqueo de días
├── orders/      # Pedidos y tickets
├── catalog/     # Servicios del catálogo
├── shared/      # Código compartido: dominio (fechas en hora de Cancún) y UI (átomos, moléculas, plantillas)
└── test/        # Configuración de las pruebas
```

Cada módulo se divide en capas:

- `domain/`: reglas de negocio puras, sin dependencias de React.
- `application/`: puertos (interfaces de repositorio) y casos de uso.
- `infrastructure/`: adaptadores. Por ahora son repositorios en memoria con datos de ejemplo, mientras se define la API.
- `ui/`: componentes de React con el patrón contenedor-presentacional; los componentes compartidos siguen *atomic design*.

## Estado actual

- Los datos viven en memoria y se reinician al recargar la página; todavía no hay API ni base de datos.
- El inicio y cierre de sesión de la administradora quedan pendientes hasta que se defina la tecnología de la API.

## Documentación del proyecto

Los objetivos, decisiones y especificaciones de cada funcionalidad están en [`odd/`](odd/objectives.md).
