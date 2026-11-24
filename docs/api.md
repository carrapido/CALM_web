# Contrato de la API REST de CALM

La API (`backend/`) atiende al panel de administración. Todas las rutas viven bajo `http://localhost:3000/api`, reciben y devuelven JSON, y —salvo `/api/health`— exigen una sesión de administradora. Este contrato está tomado del código (`backend/src/routes`, `controllers`, `types`) y de sus pruebas (`backend/test/*.test.ts`); cada fila de [`pruebas.md`](pruebas.md) apunta a la prueba que lo comprueba.

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

## Reglas comunes

### Autenticación

| Situación | Respuesta |
|-----------|-----------|
| `/api/health` | No pide token. |
| Sin encabezado `Authorization`, o que no sea exactamente `Bearer <token>` | **401** `unauthenticated` |
| Token que Supabase Auth rechaza (vencido o falso) | **401** `unauthenticated` |
| Token válido de un usuario que no está en la tabla `admins` | **403** `not_admin` |
| Supabase Auth no responde, responde 429/5xx, o falla la consulta a `admins` | **500** `unavailable` (no se toca ningún dato) |

El token es el `access_token` de la sesión de Supabase Auth de la administradora. El panel lo manda solo (`src/services/api-client.ts`). La verificación ocurre **antes** de buscar la ruta: una ruta inexistente bajo `/api` sin token responde 401, no 404.

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

Solo el origen de `CORS_ORIGIN` (por omisión `http://localhost:5173`) puede leer las respuestas desde el navegador.

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
