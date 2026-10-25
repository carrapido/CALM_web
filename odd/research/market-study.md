# Market study: Costurando a la medida

Summary of the deep-research run of 2026-10-25 (workflow `wf_09e8ddbe-b5c`: 5 search angles, 21 sources, every claim checked by 3 adversarial votes; a claim survives with at most 1 refute). Starting point: `~/Desktop/Costurando_a_la_medida_Aplicaciones_Web.pdf`.

## Business context (from the PDF)

- Informal one-person alterations and custom tailoring shop in Cancún, Quintana Roo. Clients 23–50, low tech experience, new and recurring.
- Pain points: **P1** repetitive price questions, **P2** preliminary price taken as final, **P3** double-booked or forgotten appointments.
- MVP: Android client app + web admin panel (this repo) + API; zero monthly cost, one branch, one admin. Payment stays in store.

## Verified findings

| Confidence | Finding | Source |
|---|---|---|
| High | Internet use in 2025: 96.5% of people aged 25–34, 94.3% aged 35–44. Quintana Roo ranks 3rd nationally at 92.1% (national 86.1%, 104.9 M people). | [INEGI ENDUTIH 2025](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/endutih/ENDUTIH_25_RR.pdf), [DPL News](https://dplnews.com/endutih-2025-mexico-mas-conectado-pero-todavia-desigual/) |
| High | 97.3% of internet users connect through a smartphone, 36.2% through a computer. Supports mobile first, for clients and for the admin. | INEGI ENDUTIH 2025 |
| High | Instant messaging is the most used smartphone app category (90.6%), above social networks (80.4%). The survey does not name WhatsApp; "lowest-friction channel" is an inference. | INEGI ENDUTIH 2025, p. 18 |
| High | Message reminders raise attendance from 67.8% to 78.6% (calls 80.3%); meta-analysis of 8 RCTs: OR 1.48 (95% CI 1.23–1.72). Evidence comes from healthcare appointments (2012–2013); applying it to a tailor is an extrapolation. | [Cochrane](https://www.cochrane.org/evidence/CD007458_mobile-phone-messaging-reminders-attendance-healthcare-appointments), [PMC3419880](https://pmc.ncbi.nlm.nih.gov/articles/PMC3419880/) |
| Medium | Mobile OS share in Mexico, Sep 2026: Android 72.04%, iOS 27.96% (page views, likely overstates iOS; Statista 2024 gives Android ~77.6%). An Android-only client app leaves out roughly 1 in 4 clients. | [StatCounter](https://gs.statcounter.com/os-market-share/mobile/mexico) |
| Medium | 34% of surveyed businesses use no digital tools; of those, 36% think they do not need them and 30% do not know they exist. The admin adopts only if the value is immediate and the operation is very simple. | [ASEM/EY 2025](https://www.ey.com/es_mx/newsroom/2025/11/ventas-finanzas-digitalizacion-oportunidades-gestion-empresarial) |
| Medium | Final alteration price depends on garment, difficulty, materials and the tailor's experience, so sources advise asking for a quote. Backs the "preliminary quote, final price after inspection" rule (P2). | [Cronoshare](https://www.cronoshare.com.mx/cuanto-cuesta/compostura-ropa) |
| Low | Indicative prices: Cancún average ~$100 MXN per garment ($83–$115). National: party dress fitting $145–$300, jacket fitting $170–$300, jacket zipper $120–$160, patches $25–$45. Single marketplace source, undated, no method. | [Cronoshare Cancún](https://www.cronoshare.com.mx/servicios/composturas-ropa/quintana-roo/cancun), [Cronoshare MX](https://www.cronoshare.com.mx/cuanto-cuesta/compostura-ropa) |
| Low | Competing acquisition channel: lead marketplaces such as Cronoshare forward a free client request to up to 4 local tailors, who answer with quotes. | [Cronoshare costureras Cancún](https://www.cronoshare.com.mx/servicios/costureras/quintana-roo/cancun) |
| Low | Order tracking: a linear stepper fits fixed ordered sequences of 3–6 steps with short parallel labels. Recibido → En proceso → Listo → Entregado fits if "Listo para entrega" is shortened and Cancelado is shown as an exception, not a step (vote 2-1). | [Pluma stepper](https://pluma.customer.io/components/stepper/design) |
| Low | Phone login (SMS OTP or QR) caused far fewer password problems than username + password in NN/g usability tests (qualitative, China, 2018). Hint toward passwordless login for low-tech users. | [NN/g mobile login China](https://www.nngroup.com/articles/mobile-login-china/) |

## Refuted (do not reuse)

- "92% of Mexican MiPyMEs use WhatsApp Business": a Meta spokesperson's statement with no study behind it ([Mobile Time](https://mobiletime.la/noticias/28/02/2025/whatsapp-business-pymes-mexico/)).
- Simple alterations at $50–$70 MXN (hem, zipper, waist): not supported by the cited page.
- "Reminder timing (24 h vs 48 h vs 72 h) makes no difference": not supported.
- Cochrane RR 1.14 figure for SMS reminders, as phrased: refuted 0-3 (use the OR 1.48 finding above instead).
- The most common Cancún requests are zippers, taking in, hems, swimwear, next-day fixes: not supported by the page.

## Coverage gaps

No verified data on: market size of alterations in Cancún or Mexico; costs and limits of WhatsApp Business, Google Business Profile, AgendaPro, Calendly, Fresha, Booksy; concrete Mercado Libre and Amazon tracking patterns; willingness to install an app vs. using web or WhatsApp. Anything said on those topics is design inference, not evidence.

## Open questions

1. How many alteration shops are there in Cancún and what do they really charge for hems, zippers, waist fittings, swimwear? Needs a field or WhatsApp survey of 5–10 shops.
2. What share of the shop's real clients use iOS, and would they install an app or prefer a web link / PWA / WhatsApp only? Decides native Android vs PWA.
3. Can the MVP send WhatsApp or SMS notices at zero monthly cost? WhatsApp Business Platform pricing and Firebase Auth SMS free-tier limits were not verified.
4. Which needs are already covered for free by existing tools (WhatsApp Business catalog and labels, Google Business Profile bookings, AgendaPro, Fresha), and what is the real gap that justifies custom software?

## Implications for this repo (admin web panel)

- **Mobile first** for the admin is confirmed: the shell's bottom tab bar is in line with the data.
- **Zero-cost reminders:** a "Recordar por WhatsApp" action per appointment that opens a `wa.me` click-to-chat link with a prefilled message; the admin only taps Send. Same pattern for "Pedido listo". Not yet checked against WhatsApp's official docs: verify before specifying.
- **Pedidos:** show the state as a stepper Recibido → En proceso → Listo → Entregado, with Cancelado as an exception.
- **Out of this repo but worth raising:** the ~28% iOS share questions the PDF's Android-only client app; a PWA would cover both.

## Unused sources

Fetched but no claim survived verification: [web.dev Jumia PWA case](https://web.dev/case-studies/jumia), [Baymard forced sign-up](https://pay.amazon.com/blog/the-baymard-report-series-how-forcing-sign-ups-drives-down-sales), [Baymard order tracking 2024](https://baymard.com/research-articles/2024-benchmark-order-tracking-and-returns), [NN/g visibility of system status](https://nngroup.com/articles/visibility-system-status), [Xataka: rastrear envío Mercado Libre](https://www.xatakandroid.com/tutoriales/como-rastrear-envio-mercado-libre-tu-celular), [UXPin progress trackers](https://www.uxpin.com/studio/blog/design-progress-trackers/), [AgendaPro vs Booksy](https://agendapro.com/blog/agendapro-vs-booksy/), [Milenio: WhatsApp, ASEM y SE](https://www.milenio.com/negocios/whatsapp-asem-secretaria-economia-unen-capacitar-mipymes).
