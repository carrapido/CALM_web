# Objectives

> "tengo varios mockups en google stitch, en que formato lo exporto para que puedas trabajar en el con solamente react"
> "solamente react+Ts+tailwind"
> "sí, la web es solo para la administradora"

Scope source: `Costurando_a_la_medida_Aplicaciones_Web.pdf`. The web app is the admin panel; the client side (catalog, quote, booking, order status) is the Android app and is out of scope here. The Stitch export `stitch_costurando_a_la_medida` contributes only its design tokens: its four screens are client screens. Market and UX evidence: [market study](research/market-study.md).

> "cambia el funcionamiento de la app del cliente, que en vez de que tenga que inciar sesion sea por medio de tickets 4 digitos ya que el pyme es muy pequeño y no le encuentro mucho sentido que el usuario tenga que meter su correo y numero de telefono"

Decision 2026-10-25: clients have no account. Each appointment and order is reached with a 4-digit ticket (the PDF's sign-up, login and per-client rules change accordingly). Booking asks for the client's name and an optional WhatsApp number for the reminder (user chose option 2). Tickets are random and unique among active ones; the API throttles lookups and the ticket screen shows no personal data. One ticket follows the appointment and its order to Entregado.

> "estas teniendo en cuenta que la administradora de la pagina es una persona mayor y que no tiene mucho saber sobre la tecnologia?"

Constraint for every feature: the admin is an older person with little tech experience. Design for her first: large text, high contrast, words over icons, one obvious action per screen, no gestures or hover-only controls, forgiving and reversible actions.

1. [App shell and design tokens](tasks/app-shell.md) — done
2. [Admin shell](tasks/admin-shell.md) — done
3. [Agenda y horario](tasks/agenda.md) — done
4. [Pedidos](tasks/pedidos.md) — done
5. [Catálogo de servicios](tasks/catalogo.md) — done

> "usando este html de mock ups como referencia, remodela diseño de la pagina web de calm, recuerad usar apple design y usar los artifacts"
> "agregalos al proyecto calm_web"

Decision 2026-11-17: restyle the admin panel with Apple's design language. The reference is the "Calm Redesign" design canvas (https://claude.ai/artifact/6oAafehDFU5Qi6phWcUECF), built from the client-app mockups "Costurando a la medida: menor fricción" plus the user's own edits on 2026-11-16. Each feature below brings one area of the canvas into the code. The older-admin constraint above still rules every screen.

6. [Estilo Apple: tokens y marco del panel](tasks/apple-shell.md) — done
7. [Agenda del día con detalle de cita](tasks/agenda-apple.md) — done
8. [Mi horario y bloquear un día](tasks/horario-apple.md) — done
9. [Pedidos: lista, detalle y hoja de nuevo pedido](tasks/pedidos-apple.md) — done
10. [Catálogo: lista y panel de edición](tasks/catalogo-apple.md) — pending
11. [Registrar pedido desde la cita](tasks/pedido-desde-cita.md) — pending

> "usa este diagrama de bd para hcaer toda la bd"
> "conectalo a la version web y a la version. mobile en flutter"

Decision 2026-11-17: the schema from `CALM_BD.drawio` is applied to the Supabase project CALM (`supabase/migrations/`). Both the admin panel (this repository) and the client app in Flutter (`/Users/crpd/CALM_mobile`) move from sample data to that database. Clients sign in with phone and NIP, as the diagram and the Flutter app have it; see objective 12. Objective 10 is paused meanwhile.

12. [Acceso a la base: sesiones y políticas](tasks/acceso-supabase.md) — done
13. [Panel web: entrar como administradora](tasks/web-entrar.md) — in-progress
14. [Panel web: catálogo en Supabase](tasks/web-catalogo-supabase.md) — pending
15. [Panel web: agenda, horario y días bloqueados en Supabase](tasks/web-agenda-supabase.md) — pending
16. [Panel web: pedidos en Supabase](tasks/web-pedidos-supabase.md) — pending
17. [App Flutter: conexión y entrada con celular y NIP](tasks/movil-entrar.md) — pending
18. [App Flutter: servicios y agendar cita](tasks/movil-servicios-cita.md) — pending
19. [App Flutter: mis pedidos y voy en camino](tasks/movil-pedidos.md) — pending
20. [App Flutter: perfil](tasks/movil-perfil.md) — pending
