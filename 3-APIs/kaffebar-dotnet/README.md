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
| `http://localhost:5035/orders` | `POST` – opprett en bestilling med `coffeeId` i JSON-body. |
| `http://localhost:5035/openapi/v1.json` | Den **automatisk genererte** OpenAPI-spesifikasjonen (code-first). |
| `http://localhost:5035/scalar/v1` | **Scalar** – interaktivt UI for å utforske og teste alle endepunkter. |

Du kan også bruke [`Kaffebar/Kaffebar.http`](./Kaffebar/Kaffebar.http) til å sende requests direkte fra VS Code.

`POST /orders` returnerer `201 Created`, en `Location`-header med
`/orders/{orderId}` og et JSON-objekt med `orderId` og `coffeeId`.
Ordren lagres foreløpig ikke, og henting av en ordre implementeres i en senere oppgave.

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
