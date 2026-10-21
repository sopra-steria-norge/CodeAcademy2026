---
name: nytt-endepunkt
description: 'Opprett nye REST-endepunkter i dette repoet etter mønstrene i Kaffebar-API-ene. Bruk når du skal legge til eller endre en HTTP-rute, request/response-kontrakt eller API-test.'
---

# Lage et nytt REST-endepunkt

Følg stegene for å legge til et endepunkt uten å endre API-stil eller implementere senere oppgaver utilsiktet.

1. Les den lokale `README.md` og `oppgave.md` for API-prosjektet du skal endre. Følg backend-valget i oppgaven og prosjektet; hvis begge backend-alternativene er aktuelle og oppgaven ikke velger, bruk .NET. Ikke kopier inn løsningen fra `-solution`-prosjektene i en starter.
2. Undersøk eksisterende ruter, modeller, lagring, feilhåndtering og tester i samme prosjekt. Legg endepunktet der de relaterte rutene allerede er implementert: som Minimal API i `Program.cs` for starteren, eller i riktig controller for controller-baserte API-er.
3. Definer HTTP-metode og ressursrute ut fra operasjonen. Bruk statuskoder og svarformat som passer kontrakten: for eksempel `200 OK` for lesing, `201 Created` med ressursens `Location` ved opprettelse, `400 Bad Request` for ugyldig input og `404 Not Found` når ressursen ikke finnes.
4. Bruk prosjektets eksisterende request- og response-typer, validering, avhengighetsinjeksjon og lagrings-/tjenestelag. Ikke legg forretningslogikk i ruten dersom prosjektet allerede har et passende lag for den.
5. Dokumenter endepunktet med OpenAPI-metadata i samme stil som naboendepunktene. I .NET Minimal API brukes blant annet `.WithName`, `.WithSummary` og `.WithDescription`; i controllere brukes prosjektets attributter for sammendrag, beskrivelse og responskoder.
6. Oppdater relevante tester for suksess, valideringsfeil og manglende ressurser når prosjektet har et testoppsett. Legg til kall i prosjektets `Kaffebar.http` når den finnes. Følg testoppsettet i prosjektets README eller rotens `.github/copilot-instructions.md`.
7. Kjør relevante tester før du avslutter. For `3-APIs/kaffebar-dotnet-solution`, kjør `dotnet test Kaffebar.Tests/Kaffebar.Tests.csproj` fra løsningsmappen. Starteren `3-APIs/kaffebar-dotnet` har ikke egen testpakke; kjør `dotnet build` fra `3-APIs/kaffebar-dotnet/Kaffebar` for å verifisere den.
