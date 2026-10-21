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
| `http://localhost:5035/menu` | Hello Coffee – kaffemenyen fra starteren. |
| `http://localhost:5035/users/active` | Alle aktive brukere som en JSON-liste. |
| `http://localhost:5035/openapi/v1.json` | Den **automatisk genererte** OpenAPI-spesifikasjonen (code-first). |
| `http://localhost:5035/scalar/v1` | **Scalar** – interaktivt UI for å utforske og teste alle endepunkter. |

Du kan også bruke [`Kaffebar/Kaffebar.http`](./Kaffebar/Kaffebar.http) til å sende requests direkte fra VS Code.

## Aktive brukere

`GET /users/active` returnerer `200 OK` med alle brukere der `IsActive` er `true`.
Hver bruker har feltene `id`, `name` og `isActive`. Hvis ingen er aktive,
returneres `[]`.

Brukerne lagres kun i minnet, med faste eksempeldata registrert i
[`Program.cs`](./Kaffebar/Program.cs): Ada og Grace er aktive, Linus er inaktiv.
Det finnes foreløpig ingen endepunkter for å opprette eller endre brukere.

## Tester

Kjør fra `kaffebar-dotnet`:

```bash
dotnet build Kaffebar.Tests/Kaffebar.Tests.csproj --no-incremental -warnaserror
dotnet test Kaffebar.Tests/Kaffebar.Tests.csproj --no-build --no-restore
```

Kjør testkommandoen bare etter et vellykket bygg. Bygg må ha null advarsler og
null feil; `Directory.Build.props` behandler kompilator- og NuGet-advarsler som
feil for både API-et og testprosjektet. `-warnaserror` dekker også MSBuild-advarsler.

Integrasjonstestene dekker filtrering av aktive/inaktive brukere, tomme lister,
at alle aktive brukere returneres, JSON-format, eksempeldata, OpenAPI, Scalar og menyen.

Scalar er GUI-et for dokumentasjon og testing. `Microsoft.AspNetCore.OpenApi`
genererer spesifikasjonen og krever `Microsoft.OpenApi` transitivt; disse er
ikke Swagger UI-pakker. Generatorversjon 10.0.13 bruker `Microsoft.OpenApi`
2.12.2, som inkluderer rettelsen for
[GHSA-v5pm-xwqc-g5wc](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc).
Det er ikke lagt til noen direkte referanse til `Microsoft.OpenApi`.

## Struktur

```
kaffebar-dotnet/
├── Kaffebar/
│   ├── Program.cs          # Oppsett og menyendepunkt (Minimal API)
│   ├── Endpoints/          # Brukerendepunkt
│   ├── Models/             # Brukermodell og respons-DTO
│   ├── Services/           # Brukerfiltrering og minnelagring
│   ├── Kaffebar.http       # Testkall fra VS Code
│   ├── Kaffebar.csproj     # Prosjektfil + NuGet-pakker
│   └── Properties/
│       └── launchSettings.json
├── Kaffebar.Tests/         # Integrasjonstester
├── oppgave.md              # Workshop-oppgavene
└── README.md
```

Lykke til – og god kaffe! ☕
