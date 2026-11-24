# Pruebas de la API: casos, entradas y resultados

Cada fila es un caso representativo de un endpoint: qué se envía, qué debe responder y qué respondió al correr las pruebas automáticas. La columna **Prueba** dice dónde está, como `archivo › describe › it`, dentro de `backend/test/`. El contrato completo está en [`api.md`](api.md).

## Cómo se corrieron

```bash
npm --prefix backend test
```

Resultado observado (sin `TEST_DATABASE_URL`, así que las pruebas de SQL se saltan):

```text
 Test Files  8 passed | 1 skipped (9)
      Tests  200 passed | 24 skipped (224)
```

| Archivo | Pruebas | Qué cubre |
|---------|---------|-----------|
| `app.test.ts` | 34 | Salud, CORS (con la lista de orígenes), guardia de administradora, rutas inexistentes, middleware de errores (con el mensaje de cada restricción conocida), 413 y 415. |
| `request-log.test.ts` | 4 | Una línea por petición con método, ruta, código y tiempo, sin token ni cuerpo. |
| `services.test.ts` | 31 | Catálogo de servicios. |
| `clients.test.ts` | 34 | Clientes y hash del NIP. |
| `agenda.test.ts` | 45 | Horario, días bloqueados y citas. |
| `orders.test.ts` | 44 | Pedidos. |
| `supabase-auth.test.ts` | 7 | Cómo se interpreta la respuesta de Supabase Auth al verificar un token. |
| `database.test.ts` | 1 | Una conexión inactiva que se cae no tumba el servidor. |
| `repositories.sql.test.ts` | 24 | Los repositorios de SQL contra un Postgres desechable (ver [Repositorios contra Postgres](#repositorios-contra-postgres)). |

Las pruebas levantan la app de Express real (`createApp`) con `supertest`; solo cambian Supabase Auth y Postgres por repositorios en memoria (`backend/test/in-memory-*.ts`). Así comprueban rutas, validación, códigos y cuerpos JSON sin tocar la base real. Las pruebas de rechazo también comprueban que **no cambió nada** en los datos.

En la columna **Observado**, ✅ significa que la respuesta fue exactamente la esperada (código y cuerpo) en la corrida de arriba.

`TOKEN` = token de administradora; `TOKEN_CLIENTA` = token válido de alguien que no es administradora.

## Generales y seguridad

| Caso | Entrada | Esperado | Observado | Prueba |
|------|---------|----------|-----------|--------|
| API viva | `GET /api/health` sin token | 200 `{"status":"ok"}` | ✅ 200 | app › GET /api/health › answers 200 without a token |
| CORS | `GET /api/health` con `Origin: https://evil.example` | Sin `Access-Control-Allow-Origin` para ese origen | ✅ | app › GET /api/health › lets only the panel origin read the answer |
| CORS con varios orígenes | `CORS_ORIGIN=http://localhost:5173, http://127.0.0.1:5173/`; `Origin: http://127.0.0.1:5173` y `Origin: http://localhost:4173` | El segundo origen recibe su `Access-Control-Allow-Origin`; el desconocido, ninguno | ✅ | app › GET /api/health › lets every origin listed in CORS_ORIGIN read the answer, and no other |
| Registro de peticiones | `GET /api/services` con `TOKEN`; `POST /api/services` con cuerpo | Una línea `GET /api/services 200 <n>ms`; sin el token ni el cuerpo | ✅ | request-log › The request log › logs one line with the method, path, status and time of each request; never logs the token or the body |
| Sin sesión | `GET /api/services` sin token | 401 `unauthenticated` | ✅ 401 | app › The admin guard on /api › answers 401 without a token |
| Token vencido | `Authorization: Bearer token-vencido` | 401 `unauthenticated` | ✅ 401 | app › The admin guard on /api › answers 401 for a token Supabase Auth rejects |
| No es administradora | `Bearer TOKEN_CLIENTA` | 403 `not_admin` | ✅ 403 | app › The admin guard on /api › answers 403 for a signed-in user who is not an admin |
| Ruta inexistente | `GET /api/no-existe` | 404 `No existe la ruta GET /api/no-existe.` | ✅ 404 | app › Unknown routes › answers 404 under /api for an admin |
| JSON roto | `POST /api/services` con `{"name": ` | 400 `invalid_input` | ✅ 400 | app › The error middleware › answers 400 for a body that is not JSON |
| Cuerpo enorme | 200 000 caracteres | 413 `body_too_large` | ✅ 413 | app › Bodies the API cannot take › answers 413 to a body over the limit |
| *Charset* no soportado | `Content-Type: application/json; charset=latin9` | 415 `unsupported_body` | ✅ 415 | app › Bodies the API cannot take › answers 415 to a charset it does not read |
| Falla la base | El repositorio lanza un error | 500 `unavailable`, sin detalles; el error va al log | ✅ 500 | app › The error middleware › answers 500 without the details and logs them |
| Supabase Auth caído | `identity` lanza error | 500 `unavailable` y no lee datos | ✅ 500 | app › The admin guard failures › answers 500 and touches nothing when Supabase Auth fails |
| Duplicado en Postgres | Error 23505 sin restricción conocida | 409 `conflict` | ✅ 409 | app › The error middleware › answers 409 when Postgres reports a duplicate (23505) |
| Registro en uso | Error 23503 sin restricción conocida | 409 `conflict` | ✅ 409 | app › The error middleware › answers 409 when Postgres reports a row still in use (23503) |
| Restricción desconocida | Error 23505 de `some_other_key` | 409 `conflict` | ✅ 409 | app › The error middleware › keeps the general 409 for a constraint it does not know |
| Nombre de servicio repetido | Error 23505 de `services_name_key` | 409 `service_name_taken` `Ya existe un servicio con ese nombre.` | ✅ 409 | app › The error middleware › answers 409 with its own message when Postgres 23505 names services_name_key |
| Celular repetido | Error 23505 de `clients_phone_key` | 409 `phone_taken` | ✅ 409 | app › The error middleware › answers 409 with its own message when Postgres 23505 names clients_phone_key |
| Folio activo repetido | Error 23505 de `orders_active_ticket_key` | 409 `ticket_taken` | ✅ 409 | app › The error middleware › answers 409 with its own message when Postgres 23505 names orders_active_ticket_key |
| Cita con dos pedidos | Error 23505 de `orders_appointment_id_key` | 409 `appointment_has_order` | ✅ 409 | app › The error middleware › answers 409 with its own message when Postgres 23505 names orders_appointment_id_key |
| Borrar cita con pedido | Error 23503 de `orders_appointment_id_fkey` | 409 `appointment_has_order` `Esta cita ya tiene un pedido; cancela o entrega el pedido primero.` | ✅ 409 | app › The error middleware › answers 409 with its own message when Postgres 23503 names orders_appointment_id_fkey |

## Servicios

| Caso | Entrada | Esperado | Observado | Prueba |
|------|---------|----------|-----------|--------|
| Listar | `GET /api/services` | 200 con los 2 servicios | ✅ 200 | services › GET /api/services › lists every service with its price, days and state |
| Agregar | `POST` `{"name":"Dobladillo","price":{"kind":"base","amountMxn":80},"estimatedDays":2}` | 201 con `id` e `isActive: true`; queda en la lista | ✅ 201 | services › POST /api/services › adds an active service and answers 201 with it |
| Días fuera de rango | `POST` con `estimatedDays: 31` | 400 `Los días estimados son un entero de 0 a 30.`; no agrega | ✅ 400 | services › POST /api/services › answers 400 for 31 estimated days and adds nothing |
| Nombre repetido | `POST` con `name: "Parche"` | 409 `service_name_taken`; no agrega | ✅ 409 | services › POST /api/services › answers 409 when the name is taken |
| Renombrar a uno existente | `PUT /api/services/3` con el nombre de otro | 409 `service_name_taken`; no cambia | ✅ 409 | services › PUT /api/services/:id › answers 409 when the new name belongs to another service and changes nothing |
| Editar | `PUT /api/services/3` con los 4 campos | 200 con el servicio nuevo | ✅ 200 | services › PUT /api/services/:id › replaces the service and answers 200 with it |
| Id inválido | `PUT /api/services/abc` | 400 `El identificador del servicio no es válido.` | ✅ 400 | services › PUT /api/services/:id › answers 400 for the id abc |
| No existe | `PUT /api/services/99` | 404 `El servicio no existe.` | ✅ 404 | services › PUT /api/services/:id › answers 404 for a service that does not exist |
| Eliminar | `DELETE /api/services/3` | 204 sin cuerpo | ✅ 204 | services › DELETE /api/services/:id › deletes the service and answers 204 |
| En uso | `DELETE /api/services/6` (lo usa una cita) | 409 `service_in_use`; no borra | ✅ 409 | services › DELETE /api/services/:id › answers 409 and keeps a service an appointment uses |
| No administradora | `POST`, `PUT`, `DELETE` con `TOKEN_CLIENTA` | 403 | ✅ 403 | app › The admin guard failures › answers 403 to a non-admin on every method |

## Clientes

| Caso | Entrada | Esperado | Observado | Prueba |
|------|---------|----------|-----------|--------|
| Listar sin hash | `GET /api/clients` | 200, sin `nipHash` | ✅ 200 | clients › GET /api/clients › lists every client and her access, never her NIP hash |
| Sin sesión / no admin | `GET` sin token y con `TOKEN_CLIENTA` | 401 y 403 `not_admin` | ✅ 401 / 403 | clients › GET /api/clients › answers 401 without a session and 403 to a non-admin |
| Alta | `POST` `{"name":"Marta Gil","phone":"9985551234","nip":"4321"}` | 201 `{"client":{…,"hasAppAccess":true}}` | ✅ 201 | clients › POST /api/clients › adds the client with app access and answers 201 with her |
| NIP con hash | La misma alta | Se guarda un hash argon2id, nunca `4321` | ✅ | clients › POST /api/clients › stores a hash of the NIP, never the NIP itself |
| Celular corto | `phone: "998555123"` | 400 `phone`; no agrega | ✅ 400 | clients › POST /api/clients › answers 400 for a 9-digit phone and adds nothing |
| NIP corto | `nip: "432"` | 400 `nip`; no agrega | ✅ 400 | clients › POST /api/clients › answers 400 for a 3-digit NIP and adds nothing |
| Celular ocupado | `phone` de otra clienta | 409 `phone_taken`; no agrega | ✅ 409 | clients › POST /api/clients › answers 409 when another client has the phone |
| Dar NIP | `PUT /api/clients/2/access` `{"phone":"9987654321","nip":"1111"}` | 200, `hasAppAccess: true` | ✅ 200 | clients › PUT /api/clients/:id/access › gives an existing client a NIP and answers 200 with her |
| Cambia celular de usuaria de la app | `PUT /api/clients/1/access` con celular nuevo | 200 y renombra su correo de Auth | ✅ 200 | clients › PUT /api/clients/:id/access › renames the auth email of an app user whose phone changes |
| No existe | `PUT /api/clients/99/access` | 404 `Ese cliente ya no existe.` | ✅ 404 | clients › PUT /api/clients/:id/access › answers 404 for a client that does not exist |
| Celular de otra | `PUT /api/clients/1/access` con el celular de la 2 | 409 `phone_taken`; no renombra | ✅ 409 | clients › PUT /api/clients/:id/access › answers 409 when another client has the phone, and renames nothing |

## Agenda: horario, días bloqueados y citas

| Caso | Entrada | Esperado | Observado | Prueba |
|------|---------|----------|-----------|--------|
| Sin sesión | `GET /api/schedule` sin token | 401 | ✅ 401 | agenda › the agenda routes › answer 401 without a session |
| Leer horario | `GET /api/schedule` | 200 con los 7 días | ✅ 200 | agenda › GET /api/schedule › answers the week the panel uses |
| Guardar horario | `PUT` `{"schedule":{…7 días…}}` | 200; guarda quién lo cambió | ✅ 200 | agenda › PUT /api/schedule › replaces the week, records the admin and answers 200 with it |
| Cierre antes de abrir | lunes `18:00`–`09:00` | 400 `La hora de cierre es posterior a la de apertura.`; no cambia | ✅ 400 | agenda › PUT /api/schedule › answers 400 for closing before opening and keeps the week |
| Falta un día | sin `sunday` | 400 `El horario trae los siete días…` | ✅ 400 | agenda › PUT /api/schedule › answers 400 for a missing weekday and keeps the week |
| Listar bloqueados | `GET /api/blocked-dates` | 200 en orden | ✅ 200 | agenda › GET /api/blocked-dates › lists the blocked days in order |
| Bloquear | `POST` `{"date":"2026-06-15"}` | 201 `{"date":"2026-06-15"}` | ✅ 201 | agenda › POST /api/blocked-dates › blocks the day for the admin and answers 201 |
| Fecha imposible | `{"date":"2026-02-30"}` | 400 `La fecha no es válida…`; no bloquea | ✅ 400 | agenda › POST /api/blocked-dates › answers 400 for a day that does not exist and blocks nothing |
| Desbloquear | `DELETE /api/blocked-dates/2026-06-10` | 204 | ✅ 204 | agenda › DELETE /api/blocked-dates/:date › unblocks the day and answers 204 |
| Citas de un rango | `GET /api/appointments?from=2026-06-01&to=2026-06-30` | 200 con 2 citas | ✅ 200 | agenda › GET /api/appointments › lists the appointments from one day to another, both included |
| Rango al revés | `?from=2026-06-30&to=2026-06-01` | 400 `Indica from y to…` | ✅ 400 | agenda › GET /api/appointments › answers 400 for from after to |
| Cancelar | `DELETE /api/appointments/0427?date=2026-06-03` | 204; solo esa cita | ✅ 204 | agenda › DELETE /api/appointments/:ticket › cancels only the appointment with that ticket on that date and answers 204 |
| Cita con pedido | `DELETE /api/appointments/0427?date=2026-06-03` (un pedido la usa) | 409 `appointment_has_order` `Esta cita ya tiene un pedido; cancela o entrega el pedido primero.`; no borra | ✅ 409 | agenda › DELETE /api/appointments/:ticket › answers 409 when an order already points to the appointment and keeps it |
| No existe | `DELETE /api/appointments/0427?date=2026-07-01` | 404 `No hay una cita con ese folio en esa fecha.` | ✅ 404 | agenda › DELETE /api/appointments/:ticket › answers 404 when that date has no appointment with that ticket |
| Folio inválido | `DELETE /api/appointments/427?date=…` | 400 `El folio es de 4 dígitos.` | ✅ 400 | agenda › DELETE /api/appointments/:ticket › answers 400 for the ticket 427 |

Cancelar una cita que ya tiene pedido responde 409 `appointment_has_order` porque Postgres rechaza el borrado (23503 de `orders_appointment_id_fkey`).

## Pedidos

| Caso | Entrada | Esperado | Observado | Prueba |
|------|---------|----------|-----------|--------|
| Sin sesión | `GET /api/orders` sin token | 401 `unauthenticated` | ✅ 401 | orders › GET /api/orders › answers 401 without a session token |
| Listar | `GET /api/orders` | 200 por fecha de entrega | ✅ 200 | orders › GET /api/orders › lists every order by delivery date with its client and appointment |
| Desde cita | `POST` con `appointment: {"date":"2026-05-15","time":"12:00"}` | 201, clienta de la cita | ✅ 201 | orders › POST /api/orders › adds an order from an appointment for its client and answers 201 with it |
| Mostrador | `POST` con `clientName: "  Carmen Díaz  "` | 201, nombre sin espacios | ✅ 201 | orders › POST /api/orders › adds a walk-in order for a new client, without spaces around her name |
| Folio inválido | `ticket: "123"` | 400 `ticket`; no agrega | ✅ 400 | orders › POST /api/orders › answers 400 for a 3-digit ticket and adds nothing |
| Fecha imposible | `deliveryDate: "2026-02-30"` | 400 `deliveryDate`; no agrega | ✅ 400 | orders › POST /api/orders › answers 400 for a delivery date that does not exist and adds nothing |
| Cita inexistente | `appointment` a las `13:00` | 404 `No hay una cita en esa fecha y hora.` | ✅ 404 | orders › POST /api/orders › answers 404 when no appointment is at that date and time, and adds nothing |
| Folio activo | `ticket: "1290"` (pedido listo) | 409 `ticket_taken`; no agrega | ✅ 409 | orders › POST /api/orders › answers 409 when an active order holds the ticket, and adds nothing |
| Cita con pedido | `appointment` de Ana | 409 `appointment_has_order`; no agrega | ✅ 409 | orders › POST /api/orders › answers 409 when the appointment already has an order, and adds nothing |
| Actualizar | `PUT /api/orders/1290` con `status: "ready"` | 200 con los cambios | ✅ 200 | orders › PUT /api/orders/:ticket › changes the active order with that ticket and answers 200 with it |
| Pedido terminado | `PUT /api/orders/7777` (cancelado) | 404 `No hay un pedido activo con ese folio.` | ✅ 404 | orders › PUT /api/orders/:ticket › answers 404 when only a finished order holds the ticket, and changes nothing |
| Estado inválido | `status: "Listo"` | 400 `status`; no cambia | ✅ 400 | orders › PUT /api/orders/:ticket › answers 400 for an unknown status and changes nothing |

## Repositorios contra Postgres

`backend/test/repositories.sql.test.ts` corre el SQL de cada repositorio contra un Postgres real. Antes de cada prueba borra los esquemas `public`, `private` y `auth`, carga `database/schema.sql`, crea una administradora de prueba y carga `database/seed.sql`; las fechas las pide a la base, porque el seed las calcula desde `current_date`. Solo corre con `TEST_DATABASE_URL` (nunca lee `DATABASE_URL`), así que la base debe ser desechable. Cómo correrlo: [README](../README.md#pruebas-contra-una-base-de-datos-desechable).

Resultado observado contra `postgres:17-alpine` en Docker:

```text
 Test Files  1 passed (1)
      Tests  24 passed (24)
```

| Repositorio | Caso | Esperado | Observado |
|-------------|------|----------|-----------|
| admins | La administradora de prueba y otro id | `true` y `false` | ✅ |
| services | Agregar «Bordado» | Activo, con id `8`, queda en la lista | ✅ |
| services | Editar el 3 y uno que no existe | El 3 cambia; `null` para el 99 | ✅ |
| services | Borrar el 5 (lo usa una cita), el 6 y el 99 | `inUse`, `deleted`, `notFound`; el 5 sigue | ✅ |
| services | Agregar «Parche» otra vez | 23505 de `services_name_key`; siguen 7 servicios | ✅ |
| clients | Alta con celular nuevo | `hasAppAccess: true`; se borra el bloqueo de ese celular, no el de otro | ✅ |
| clients | Alta con el celular de Ana | `phoneTaken`; siguen 6 clientes | ✅ |
| clients | Dar NIP a Rosa con celular nuevo | Cambia su celular; se borran los bloqueos del viejo y del nuevo | ✅ |
| clients | Usuaria de la app cambia de celular | Devuelve su usuario de Auth para renombrarlo | ✅ |
| clients | Dar NIP con un celular ocupado | `phoneTaken`; ni la clienta ni sus intentos cambian | ✅ |
| clients | Cliente 99 | `notFound` | ✅ |
| agenda | Leer y guardar la semana | La del seed; luego la nueva | ✅ |
| agenda | Semana con un día que cierra antes de abrir | 23514; los siete días siguen como estaban | ✅ |
| agenda | Bloquear el mismo día dos veces y desbloquearlo | Aparece una vez; luego ya no | ✅ |
| agenda | Citas de hace 2 días a dentro de 2 | `0427`, `0815`, `1503` en orden, con servicios y total | ✅ |
| agenda | Cancelar `0815` de mañana con otra `0815` más adelante | Solo se borra la de mañana; cancelarla otra vez da `false` | ✅ |
| agenda | Cancelar `0427` (tiene pedido) | 23503 de `orders_appointment_id_fkey`; la cita sigue | ✅ |
| orders | Pedido desde la cita de mañana | Clienta de la cita y la cita en el pedido | ✅ |
| orders | Hora sin cita y cita que ya tiene pedido | `appointmentNotFound` y `appointmentHasOrder`; siguen 6 pedidos | ✅ |
| orders | Mostrador con celular nuevo | Crea la clienta | ✅ |
| orders | Mostrador con el celular de Rosa | Usa a Rosa; siguen 6 clientes | ✅ |
| orders | Folio `5310` activo con clienta nueva | `ticketTaken`; no queda clienta huérfana | ✅ |
| orders | Precio negativo con clienta nueva | 23514; no queda clienta ni pedido | ✅ |
| orders | Actualizar `1290` y el entregado `3388` | El primero cambia; el segundo da `null` y queda igual | ✅ |

## Evidencia para la demostración en vivo

Las pruebas de la API usan datos en memoria y las de repositorios una base desechable. Para mostrar que los datos **persisten en Postgres** y que los errores llegan a la pantalla, sigue estos pasos con la API y el panel corriendo (ver [README](../README.md)) y la base con `database/seed.sql`. Toma una captura en cada paso marcado con 📸.

### Persistencia

1. Entra al panel como administradora. 📸 la Agenda con las citas del seed.
2. En **Catálogo**, agrega «Botones» a $30, 1 día. 📸 el servicio en la lista.
3. Recarga la página (F5). El servicio sigue ahí. 📸.
4. En Supabase (SQL Editor) corre `select id, name, base_price_mxn from services order by id;`. 📸 la fila nueva.
5. En **Agenda**, registra un pedido de mostrador. Cámbialo a «Listo para entrega». Recarga. 📸 el pedido con su estado.
6. Corre `select ticket, status from orders order by id desc limit 3;`. 📸.

### Errores

1. **409 servicio en uso:** «Arreglo de vestido de novia» (id 5) lo usa una cita del seed. `curl -i -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/services/5`. 📸 `409` y `service_in_use`.
2. **409 celular ocupado:** en **Clientes**, da de alta a alguien con el celular `9980000002` (es de Rosa Pérez en el seed). 📸 «Ese celular ya es de otro cliente.».
3. **401 sin sesión:** en una terminal, `curl -i http://localhost:3000/api/services`. 📸 `401` y `{"error":"Inicia sesión para continuar.","code":"unauthenticated"}`.
4. **404 ruta:** `curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/no-existe`. 📸.
5. **400 validación:** `curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"","price":{"kind":"base","amountMxn":10},"estimatedDays":1}' http://localhost:3000/api/services`. 📸.
6. **Servicio caído:** detén la API (Ctrl+C) y recarga el panel. 📸 lo que muestra el panel al no poder leer los datos.

Guarda las capturas en `docs/evidencias/` con el número del paso en el nombre.
