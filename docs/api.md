# Contrato de la API REST de CALM

La API (`backend/`) atiende al panel de administración y a la app de clientas (`calm_mobil`). Todas las rutas viven bajo `http://localhost:3000/api` y reciben y devuelven JSON. Las del panel —todas salvo `/api/health` y `/api/client/*`— exigen una sesión de administradora; las de la app viven bajo `/api/client` y tienen su propia guardia ([API de la app de clientas](#api-de-la-app-de-clientas)). Este contrato está tomado del código (`backend/src/routes`, `controllers`, `types`) y de sus pruebas (`backend/test/*.test.ts`); cada fila de [`pruebas.md`](pruebas.md) apunta a la prueba que lo comprueba.

## Resumen de endpoints

| # | Método | URL | Éxito | Para qué |
|---|--------|-----|-------|----------|
| 1 | GET | `/api/health` | 200 | Saber si la API está viva (sin token). |
| 2 | GET | `/api/services` | 200 | Listar el catálogo. |
| 3 | POST | `/api/services` | 201 | Agregar un servicio. |
| 4 | PUT | `/api/services/:id` | 200 | Reemplazar un servicio (incluye activarlo o desactivarlo). |
| 5 | DELETE | `/api/services/:id` | 204 | Eliminar un servicio que ninguna cita usa. |
| 6 | GET | `/api/clients` | 200 | Listar clientes y si tienen acceso a la app. |
| 7 | POST | `/api/clients` | 201 | Dar de alta a una clienta con su NIP de la app. |
| 8 | PUT | `/api/clients/:id/access` | 200 | Dar o renovar el NIP de una clienta existente (puede cambiar su celular). |
| 9 | GET | `/api/schedule` | 200 | Leer el horario semanal («Mi horario»). |
| 10 | PUT | `/api/schedule` | 200 | Reemplazar los siete días del horario. |
| 11 | GET | `/api/blocked-dates` | 200 | Listar los días bloqueados. |
| 12 | POST | `/api/blocked-dates` | 201 | Bloquear un día. |
| 13 | DELETE | `/api/blocked-dates/:date` | 204 | Desbloquear un día. |
| 14 | GET | `/api/appointments?from=&to=` | 200 | Citas de un rango de fechas (agenda por día, semana o mes). |
| 15 | DELETE | `/api/appointments/:ticket?date=` | 204 | Cancelar una cita. |
| 16 | GET | `/api/orders` | 200 | Listar pedidos. |
| 17 | POST | `/api/orders` | 201 | Registrar un pedido (desde una cita o de mostrador). |
| 18 | PUT | `/api/orders/:ticket` | 200 | Cambiar un pedido activo (trabajo, precio, entrega, estado). |

Los endpoints 19 a 27, de la app de clientas, están en [su propia sección](#api-de-la-app-de-clientas).

## Reglas comunes

### Autenticación

| Situación | Respuesta |
|-----------|-----------|
| `/api/health` | No pide token. |
| `/api/client/*` | No pasa por esta guardia: usa la de la app ([Guardia de la clienta](#guardia-de-la-clienta)). |
| Sin encabezado `Authorization`, o que no sea exactamente `Bearer <token>` | **401** `unauthenticated` |
| Token que Supabase Auth rechaza (vencido o falso) | **401** `unauthenticated` |
| Token válido de un usuario que no está en la tabla `admins` | **403** `not_admin` |
| Supabase Auth no responde, responde 429/5xx, o falla la consulta a `admins` | **500** `unavailable` (no se toca ningún dato) |

El token es el `access_token` de la sesión de Supabase Auth de la administradora. El panel lo manda solo (`src/services/api-client.ts`). La verificación ocurre **antes** de buscar la ruta: una ruta inexistente bajo `/api` sin token responde 401, no 404. El token de una clienta de la app responde 403 `not_admin` en cualquier ruta del panel.

### Cuerpo de error

Todo error tiene la misma forma, y el mensaje está escrito para mostrarse tal cual:

```json
{ "error": "Inicia sesión para continuar.", "code": "unauthenticated" }
```

| Código HTTP | `code` | Cuándo |
|-------------|--------|--------|
| 400 | `invalid_input` | Validación de servicios, agenda o id de cliente; JSON mal formado; Postgres rechaza un valor (22P02, 22003, 22007, 22008, 23502, 23514). |
| 400 | nombre del campo (`name`, `phone`, `nip`, `ticket`, `work`, `finalPriceMxn`, `deliveryDate`, `status`, `clientName`, `whatsapp`, `appointment`) | Clientes y pedidos: el `code` dice qué campo resaltar en el formulario. |
| 401 | `unauthenticated` | Sin sesión válida. |
| 403 | `not_admin` | La cuenta no es de administradora. |
| 404 | `not_found` | El registro no existe, o la ruta no existe (`No existe la ruta GET /api/x.`). |
| 409 | `service_in_use`, `service_name_taken`, `phone_taken`, `ticket_taken`, `appointment_has_order` | Conflictos de negocio con nombre propio (ver cada endpoint y la tabla de abajo). |
| 409 | `conflict` | Cualquier otro duplicado (Postgres 23505) o registro en uso (23503) cuya restricción no está en la tabla de abajo. |
| 413 | `body_too_large` | Cuerpo de más de 100 KB (límite de `express.json()`). |
| 415 | `unsupported_body` | JSON en un *charset* distinto de UTF-8. |
| 500 | `unavailable` | Falla inesperada (base de datos caída, Supabase sin respuesta). El detalle va al log del servidor, nunca al cliente. |

Cuando Postgres rechaza una escritura por una restricción conocida de `database/schema.sql`, el middleware de errores responde con el mensaje de esa restricción (`backend/src/utils/conflicts.ts`):

| Restricción | Error de Postgres | `code` | `error` |
|-------------|-------------------|--------|---------|
| `services_name_key` | 23505 | `service_name_taken` | `Ya existe un servicio con ese nombre.` |
| `clients_phone_key` | 23505 | `phone_taken` | `Ese celular ya es de otro cliente.` |
| `orders_active_ticket_key` | 23505 | `ticket_taken` | `Ya hay un pedido activo con ese folio.` |
| `orders_appointment_id_key` | 23505 | `appointment_has_order` | `Esta cita ya tiene un pedido.` |
| `orders_appointment_id_fkey` | 23503 | `appointment_has_order` | `Esta cita ya tiene un pedido; cancela o entrega el pedido primero.` |

### Formatos

| Dato | Formato | Ejemplo |
|------|---------|---------|
| Fecha | `AAAA-MM-DD`, día real (2026-02-30 es inválido) | `"2026-06-15"` |
| Hora de cita | `HH:MM` | `"10:30"` |
| Hora de horario | `HH:MM` en punto o y media, de `00:00` a `23:30` | `"09:30"` |
| Folio (`ticket`) | 4 dígitos, como texto | `"0427"` |
| Celular / WhatsApp | 10 dígitos | `"9981234567"` |
| Dinero | Pesos enteros (MXN) | `120` |
| Id de servicio y de cliente | Entero positivo, como texto | `"3"` |

### CORS

Solo los orígenes de `CORS_ORIGIN`, separados por comas (por omisión `http://localhost:5173,http://127.0.0.1:5173`), pueden leer las respuestas desde el navegador.

### Registro de peticiones

La API escribe en su terminal una línea por petición respondida: método, ruta, código y tiempo, como `GET /api/services 200 12ms`. Nunca registra encabezados, cuerpos ni tokens.

---

## Salud

### 1. `GET /api/health`

| | |
|---|---|
| Auth | Ninguna |
| Éxito | **200** `{ "status": "ok" }` |
| Regla | Sirve para comprobar que el servidor arrancó; no consulta la base de datos. |

```bash
curl http://localhost:3000/api/health
```

## Catálogo de servicios

Forma de un servicio:

```json
{ "id": "3", "name": "Parche", "price": { "kind": "base", "amountMxn": 40 }, "estimatedDays": 0, "isActive": true }
```

`price` es `{ "kind": "base", "amountMxn": <entero ≥ 0> }` o `{ "kind": "inStore" }` (se cotiza en el local).

### 2. `GET /api/services`

| | |
|---|---|
| Éxito | **200** arreglo de servicios, por `id`. Incluye los inactivos. |
| Errores | 401, 403, 500 |

### 3. `POST /api/services`

| | |
|---|---|
| Entrada | `{ "name": string, "price": price, "estimatedDays": entero }` |
| Éxito | **201** el servicio creado, con `isActive: true` |
| 400 `invalid_input` | `El nombre es obligatorio y tiene hasta 80 caracteres.` · `El precio es un entero de 0 o más, o se cotiza en tienda.` · `Los días estimados son un entero de 0 a 30.` · cuerpo vacío |
| 409 `service_name_taken` | `Ya existe un servicio con ese nombre.` |
| Regla | El nombre se guarda sin espacios alrededor. Todo servicio nuevo nace activo y con categoría `arreglo`. |

### 4. `PUT /api/services/:id`

| | |
|---|---|
| Entrada | `:id` entero positivo · cuerpo `{ name, price, estimatedDays, isActive: boolean }` |
| Éxito | **200** el servicio como quedó |
| 400 `invalid_input` | `El identificador del servicio no es válido.` · `Indica si el servicio está activo con true o false.` · las mismas validaciones que POST |
| 404 `not_found` | `El servicio no existe.` |
| 409 `service_name_taken` | `Ya existe un servicio con ese nombre.` (el nuevo nombre ya es de otro servicio; no cambia nada) |
| Regla | Reemplaza el servicio completo. Desactivarlo lo oculta de la app de clientes sin borrarlo. |

### 5. `DELETE /api/services/:id`

| | |
|---|---|
| Éxito | **204** sin cuerpo |
| 400 `invalid_input` | `El identificador del servicio no es válido.` |
| 404 `not_found` | `El servicio no existe.` |
| 409 `service_in_use` | `No se puede eliminar porque hay citas que usan este servicio. Desactívalo para ocultarlo a los clientes.` |
| Regla | Un servicio que aparece en alguna cita no se borra: se desactiva. |

```bash
curl -X POST http://localhost:3000/api/services \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Dobladillo","price":{"kind":"base","amountMxn":80},"estimatedDays":2}'
```

## Clientes

Forma de una clienta (el hash del NIP nunca sale de la API):

```json
{ "id": "1", "name": "Rosa Méndez", "phone": "9981234567", "hasAppAccess": true }
```

`phone` puede ser `null` (clienta de mostrador sin celular).

### 6. `GET /api/clients`

| | |
|---|---|
| Éxito | **200** arreglo de clientas, por `id` |
| Errores | 401, 403 `not_admin`, 500 |

### 7. `POST /api/clients`

| | |
|---|---|
| Entrada | `{ "name": string, "phone": string, "nip": string }` |
| Éxito | **201** `{ "client": <clienta> }` con `hasAppAccess: true` |
| 400 `phone` | `Escribe el celular a 10 dígitos.` |
| 400 `nip` | `El NIP necesita 4 dígitos.` |
| 400 `name` | `Escribe el nombre del cliente.` (vacío o más de 80 caracteres) |
| 409 `phone_taken` | `Ese celular ya es de otro cliente.` |
| Regla | Se valida en este orden: celular, NIP, nombre. Del celular y el NIP solo cuentan los dígitos (`"998 555-1234"` es válido). El NIP se guarda como hash argon2id (m=19456, t=2, p=1), los mismos parámetros con que la app móvil lo verifica. Se borran los intentos fallidos de inicio de sesión de ese celular. |

### 8. `PUT /api/clients/:id/access`

| | |
|---|---|
| Entrada | `:id` entero positivo · cuerpo `{ "phone": string, "nip": string }` (un `name` en el cuerpo se ignora) |
| Éxito | **200** `{ "client": <clienta> }` |
| 400 `invalid_input` | `El identificador del cliente no es válido.` |
| 400 `phone` / `nip` | Igual que en POST. |
| 404 `not_found` | `Ese cliente ya no existe.` |
| 409 `phone_taken` | `Ese celular ya es de otro cliente.` (no cambia nada) |
| Regla | Sirve para dar NIP a una clienta de mostrador o uno nuevo a quien olvidó el suyo. Si ya usaba la app y su celular cambia, la API renombra su usuario de Supabase Auth a `<celular>@clients.calm.app` después de guardar. Se borran los intentos fallidos del celular nuevo y del anterior. |

```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Marta Gil","phone":"9985551234","nip":"4321"}'
```

## Agenda: horario, días bloqueados y citas

### 9. `GET /api/schedule`

| | |
|---|---|
| Éxito | **200** los siete días, de `monday` a `sunday` |
| Regla | Un día sin registro en la base se responde cerrado. |

```json
{
  "monday": { "isOpen": true, "opensAt": "09:00", "closesAt": "18:00" },
  "sunday": { "isOpen": false }
}
```

(El ejemplo omite cinco días; la respuesta siempre trae los siete.)

### 10. `PUT /api/schedule`

| | |
|---|---|
| Entrada | `{ "schedule": { "monday": día, …, "sunday": día } }`; día = `{ "isOpen": false }` o `{ "isOpen": true, "opensAt": "HH:MM", "closesAt": "HH:MM" }` |
| Éxito | **200** el horario como quedó guardado |
| 400 `invalid_input` | `El horario trae los siete días de la semana, de lunes a domingo.` · `Cada día indica isOpen; un día abierto abre y cierra a una hora en punto o y media (HH:MM).` · `La hora de cierre es posterior a la de apertura.` |
| Regla | Reemplaza la semana completa en una sola sentencia y registra qué administradora la cambió. Un día cerrado no guarda horas aunque se envíen. |

### 11. `GET /api/blocked-dates`

| | |
|---|---|
| Éxito | **200** arreglo de fechas ordenadas, p. ej. `["2026-05-20", "2026-06-10"]` |

### 12. `POST /api/blocked-dates`

| | |
|---|---|
| Entrada | `{ "date": "AAAA-MM-DD" }` |
| Éxito | **201** `{ "date": "2026-06-15" }` |
| 400 `invalid_input` | `La fecha no es válida; usa el formato AAAA-MM-DD.` |
| Regla | Bloquear un día ya bloqueado responde 201 y no lo duplica. Registra qué administradora lo bloqueó. Advertir que el día tiene citas es tarea del panel. |

### 13. `DELETE /api/blocked-dates/:date`

| | |
|---|---|
| Éxito | **204** sin cuerpo (también si el día no estaba bloqueado) |
| 400 `invalid_input` | `La fecha no es válida; usa el formato AAAA-MM-DD.` |

### 14. `GET /api/appointments?from=AAAA-MM-DD&to=AAAA-MM-DD`

| | |
|---|---|
| Entrada | `from` y `to` obligatorios, una sola vez cada uno, `from ≤ to` |
| Éxito | **200** citas del rango (ambos días incluidos), por fecha y hora |
| 400 `invalid_input` | `Indica from y to en formato AAAA-MM-DD, con from igual o anterior a to.` |

```json
[{
  "ticket": "0427", "clientName": "Ana López", "whatsapp": "9981234567",
  "date": "2026-06-01", "time": "10:00",
  "quote": { "services": ["Parche", "Dobladillo"], "preliminaryTotalMxn": 120 }
}]
```

`whatsapp` se omite cuando la clienta no tiene celular.

### 15. `DELETE /api/appointments/:ticket?date=AAAA-MM-DD`

| | |
|---|---|
| Entrada | `:ticket` de 4 dígitos · `date` obligatorio |
| Éxito | **204** sin cuerpo |
| 400 `invalid_input` | `El folio es de 4 dígitos.` · `La fecha no es válida; usa el formato AAAA-MM-DD.` |
| 404 `not_found` | `No hay una cita con ese folio en esa fecha.` |
| 409 `appointment_has_order` | `Esta cita ya tiene un pedido; cancela o entrega el pedido primero.` (Postgres 23503; no borra) |
| Regla | Los folios se repiten entre fechas, por eso se cancela por folio **y** fecha. Cancelar borra la cita y sus servicios; el horario queda libre otra vez. |

```bash
curl "http://localhost:3000/api/appointments?from=2026-06-01&to=2026-06-07" \
  -H "Authorization: Bearer $TOKEN"
```

## Pedidos

Forma de un pedido:

```json
{
  "ticket": "0427", "clientName": "Ana López", "whatsapp": "9981234567",
  "work": "Dobladillo de pantalón", "finalPriceMxn": 120, "deliveryDate": "2026-05-20",
  "status": "inProgress", "appointment": { "date": "2026-05-14", "time": "10:30" }
}
```

`status` ∈ `received`, `inProgress`, `ready`, `onTheWay`, `delivered`, `cancelled`. `delivered` y `cancelled` terminan el pedido; `onTheWay` lo pone la clienta desde la app. `whatsapp` y `appointment` se omiten cuando no hay.

### 16. `GET /api/orders`

| | |
|---|---|
| Éxito | **200** todos los pedidos, por fecha de entrega, con su clienta y su cita |

### 17. `POST /api/orders`

| | |
|---|---|
| Entrada (desde cita) | `{ ticket, work, finalPriceMxn, deliveryDate, status, appointment: { date, time } }` |
| Entrada (mostrador) | `{ ticket, work, finalPriceMxn, deliveryDate, status, clientName, whatsapp? }` |
| Éxito | **201** el pedido creado |
| 400 por campo | `ticket`: `El folio son 4 dígitos.` · `work`: `Describe el trabajo del pedido.` · `finalPriceMxn`: `El precio final es un entero de 0 o más.` · `deliveryDate`: `La fecha de entrega es una fecha AAAA-MM-DD.` · `status`: `El estado del pedido no es válido.` · `appointment`: `La cita es una fecha AAAA-MM-DD y una hora HH:MM.` · `clientName`: `El nombre de la clienta es obligatorio.` · `whatsapp`: `El WhatsApp son 10 dígitos.` |
| 404 `not_found` | `No hay una cita en esa fecha y hora.` |
| 409 `ticket_taken` | `Ya hay un pedido activo con ese folio.` |
| 409 `appointment_has_order` | `Esta cita ya tiene un pedido.` |
| Regla | Un pedido desde cita pertenece a la clienta de la cita (se ignoran `clientName` y `whatsapp` del cuerpo). En mostrador, si el WhatsApp ya es de una clienta, el pedido es suyo; si no, se crea la clienta. Clienta y pedido se guardan en **una transacción**: si el pedido se rechaza no queda una clienta nueva. Un folio solo puede tener un pedido activo; el de un pedido entregado o cancelado se puede reusar. Una cita tiene a lo más un pedido. |

### 18. `PUT /api/orders/:ticket`

| | |
|---|---|
| Entrada | `:ticket` de 4 dígitos · cuerpo `{ work, finalPriceMxn, deliveryDate, status }` |
| Éxito | **200** el pedido como quedó |
| 400 por campo | `ticket`, `work`, `finalPriceMxn`, `deliveryDate`, `status` (mismos mensajes que POST) |
| 404 `not_found` | `No hay un pedido activo con ese folio.` (tampoco se cambia un pedido entregado o cancelado) |
| Regla | Solo cambia el pedido **activo** de ese folio. Folio, clienta y cita no se cambian aunque vengan en el cuerpo. |

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ticket":"5310","clientName":"Carmen Díaz","whatsapp":"9980001111","work":"Ajuste de vestido","finalPriceMxn":250,"deliveryDate":"2026-05-22","status":"received"}'

curl -X PUT http://localhost:3000/api/orders/5310 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"work":"Ajuste de vestido","finalPriceMxn":250,"deliveryDate":"2026-05-22","status":"ready"}'
```

## Cómo obtener `$TOKEN` para probar con curl

El token es el de la sesión de la administradora en Supabase Auth. Su correo es `<celular>@panel.calm.invalid` (el panel lo arma con el celular que ella escribe), y su usuario debe estar en `admins`:

```bash
curl "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d '{"email":"<celular>@panel.calm.invalid","password":"<contraseña>"}'
# Copia el campo access_token de la respuesta:
export TOKEN=<access_token>
```

---

## API de la app de clientas

La app móvil (`calm_mobil`, Flutter) lee y escribe todo por estas rutas, igual que el panel por las suyas. El código está en `backend/src/routes/client-app.routes.ts`, `controllers/client-app.controller.ts`, `controllers/booking.controller.ts`, `middlewares/client-auth.middleware.ts` y `repositories/client-app.repository.ts`; las pruebas, en `backend/test/client-app.test.ts` y `backend/test/repositories.sql.test.ts`.

| # | Método | URL | Auth | Éxito | Para qué |
|---|--------|-----|------|-------|----------|
| 19 | POST | `/api/client/sign-in` | Ninguna | 200 | Entrar con celular y NIP; devuelve la sesión de Supabase Auth. |
| 20 | GET | `/api/client/services` | Ninguna | 200 | Catálogo de servicios activos. |
| 21 | GET | `/api/client/booking-calendar` | Ninguna | 200 | Horario, días bloqueados y espacios ocupados para agendar. |
| 22 | GET | `/api/client/profile` | Clienta | 200 | Su nombre y su celular. |
| 23 | GET | `/api/client/orders` | Clienta | 200 | Sus pedidos y sus citas. |
| 24 | POST | `/api/client/appointments` | Clienta **o** contacto | 201 | Agendar una cita. |
| 25 | DELETE | `/api/client/appointments/:ticket` | Clienta | 204 | Cancelar una cita suya. |
| 26 | POST | `/api/client/orders/:ticket/on-my-way` | Clienta | 204 | Avisar que va en camino por un pedido listo. |
| 27 | PUT | `/api/client/profile` | Clienta | 200 | Cambiar su celular o su NIP. |

### Cómo funciona la sesión

1. La app manda celular y NIP a `POST /api/client/sign-in`. La API revisa el NIP y responde un **refresh token de Supabase Auth** (sin contraseña: la API genera un enlace mágico con la llave *service role* y lo canjea ella misma; nunca se manda por correo).
2. La app instala ese refresh token con `supabase_flutter` (`auth.setSession`). Desde ahí Supabase Auth guarda y renueva la sesión en el teléfono.
3. En cada petición la app manda el **access token** de esa sesión: `Authorization: Bearer <access_token>`, igual que el panel.
4. La primera vez que entra, la API crea su usuario de Supabase Auth con el correo `<celular>@clients.calm.app` (nunca se muestra ni recibe correo) y lo liga a `clients.user_id`. Si una petición anterior lo creó y no alcanzó a ligarlo, lo reutiliza (`orphaned_auth_user_id`).
5. Cerrar sesión lo hace la app con Supabase Auth; la API no guarda sesiones.

### Guardia de la clienta

`requireClient` (`backend/src/middlewares/client-auth.middleware.ts`) lee `Authorization: Bearer <token>`, pregunta a Supabase Auth de quién es (`getUser`) y busca `select id, name, phone from clients where user_id = $1`.

| Situación | Respuesta |
|-----------|-----------|
| Sin token, o el encabezado no es `Bearer <token>` | **401** `signed_out` `Tu sesión terminó. Vuelve a entrar.` |
| Token que Supabase Auth rechaza | **401** `signed_out` |
| Token válido de alguien que no es clienta (por ejemplo, la administradora) | **401** `signed_out` |
| Supabase Auth no responde | **500** `unavailable` |

- `/api/client` se monta **antes** de la guardia de administradora: sus rutas no piden ser administradora, y una ruta inexistente bajo `/api/client` responde 404 `not_found`, no 401.
- Las rutas del panel nunca aceptan el token de una clienta (403 `not_admin`), y las de la app nunca aceptan el de la administradora (401 `signed_out`).
- Cada consulta filtra por el `id` de la clienta que sacó del token: una clienta nunca lee, cancela ni avanza lo de otra.

### Límite de intentos de NIP

Toda revisión de NIP (entrar, agendar con contacto, cambiar el celular o el NIP) primero reclama un intento con `claim_nip_attempt(celular)`, en una sola sentencia de Postgres. Se permiten **cinco** por celular; el quinto fallido lo bloquea **15 minutos**, y mientras tanto la API responde **429** `throttled` `Demasiados intentos. Espera unos minutos e inténtalo de nuevo.`, aun con el NIP correcto. Un NIP correcto borra los intentos de ese celular. Para un celular desconocido o sin NIP la API también calcula un argon2id (contra un hash señuelo), así que la respuesta tarda lo mismo y dice lo mismo: **401** `rejected` `Tu celular o tu NIP no coinciden.`

### Errores propios de la app

Mismo cuerpo `{ error, code }` que el panel. Los mensajes están escritos para mostrarse en la app tal cual.

| Código HTTP | `code` | Cuándo |
|-------------|--------|--------|
| 400 | `phone`, `nip`, `serviceIds`, `date`, `time`, `contact`, `name`, `current_nip`, `new_nip` | El campo que hay que corregir. |
| 401 | `signed_out` | Sin sesión de clienta válida. |
| 401 | `rejected` | Celular y NIP no coinciden. |
| 401 | `current_nip` | El NIP actual no coincide al cambiar el celular o el NIP. |
| 409 | `slot_taken`, `phone_without_nip`, `service_unavailable`, `appointment_not_cancellable`, `order_not_ready`, `phone_taken` | La regla de negocio lo impide (ver cada endpoint). |
| 429 | `throttled` | Cinco intentos de NIP; espera 15 minutos. |
| 500 | `unavailable` | Supabase Auth no abrió la sesión, o falla inesperada. |

### 19. `POST /api/client/sign-in`

| | |
|---|---|
| Auth | Ninguna |
| Entrada | `{ "phone": string, "nip": string }`; solo cuentan los dígitos (`"998 123-4567"` es válido) |
| Éxito | **200** `{ "refreshToken": string, "client": { "id": "1", "name": "Rosa Méndez", "phone": "9981234567" } }` |
| 400 `phone` / `nip` | `Escribe tu celular a 10 dígitos y tu NIP.` (se revisa primero el celular; no cuenta intento) |
| 401 `rejected` | `Tu celular o tu NIP no coinciden.` (NIP incorrecto, celular desconocido o celular sin NIP; cuenta un intento) |
| 429 `throttled` | Cinco intentos en ese celular. |
| 500 `unavailable` | `No pudimos abrir tu sesión. Inténtalo de nuevo.` (Supabase no generó la sesión; los intentos no se borran) |
| Regla | El NIP se verifica con argon2id contra `clients.nip_hash`, o contra un hash señuelo si no hay. Con el NIP correcto crea o liga su usuario de Supabase Auth, responde el refresh token y borra sus intentos. |

```bash
curl -X POST http://localhost:3000/api/client/sign-in \
  -H "Content-Type: application/json" -d '{"phone":"9980000001","nip":"1234"}'
```

### 20. `GET /api/client/services`

| | |
|---|---|
| Auth | Ninguna |
| Éxito | **200** `[{ "id": "1", "name": "Dobladillo de pantalón", "category": "arreglo", "basePriceMxn": 80 }, …]` |
| Regla | Solo los servicios activos, por `id`. `category` es `arreglo` o `extra` (el cargo por prenda urgente). `basePriceMxn: null` = se cotiza en el local. |

### 21. `GET /api/client/booking-calendar`

| | |
|---|---|
| Auth | Ninguna |
| Éxito | **200** el JSON de abajo |
| Regla | `today` y `now` son el reloj de Cancún. `weekly` trae los siete días; uno cerrado tiene `opensAt` y `closesAt` en `null`. `blocked` y `booked` van de hoy al último día del mes siguiente. `booked` no dice de quién es cada cita. Lo calcula la función `booking_calendar()` de Postgres. |

```json
{
  "today": "2026-12-01", "now": "10:00",
  "weekly": [{ "weekday": "monday", "opensAt": "09:00", "closesAt": "18:00" }, { "weekday": "sunday", "opensAt": null, "closesAt": null }],
  "blocked": ["2026-12-07"],
  "booked": [{ "date": "2026-12-02", "time": "12:00" }]
}
```

(El ejemplo omite cinco días de `weekly`.)

### 22. `GET /api/client/profile`

| | |
|---|---|
| Auth | Clienta |
| Éxito | **200** `{ "name": "Rosa Méndez", "phone": "9981234567" }` |
| 401 `signed_out` | Sin sesión de clienta. |

### 23. `GET /api/client/orders`

| | |
|---|---|
| Auth | Clienta |
| Éxito | **200** el JSON de abajo |
| 401 `signed_out` | Sin sesión de clienta. |
| Regla | Solo lo suyo (`where client_id = $1`). Pedidos por fecha de entrega; citas por fecha y hora, con los nombres de sus servicios. `hasOrder` dice si la cita ya originó un pedido. |

```json
{
  "orders": [{ "ticket": "1290", "work": "Cambio de cierre", "status": "ready", "finalPriceMxn": 120, "deliveryDate": "2026-12-02" }],
  "appointments": [{
    "ticket": "0815", "date": "2026-12-02", "time": "12:00", "preliminaryTotalMxn": 80,
    "services": ["Dobladillo de pantalón"], "hasOrder": false
  }]
}
```

### 24. `POST /api/client/appointments`

| | |
|---|---|
| Auth | Clienta (Bearer) **o** `contact` en el cuerpo |
| Entrada | `{ "serviceIds": [1, 2], "urgent": false, "date": "AAAA-MM-DD", "time": "HH:MM", "contact"?: { "name": string, "phone": string, "nip": string } }` |
| Éxito | **201** `{ "ticket": "4821", "client": { "id", "name", "phone" }, "appointment": { "date", "time", "totalMxn" }, "refreshToken"? }`; `refreshToken` solo cuando se agendó con `contact` |
| 400 | `Revisa los datos de tu cita.` con `code`: `serviceIds` (vacío, más de 20, o un id que no es entero positivo), `date` (no es un día real), `time` (no es en punto o y media, de `00:00` a `23:30`), `contact` (no es un objeto), `name` (vacío o más de 80 caracteres), `phone` (no son 10 dígitos), `nip` (no son 4 dígitos) |
| 401 `signed_out` | Sin `contact` y sin sesión de clienta. |
| 401 `rejected` | `contact` con un celular registrado y un NIP que no coincide (cuenta un intento). |
| 409 `service_unavailable` | `Uno de tus arreglos ya no está disponible. Vuelve a elegirlos.` (un servicio inactivo, inexistente o que no es `arreglo`) |
| 409 `slot_taken` | `Ese horario se acaba de ocupar. Elige otro.` (ya pasó, está a más de 62 días, fuera del horario, en día bloqueado u ocupado, también si alguien lo tomó entre la revisión y el `insert`) |
| 409 `phone_without_nip` | `Ese celular ya está registrado en el taller. Escríbele para que te dé tu NIP.` (no cuenta intento) |
| 429 `throttled` | Cinco intentos en el celular del contacto. |
| Regla | La API decide todo, nunca la app: el total sale del catálogo (cada arreglo más el primer servicio `extra` si `urgent` es `true`; un precio `null` cuenta 0), la ventana es de hoy (después de la hora actual) a 62 días en hora de Cancún, el horario es el del panel y el folio de 4 dígitos lo elige el repositorio entre los que no usan los pedidos activos ni las citas futuras. Un `contact` manda aunque venga un token: con un celular nuevo crea a la clienta con su NIP (argon2id); con uno registrado pide su NIP. La cita y sus servicios se guardan en **una transacción**; `appointments_scheduled_date_scheduled_time_key` evita dos citas en el mismo espacio. Un id repetido en `serviceIds` cuenta una vez. |

```bash
curl -X POST http://localhost:3000/api/client/appointments \
  -H "Authorization: Bearer $TOKEN_CLIENTA" -H "Content-Type: application/json" \
  -d '{"serviceIds":[1,2],"urgent":false,"date":"2026-12-07","time":"10:00"}'
```

### 25. `DELETE /api/client/appointments/:ticket`

| | |
|---|---|
| Auth | Clienta |
| Éxito | **204** sin cuerpo |
| 401 `signed_out` | Sin sesión de clienta. |
| 409 `appointment_not_cancellable` | `Ya no se puede cancelar desde la app: escríbele al taller.` |
| Regla | Borra la cita con ese folio **de ella**, sin pedido y a más de 24 horas en hora de Cancún; sus servicios se van con ella y el espacio queda libre. Una cita de otra clienta con el mismo folio no se toca y responde 409. |

### 26. `POST /api/client/orders/:ticket/on-my-way`

| | |
|---|---|
| Auth | Clienta |
| Éxito | **204** sin cuerpo |
| 401 `signed_out` | Sin sesión de clienta. |
| 409 `order_not_ready` | `Tu pedido ya no está listo para recoger. Escríbele al taller.` |
| Regla | Solo pasa **su** pedido de `ready` a `onTheWay`. Cualquier otro estado, o el pedido de otra clienta, responde 409 y no cambia nada. |

### 27. `PUT /api/client/profile`

| | |
|---|---|
| Auth | Clienta |
| Entrada | `{ "phone": string, "currentNip"?: string, "newNip"?: string }` |
| Éxito | **200** `{ "client": { "id", "name", "phone" } }` |
| 400 `phone` | `Escribe tu celular a 10 dígitos.` |
| 400 `current_nip` | `Escribe tu NIP actual para cambiar tu celular.` (celular nuevo sin `currentNip`; no cuenta intento ni cambia nada) |
| 401 `current_nip` | `Tu NIP actual no coincide.` (cuenta un intento; no cambia nada) |
| 400 `new_nip` | `El NIP nuevo necesita 4 dígitos.` · `El NIP nuevo debe ser distinto del actual.` |
| 401 `signed_out` | Sin sesión de clienta. |
| 409 `phone_taken` | `Ese celular ya lo usa otra cuenta.` (no cambia nada) |
| 429 `throttled` | Cinco intentos en su celular actual. |
| Regla | Cambiar el celular o el NIP pide `currentNip`: lo revisa una sola vez, aunque cambien los dos, bajo el límite de intentos de su celular actual y antes de cambiar nada. Un celular nuevo sin `currentNip` responde 400 sin contar intento. Para cambiar el NIP, después de revisar el actual guarda el nuevo como argon2id; con el mismo celular, mandar solo `currentNip` pide el nuevo (400 `new_nip`). Si nada cambia responde sus datos sin tocar la base. Si el celular cambia, después de guardarlo renombra su usuario de Supabase Auth a `<celular>@clients.calm.app`. |

### Cómo obtener `$TOKEN_CLIENTA` para probar con curl

Entra con `POST /api/client/sign-in` y canjea el `refreshToken` por una sesión:

```bash
curl "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refreshToken>"}'
# Copia el campo access_token de la respuesta:
export TOKEN_CLIENTA=<access_token>
```
