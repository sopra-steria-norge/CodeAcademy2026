# Kaffebar – .NET 10 starter

Utgangspunktet for workshopen. Se [`oppgave.md`](./oppgave.md) for oppgavebeskrivelsen.

## Forutsetninger

- .NET 10 SDK (`dotnet --version` → `10.x`)
- VS Code med C# Dev Kit (anbefalt – gir støtte for `.http`-filer og IntelliSense)

## Kjør prosjektet

```bash
cd Kaffebar
dotnet run
```

API-et starter på `http://localhost:5035`.

## Utforsk API-et

Når prosjektet kjører:

| URL | Hva er det? |
| --- | --- |
| `http://localhost:5035/menu` | `GET` – hent kaffemenyen. |
| `http://localhost:5035/orders` | `GET` – hent/filtrer bestillinger; `POST` – opprett en bestilling. |
| `http://localhost:5035/orders/{orderId}` | `GET` – hent en bestilling; `PATCH` – flytt den til neste status. |
| `http://localhost:5035/orders/{orderId}/rating` | `GET`/`POST` – hent eller lagre vurderingen av en ferdig bestilling. |
| `http://localhost:5035/users` | `POST` – opprett en bruker med `name` i JSON-body. |
| `http://localhost:5035/users/{userId}` | `DELETE` – slett brukeren med angitt ID. |
| `http://localhost:5035/users/{userId}/weekly-summary` | `GET` – hent ukas vurderingsoppsummering. |
| `http://localhost:5035/openapi/v1.json` | Den **automatisk genererte** OpenAPI-spesifikasjonen (code-first). |
| `http://localhost:5035/scalar/v1` | **Scalar** – interaktivt UI for å utforske og teste alle endepunkter. |

Du kan også bruke [`Kaffebar/Kaffebar.http`](./Kaffebar/Kaffebar.http) til å sende requests direkte fra VS Code.

`POST /orders` returnerer `201 Created`, en `Location`-header med
`/orders/{orderId}` og den opprettede ordren. Ordrene lagres i minnet og
tilbakestilles når API-et starter på nytt. `GET /orders` støtter filtrering på
status og paginering med `limit` og `offset`. `PATCH /orders/{orderId}` flytter
ordren ett steg gjennom `PENDING` → `BREWING` → `READY`.

En ferdig bestilling kan vurderes med `POST /orders/{orderId}/rating` og hentes
med `GET /orders/{orderId}/rating`. Vurderinger kan oppdateres ved å sende en ny
POST for samme ordre. `GET /users/{userId}/weekly-summary` viser statistikk for
inneværende uke regnet fra mandag i UTC. Denne workshopen har ikke innlogging:
alle demo-bestillinger tilhører demo-brukeren
`22222222-2222-2222-2222-222222222222`. Vurderinger og statistikk lagres i minnet.

`POST /users` krever et navn på 1–100 tegn og returnerer `201 Created`, brukerens
`id` og `name`, og en `Location`-header med `/users/{id}`. En tom eller ugyldig
forespørsel returnerer `400 Bad Request`. Brukerdataene ligger i minnet og
tilbakestilles når API-et starter på nytt.

`DELETE /users/{userId}` returnerer `204 No Content` når brukeren slettes, eller
`404 Not Found` hvis brukeren ikke finnes. Starteren har én demo-bruker med ID
`22222222-2222-2222-2222-222222222222`; brukerdataene ligger i minnet og
tilbakestilles når API-et starter på nytt. Se [`Kaffebar/Kaffebar.http`](./Kaffebar/Kaffebar.http)
for et kall du kan prøve.

## Struktur

```
kaffebar-dotnet/
├── Kaffebar/
│   ├── Program.cs          # Hele API-et bor her (Minimal API)
│   ├── Kaffebar.http       # Testkall fra VS Code
│   ├── Kaffebar.csproj     # Prosjektfil + NuGet-pakker
│   └── Properties/
│       └── launchSettings.json
├── oppgave.md              # Workshop-oppgavene
└── README.md
```

Lykke til – og god kaffe! ☕
