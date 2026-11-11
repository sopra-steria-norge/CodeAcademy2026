# Agentteam og modellvalg

Agentfilene i [`.github/agents/`](./.github/agents/) er fasiten for verktøy og faste modellvalg. Velg en modell bevisst for agentene som ikke har en fast modell.

| Agent | Modell | Verktøy | Rolle | Begrunnelse for modellvalget |
| --- | --- | --- | --- | --- |
| `utforsker` | Claude Haiku 5.5 | `read`, `search` | Finner relevant kode og returnerer et kort, kildebasert sammendrag. | Lett og rask modell passer til avgrenset lesing og oppsummering, som kan gjøres ofte uten behov for dyp resonnering. |
| `implementer` | Claude Sonnet 5.5 | `read`, `search`, `edit`, `execute` | Implementerer kode, oppdaterer tester og kjører verifisering. | En allsidig modell gir en god balanse mellom kodekvalitet, kapasitet og kostnad for praktisk utviklingsarbeid. |
| `planner` | Claude Opus 5.5 | `read`, `search` | Lager planer for større endringer uten å redigere filer. | Planlegging på tvers av filer og avhengigheter krever grundig resonnering; planen styrer resten av arbeidet. |
| `reviewer` | Ikke fastlåst; velges ved behov | `read`, `search` | Gjennomgår kodeendringer og rapporterer konkrete funn. | En annen modellfamilie enn implementer kan gi et mer uavhengig perspektiv og redusere delte blindsoner. |
| `orkestrator` | Claude Opus 5.5 | `read`, `search`, `agent` | Velger arbeidsflyt og delegerer til spesialiserte agenter. | Delegering krever at oppgaven brytes ned og riktig agent velges; den kraftigere modellen brukes her, mens direkte redigering er utelukket. |

Modellene er valgt etter oppgaven: en lett modell til hyppig utforsking, en allsidig modell til implementering, og kraftigere resonnering til planlegging og orkestrering. Agentene får bare verktøyene de trenger; orkestratoren har ikke tilgang til redigering eller kommandoer.

Se [oppgave 5: Orkestrator med modellvalg](./5-AI/oppgaver-orkestrering.md) for oppgavebeskrivelsen.
