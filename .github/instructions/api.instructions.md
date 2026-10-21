---
description: "Bruk for API-arbeid i 3-APIs, inkludert Kaffebar-endepunkter, kontrakter og tester."
applyTo: "3-APIs/**"
---

- Bruk .NET 10 for .NET-prosjektene.
- Hold API-eksemplene i `Kaffebar.http` oppdatert når endepunkter endres.

Testing:

- API solution: `dotnet test Kaffebar.Tests/Kaffebar.Tests.csproj --filter "FullyQualifiedName~CreateOrder_Returns201WithLocation"` fra `3-APIs/kaffebar-dotnet-solution`.
- Starteren `3-APIs/kaffebar-dotnet` har ikke egen testpakke; kjør `dotnet build` fra `3-APIs/kaffebar-dotnet/Kaffebar`.
