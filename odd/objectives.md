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
