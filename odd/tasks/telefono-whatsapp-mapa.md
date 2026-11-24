---
status: done
---

# Teléfono con NIP, WhatsApp en una pestaña y "Cómo llegar"

Three small changes across CALM_web (backend + panel) and calm_mobil (app): changing the phone asks for the current NIP, the panel's WhatsApp buttons reuse one tab, and the app's "Cómo llegar" opens the workshop on Google Maps with the real address.

## Specs

- **S1** User: "Haz los cambios" — the two recommendations: "Pedir el NIP actual para cambiar el teléfono" and "Que el botón reutilice siempre la misma pestaña de WhatsApp en lugar de abrir una nueva cada vez."
- **S2** Phone change contract: `PUT /api/client/profile` with a phone different from her current one requires `currentNip`: missing → 400 `current_nip` "Escribe tu NIP actual para cambiar tu celular."; wrong → 401 `current_nip` (existing message); throttled → 429 (same claim_nip_attempt on her current phone). A NIP change keeps today's rules. The app's Perfil asks for the current NIP when the phone changes and shows these messages on that field.
- **S3** Panel: "Recordar por WhatsApp" (AppointmentDetail) and "Avisar por WhatsApp" (OrderDetail) open WhatsApp in one named tab that is reused every time (no new tab per click); the prefilled message stays.
- **S4** User: "puedes agregar de una vez la redirección al boton de ¿Como llegar? se ve cuando en los pedidos y cuando sale la hoja deslizante sobre las opciones de ayuda te paso el link de google maps: https://maps.app.goo.gl/nGsvenuYn4VE4rBfA?g_st=aw"
- **S5** User: "Con eso tambien puedes completar los textos que tenian UBICACIÓN DEL TALLER y similares." The link resolves to "COSTURANDO A LA MEDIDA, Benito Juárez 223-casa 22, Los Héroes, Mz 10, 77517 Cancún, Q.R."; every "[DIRECCIÓN DEL TALLER]"-style placeholder shows that address.

## Tasks

- [x] T1 (S1, S2, S3) CALM_web: backend phone change requires current NIP; panel WhatsApp single tab; docs/api.md + docs/pruebas.md. Route: worker. Commit: c0e11c5
- [x] T2 (S1, S2, S4, S5) calm_mobil: Perfil asks the current NIP for a phone change; "Cómo llegar" in Pedido detail and the help sheet opens the Maps link; address placeholders filled. Route: worker (parallel). Commit: calm_mobil 4b05e9a

## Log

- **L1** User: "Haz los cambios, ademas puedes agregar de una vez la redirección al boton de ¿Como llegar? se ve cuando en los pedidos y cuando sale la hoja deslizante sobre las opciones de ayuda te paso el link de google maps: https://maps.app.goo.gl/nGsvenuYn4VE4rBfA?g_st=aw Con eso tambien puedes completar los textos que tenian UBICACIÓN DEL TALLER y similares. Por cierto, sigue estando la funcion de Marcar que vas en camino? Era solo un boton son estado que se visualiza en el panel de la administradora cuando su pedido esta listo y esta llendo en camino"
- **L2** Checked: "Voy en camino" is still in the app (lib/screens/order_detail_screen.dart:120) and now goes through POST /api/client/orders/:ticket/on-my-way; the panel shows "Cliente en camino" (src/utils/order-labels.ts:16). Placeholder found: lib/utils/app_constants.dart:55 "[DIRECCIÓN DEL TALLER]"; "Cómo llegar" today only shows "Abrimos Mapas con la dirección" (order_detail_screen.dart:149).
- **L3** T1 in c0e11c5: backend 289 tests, root 215. Open risk on S3: WhatsApp sends Cross-Origin-Opener-Policy (api.whatsapp.com same-origin-allow-popups, web.whatsapp.com same-origin) and the link keeps rel=noopener, so a browser may still open a new tab per click; needs a manual check in a real browser.
- **L4** T2 in calm_mobil 4b05e9a: 265 flutter tests; url_launcher opens the Maps link from Pedido detail and the help sheet; address constants in AppConstants; Perfil footnote now says the current NIP is needed for a NIP or phone change. Native assess: not due for either branch.
