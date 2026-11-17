# Fasit: Kaffebaren, ORM med EF Core (samling 6)

> ⚠️ Kun for kursholder. Ikke del denne mappen med deltakerne.

Dette er løsningen på oppgavene i [`../oppgaver.md`](../oppgaver.md), som komplette og kjørbare .NET
10-løsninger med EF Core 10 og Postgres. `nivaa-1` til `nivaa-4` inneholder hver sin løsning, og
`nivaa-4` har alt. Lenkene under peker dit.

Dokumentet følger **oppgavene**, ikke koden. Du får én seksjon per oppgave, i samme rekkefølge som
oppgaver.md, slik at det kan brukes som manus når vi går gjennom løsningen på storskjerm. Hver
oppgave har sin egen fil i koden, så lenkene under hver seksjon er hele løsningen for den oppgaven.

```bash
cd losninger/nivaa-4
dotnet tool restore                                   # henter dotnet-ef (lokalt verktøy, låst til 10.0.12)
dotnet test                                           # 28 tester: 24 for nivåene og 4 valgfrie, én Postgres-container per testklasse
dotnet test --logger "console;verbosity=detailed"     # samme, men med SQL-en og kvitteringene i terminalen
dotnet test --filter Level2B --logger "console;verbosity=detailed"   # bare én oppgave
dotnet test --filter Optional                         # bare de valgfrie oppgavene
```

`--filter Level2B` treffer alle tester med `Level2B` i navnet. Testnavnene starter med
oppgave-id-en (`Level1A_…`, `Level2B_…`, `Level4A_…`), så filteret er alltid oppgave-id-en.
`--filter Level2` gir hele nivå 2.

Testene **er** oppgavene. Det finnes ingen `Program.cs`, ingen ASP.NET og ingen DI. Du har
en connection string, en `DbContext` og EF Core, og ingenting annet. Det er .NET-varianten av
«vi har strippet vekk all Spring-magi».

### Hvor kommer Postgres fra?

Fra Testcontainers. Hver testklasse starter sin egen `postgres:18-alpine`, kjører migreringene
og seeder 100 ordrer. Oppgavene på nivå 3 og 4 endrer data, og det skal ikke ødelegge tallene i nivå 1.

Testcontainers trenger bare noe som snakker Docker-API-et, og det finner
[`ContainerRuntime.cs`](nivaa-4/Kaffebar.Orm.Tests/ContainerRuntime.cs) selv, i denne rekkefølgen:

| # | Hva | Hvor |
| --- | --- | --- |
| 1 | `DOCKER_HOST` er satt | Vinner alltid, vi rører ingenting |
| 2 | En Podman machine som **kjører** (macOS/Windows) | `podman machine list` finner maskinen, `podman machine inspect <navn>` gir socketen (macOS) eller named pipen (Windows, gjøres om til `npipe://./pipe/…`) |
| 3 | Podman på Linux | `$XDG_RUNTIME_DIR/podman/podman.sock` |
| 4 | Docker Desktop | `~/.docker/run/docker.sock` |
| 5 | Rancher Desktop (dockerd/moby-modus) | `~/.rd/docker.sock` |
| 6 | Colima | `~/.colima/default/docker.sock` |
| 7 | Standard socket | `/var/run/docker.sock` |
| 8 | Ingen av delene svarer | Testcontainers sine egne standarder. På Windows er det Docker Desktop sin named pipe, som også Rancher Desktop kan tilby |

Hvilken som ble valgt, står øverst i utskriften fra `Level1A`, også før testen er grønn: `Kjørt mot Podman machine «…» (…)`.

**Hver socket prøves med en ekte tilkobling, ikke bare `File.Exists`.** En socket-fil blir
liggende etter at Docker eller Podman er stoppet, og en død socket skal ikke vinne over en levende
lenger ned i lista. Av samme grunn spør vi etter Podman-maskinen som *kjører*: en stoppet maskin
har fortsatt en socket-fil, og `podman machine inspect` uten navn svarer med standardmaskinen
selv når den er stoppet.

Med Podman skrus **Ryuk** av (Testcontainers sin oppryddercontainer, som Podman kjører dårlig),
både på Unix-socketen og på Windows-pipen, og når `DOCKER_HOST` inneholder «podman». Containerne
ryddes i `PostgresFixture.DisposeAsync`. Avbryter du en testkjøring midt i, blir de derfor
liggende. Se «De vanligste feilene».

`DOCKER_HOST` er ikke nødvendig for noen av de vanlige oppsettene. Det er en manuell overstyring
når du har en runtime på et uvanlig sted, eller flere samtidig og vil velge selv.

**Ingen container-runtime i det hele tatt?** Sett `KAFFEBAR_POSTGRES` til en connection string
mot en Postgres du har selv. Fixturen lager da en egen database per testklasse
(`kaffebar_<guid>`) og sletter den etterpå med `DROP DATABASE … WITH (FORCE)`.

```bash
KAFFEBAR_POSTGRES="Host=localhost;Username=postgres;Password=postgres" dotnet test
```

---

## Det store bildet først

Java-sporet har de samme fire nivåene og de samme oppgave-ID-ene, med Hibernate. Mye er likt, men noen
steder oppfører EF Core seg **motsatt**, eller så finnes ikke fella i det hele tatt. Der har vi tilpasset
oppgaven, og brukt EF sin egen felle der den finnes.

| Java-oppgaven (Hibernate/JPA) | EF Core | Hva det betyr for oppgaven |
| --- | --- | --- |
| Samlinger (`@OneToMany`) er lazy som standard. `@ManyToOne` er EAGER som standard i JPA, men Java-oppgaven setter dem eksplisitt til `LAZY`, så de hentes med egne SELECT-er når du bruker dem. N+1 kommer «gratis» | **Ingen** lazy loading og ingen eager loading som standard. Navigasjonene er tomme til du ber om dem | 1A: stille tomme data. 1B: N+1 krever `UseLazyLoadingProxies()` |
| Loggerne `org.hibernate.SQL` og `org.hibernate.orm.jdbc.bind` | `LogTo(...)` + `EnableSensitiveDataLogging()`, `ToQueryString()` | Forarbeid |
| `QueryCountLogger` | Finnes ikke, så vi har en egen `DbCommandInterceptor` | [`QueryCounter.cs`](nivaa-4/Kaffebar.Orm/Data/QueryCounter.cs), ferdig skrevet |
| `JOIN FETCH` | `Include/ThenInclude` | 2A |
| `EntityGraph` | En gjenbrukbar `Include`: en hente-plan som defineres én gang og legges på spørringer | 2A |
| DTO-spørring (`SELECT new …Dto(...)` i JPQL) | Projeksjon med `Select` | 2A |
| `FetchType.EAGER` på entiteten | `Navigation(...).AutoInclude()` | Refleksjon i nivå 2 |
| Kartesisk produkt → `MultipleBagFetchException` | Ingen exception, bare kartesisk eksplosjon og en advarsel | 2B: `AsSplitQuery()` |
| Dirty checking + auto-flush ved commit | Dirty checking, men lagrer **kun** ved `SaveChanges()`. Da lagres til gjengjeld **alt** som er sporet | Oppgave 3A er skrevet om rundt dette |
| `@Version` / `OptimisticLockException` | `[Timestamp] uint Version` → Postgres `xmin` / `DbUpdateConcurrencyException` | 4A |
| `em.createNativeQuery(...)` | `Database.SqlQuery<T>($"...")` | 4B |
| `doReturningWork` + JDBC | `GetDbConnection()` + `DbCommand` | Bonus i 4B |
| JPQL bulk `UPDATE` | `ExecuteUpdateAsync` / `ExecuteDeleteAsync` | 3C |
| `mappedBy` og eiersiden, `orphanRemoval` | Ingen eierside: fix-up holder begge sider i takt. Påkrevd fremmednøkkel gir sletting | 2C |
| `em.getReference(...)` | Sett fremmednøkkelen (`BeanId`) direkte | 2C |
| `LazyInitializationException` fra Jackson | Tomme samlinger, eller `InvalidOperationException` etter at contexten er disposet | 3B |
| `em.merge(...)` på en detached entitet | `db.Update(...)`, som også skriver alle kolonnene, og hele grafen | 3D |
| `If-Match` + `ExceptionMapper` | `OriginalValue` på versjonen. HTTP-delen er en refleksjon, fordi vi ikke har noe API | 4A |
| Flush før native query, ikke før JDBC | Ingen automatisk flush i det hele tatt | 4B |
| `hibernate.jdbc.batch_size`, `order_inserts` | Batching og sortering er på som standard. `ChangeTracker.Clear()` i stedet for `flush()`/`clear()` | 4C |

### Velg din sti (samme spor som Java, men «Fersk» kan fortsette på nivå 3)

* **Fersk på EF Core?** Ta nivå 1 og 2. Ferdig før tiden? Fortsett med nivå 3.
* **Erfaren, men rusten på detaljene?** Ta nivå 2 og 3.
* **ORM-veteran?** Hopp rett til nivå 3 og 4.

### Filene, kort

```
losninger/nivaa-4/
├── dotnet-tools.json                 # dotnet-ef 10.0.12 som lokalt verktøy
├── KaffebarOrm.slnx
├── Kaffebar.Orm/
│   ├── Domain/                       # Order, OrderLine, Bean, Roastery, StatusChange, enums
│   ├── Data/
│   │   ├── KaffebarDbContext.cs      # Fluent-konfig: presisjon, enums som tekst, relasjoner
│   │   ├── KaffebarDb.cs             # DET ene stedet en context konfigureres (logging, teller, lazy loading)  ← 1B
│   │   ├── QueryCounter.cs           # teller spørringer, kommandoer og rader
│   │   ├── SeedData.cs               # 6 brennerier, 15 bønner, 100 ordrer, deterministisk
│   │   └── DesignTimeDbContextFactory.cs
│   ├── Migrations/                   # InitialCreate + AddOrderVersion  ← 4A
│   ├── KaffebarRepository.cs         # felles: konstruktør, UpdateStatusAsync, GetOrderAsync (ferdig skrevet)
│   ├── KaffebarRepository.Level1A.cs … Level4C.cs   # én fil per oppgave (partial class)
│   ├── Receipts.cs                   # 1A
│   ├── Campaign.cs                   # 3A: prisregelen som ren funksjon
│   └── Dtos.cs                       # ReceiptDto, CampaignReceipt, PickupResult, BeanSalesRow
└── Kaffebar.Orm.Tests/
    ├── ContainerRuntime.cs           # finner Podman/Docker/Rancher/Colima
    ├── PostgresFixture.cs            # container, migrering, seed
    └── Level1Tests.cs, Level2Tests.cs, Level2CTests.cs, Level3Tests.cs, Level3BTests.cs, Level3CTests.cs,
        Level3DTests.cs, Level4ATests.cs, Level4AClientVersionTests.cs, Level4BTests.cs, Level4CTests.cs
```

**`KaffebarRepository` er en `partial class`, én fil per oppgave.** Det er ikke slik man ville
organisert et ekte repository. Det er slik at en deltaker som står fast, kan få fasiten for én oppgave
som én hel fil uten å røre de andre (se «Står noen fast?»).

### Dataene

[`SeedData.cs`](nivaa-4/Kaffebar.Orm/Data/SeedData.cs) er deterministisk (`new Random(2026)` og faste
datoer), så tallene i loggen din er de samme som naboens:

| | Antall |
| --- | --- |
| Brennerier | 6 (Tim Wendelboe, Kaffa, Fuglen, Supreme Roastworks, Solberg & Hansen, Jacobsen & Svart) |
| Bønner | 15, 2–3 per brenneri |
| Ordrer | 100 |
| Ordrelinjer | 250 (1–4 per ordre) |
| Statusendringer | 393 |

De fire første ordrene er håndlaget og har de samme kundene som i samling 3: **Ada** (Ready, Tim
Wendelboe, 52 kr), **Kari** (Brewing, Kaffa, ingen kampanje), **Jonas** (Ready, brukes i 4A)
og **Ingrid** (Pending, 226 kr: 3 × Mocha fra Fuglen og én Filterkaffe fra Tim Wendelboe). De
øvrige 96 er hentet og ligger spredt over seks hele måneder, mars til august 2026, slik at
rapporten i 4B har flere måneder å jobbe med.

Menyen er den samme som i samling 3, minus Chai Latte. Den har ingen kaffebønner.

---

## Forarbeid (nivå 0)

**Løsningen:** ingen kode, bare å se seg rundt.

📄 [`Data/KaffebarDb.cs`](nivaa-4/Kaffebar.Orm/Data/KaffebarDb.cs)
📄 [`Data/KaffebarDbContext.cs`](nivaa-4/Kaffebar.Orm/Data/KaffebarDbContext.cs)
📄 [`Data/QueryCounter.cs`](nivaa-4/Kaffebar.Orm/Data/QueryCounter.cs)

```csharp
builder
    .LogTo(logSql,
        [DbLoggerCategory.Database.Command.Name, DbLoggerCategory.Query.Name],
        LogLevel.Information)
    .EnableSensitiveDataLogging();
```

**Verdt å stoppe opp ved:**

**`LogTo` er `show_sql`, men bedre.** Du får SQL-en, parameterverdiene og hvor lenge kommandoen
tok. Kategorifilteret er med vilje: uten det drukner SQL-en i change tracker-meldinger. `Query`-
kategorien er med fordi det er der EF sier fra om ting som `MultipleCollectionIncludeWarning`
(2B).

**`EnableSensitiveDataLogging` viser verdiene i stedet for `?`.** Det er uvurderlig lokalt og
uakseptabelt i produksjon, der det skriver kundenavn og priser rett i loggen.

**`ToQueryString()` viser SQL-en uten å kjøre den.** `db.Orders.Include(o => o.Lines).ToQueryString()`
er det raskeste svaret på «hva gjør EF egentlig her?».

**Tre valg i `OnModelCreating` som er verdt en kommentar:**

- **Enums lagres som tekst** (`HasConversion<string>()`). `PickedUp` er lesbart i DBeaver og i rå
  SQL, `3` er det ikke. Prisen er at rå SQL må bruke `'PickedUp'`, ikke `'PICKED_UP'` og ikke `3`.
- **`HasPrecision(10, 2)` på beløp.** Uten den blir `decimal` til `numeric` uten skala i Postgres.
- **snake_case** via `UseSnakeCaseNamingConvention()` (pakken `EFCore.NamingConventions`). `Order.CreatedAt`
  blir `orders.created_at`. Det er ikke kosmetikk. Det er det som gjør den rå SQL-en i 4B
  lesbar i stedet for `"Orders"."CreatedAt"` overalt.

**`QueryCounter` er ferdig skrevet, men verdt et blikk.** Den teller kommandoer (`CommandCount`),
lesende spørringer (`SelectCount`, også de som starter med en CTE, `WITH`) og rader
(`RowsRead`). Radene telles ved å pakke inn `DbDataReader`-en og telle hver `Read()`, fordi EF sin
egen `ReadCount` ikke ser alle readerne ved split queries. Bare spørringer pakkes inn: Npgsql sin
batching i `SaveChanges` forventer en ekte `NpgsqlDataReader`, og kaster `InvalidCastException`
hvis den får vår.

**Migreringene kjøres av testene, ikke av deg.** `PostgresFixture` kaller `Database.MigrateAsync()`.
Vil du se SQL-en de lager: `dotnet ef migrations script --project Kaffebar.Orm`.

---

## Nivå 1: Den naive kvitteringen

### Oppgave 1A: Ordrene, og ingenting annet

**Løsningen:** hent ordrene. Skriv ut kvitteringen.

📄 [`KaffebarRepository.Level1A.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level1A.cs)
📄 [`Receipts.cs`](nivaa-4/Kaffebar.Orm/Receipts.cs)
🧪 `Level1Tests.Level1A_NaiveQuery_ReturnsOrdersWithoutLines`

```csharp
public Task<List<Order>> GetAllOrdersAsync() =>
    db.Orders.OrderBy(o => o.CreatedAt).ToListAsync();
```

```csharp
foreach (var order in orders)
{
    write($"{order.CustomerName} ({order.Status}) – {order.TotalPrice} kr");
    foreach (var line in order.Lines)
        write($"    {line.Quantity} × {line.DrinkName} ({line.Size}) – {line.Bean.Name} fra {line.Bean.Roastery.Name}");
}
```

**Resultatet:** 100 kvitteringer, 1 spørring, **null linjer**. Ingen exception, ingen advarsel.

**Verdt å stoppe opp ved:**

**Dette er EF sin felle, og den er den motsatte av Hibernate sin.** I Java gir den samme koden
N+1: Hibernate henter linjene i det øyeblikket du rører `getLinjer()`. EF Core laster aldri noe du
ikke har bedt om. `Lines` er initialisert til `[]` i entiteten, så løkka kjører null ganger, og
kvitteringen ser helt normal ut, bare uten kaffe.

**Hvorfor ingen `NullReferenceException`?** Fordi `line.Bean` aldri blir lest: det finnes ingen
linjer. Hadde `Lines` ikke vært initialisert, ville du fått en `NullReferenceException` på
`order.Lines`, og det er faktisk bedre, fordi du hadde *merket* det. Den tomme lista er stillere.

**Testen asserter på fella.** `Assert.All(orders, order => Assert.Empty(order.Lines))` er ikke en
bug i testen. Den dokumenterer oppførselen, slik at ingen tror at dette virker.

### Oppgave 1B: Skru på lazy loading, og møt N+1

**Løsningen:** én linje i `KaffebarDb.Create`, og `virtual` på navigasjonene (ligger der allerede).

📄 [`Data/KaffebarDb.cs`](nivaa-4/Kaffebar.Orm/Data/KaffebarDb.cs)
🧪 `Level1Tests.Level1B_LazyLoading_FillsTheReceipts_OneQueryAtATime`

```csharp
if (lazyLoading)
    builder.UseLazyLoadingProxies();
```

**Resultatet:** kvitteringene har linjer, og det kostet **122 SELECT-spørringer** for 100 ordrer.

**Verdt å stoppe opp ved:**

**Hvor kommer 122 fra?** Ikke fra 1 + 100 + 250 + 250, som man kanskje ville tippet (én spørring for
ordrene, én per ordre for linjene, og én per linje for bønnen og for brenneriet):

| Spørringer | Hva |
| ---: | --- |
| 1 | Alle ordrene |
| 100 | `order.Lines`: én per ordre, som henter alle linjene til den ordren |
| 15 | `line.Bean`: én per **unik** bønne |
| 6 | `bean.Roastery`: én per **unikt** brenneri |
| **122** | |

Grunnen til at det ikke blir 250 bønne-oppslag, er **identity resolution** og **relationship
fixup**. Change trackeren holder én instans per primærnøkkel (Identity Map-mønsteret). Når bønne
#3 er lastet én gang og en ny linje med `BeanId = 3` kommer inn, kobler EF `line.Bean` til den
instansen den allerede har. Proxyen ser at navigasjonen er lastet, og spør ikke igjen. Hibernate
gjør det samme med sin første-nivå-cache i sesjonen.

Det er likevel N+1: antallet spørringer vokser med antall ordrer.

**Hvorfor `virtual`?** `UseLazyLoadingProxies()` lager en runtime-subklasse av hver entitet
(`Castle.Proxies.OrderProxy`) som overstyrer navigasjonene og legger inn et lastekall. Det går
bare med `virtual`. Mangler det på én eneste navigasjon, feiler modellbyggingen med en gang, ikke
bare for den ene entiteten.

**Lazy loading virker bare så lenge contexten lever.** Rører du `order.Lines` etter at contexten er
disposet, får du en `InvalidOperationException` (`LazyLoadOnDisposedContextWarning`, som EF
kaster som standard). I et API skjer det når en entitet forlater contexten sin og blir serialisert senere.
Med en scoped context lever contexten gjennom hele requesten, og da sender serialiseringen nye spørringer i
stedet (se 3B).

### Refleksjon i par, nivå 1

**Hvorfor er EF sin standard motsatt av Hibernate sin?** Fordi EF-teamet valgte at **alle
databasekall skal være synlige i koden**. En `foreach` over en egenskap skal ikke kunne sende en
spørring over nettverket. Lazy loading var standard i det gamle Entity Framework 6, og N+1 var den
vanligste ytelsesfeilen der. I EF Core er det et bevisst tilvalg med egen pakke. Prisen er 1A: gjør
du ingenting, får du tomme data i stedet for trege data.

**Hva skjer på fredag ettermiddag med 10 000 ordrer?**

- **Med 1A:** ingenting dramatisk. Det er én spørring, og den er rask. Problemet er ikke ytelse,
  det er **korrekthet**: rapporten er feil, og ingen merker det før sjefen spør hvorfor Tim
  Wendelboe ikke har solgt noe. Stille, feile data er verre enn en treg side, fordi en treg side i
  det minste ser du.
- **Med 1B:** 1 + 10 000 + (bønner) + (brennerier), altså rundt 10 000 rundturer til databasen.
  Lokalt, med Postgres i en container på samme maskin, er det noen sekunder. Mot en database i
  skyen med 1–2 ms latens per rundtur er det 10–20 sekunder, bare i ventetid. I tillegg sporer
  change trackeren hver eneste entitet med en kopi av originalverdiene (for dirty checking), så
  minnet vokser lineært med alt du rører.

**`orders[0].GetType()`** gir `Castle.Proxies.OrderProxy`: subklassen EF lagde under kjøring. Det er
motparten til Hibernate-proxyen du ser i Java-sporet med `getBrenneri().getClass()`.

**Uten `EnableSensitiveDataLogging()`** ser du parameternavnene (`@orderId`), men ikke verdiene. I
produksjon ville den skrevet kundenavn og priser rett i loggen.

---

## Nivå 2: Ta tilbake kontrollen

Ingen av testene i nivå 2 bruker kode fra nivå 1, så du kan starte rett her.

### Oppgave 2A: `Include`, EF sin `JOIN FETCH`

📄 [`KaffebarRepository.Level2A.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level2A.cs)
🧪 `Level2Tests.Level2A_Include_LoadsTheWholeReceiptInOneQuery`

```csharp
db.Orders
    .Include(o => o.Lines)
        .ThenInclude(l => l.Bean)
            .ThenInclude(b => b.Roastery)
    .OrderBy(o => o.CreatedAt)
    .ToListAsync();
```

**1 spørring.** Testen sjekker at alle ordrene har linjer, at hver linje har bønne *og* brenneri
lastet, og `Assert.Equal(1, counter.SelectCount)`. Java-oppgaven har den samme ytelsestesten
(`kvitteringKreverBareEnSporring`), bare med `QueryCountLogger` i stedet for vår egen teller.

**`EntityGraph` sin motpart** er en `Include`-kjede du gjenbruker, for eksempel som en
utvidelsesmetode `IQueryable<Order> WithReceiptDetails(this IQueryable<Order> q)`. Selve
mekanismen er den samme: en hente-plan som legges på spørringen, ikke på entiteten.

#### Del 2: Projeksjon, det idiomatiske alternativet

🧪 `Level2Tests.Level2A_Projection_LoadsTheWholeReceiptInOneQuery`

```csharp
db.Orders
    .OrderBy(o => o.CreatedAt)
    .Select(o => new ReceiptDto(
        o.CustomerName, o.Status, o.TotalPrice,
        o.Lines.Select(l => new ReceiptLineDto(
            l.Quantity, l.DrinkName, l.Size, l.Bean.Name, l.Bean.Roastery.Name)).ToList()))
    .ToListAsync();
```

**Også 1 spørring**, men uten `Include`. EF ser hvilke navigasjoner du bruker i `Select`, og joiner
dem selv. Testen sjekker også at `db.ChangeTracker.Entries()` er tom: en projeksjon gir ingen
entiteter, og derfor ingenting å spore.

I Java-verdenen tilsvarer dette en DTO-spørring med konstruktøruttrykk i JPQL
(`SELECT new no.….KvitteringDto(b.kunde, …) FROM Bestilling b JOIN …`), ikke `EntityGraph`.

**Hvilken skal man velge?**

| | `Include` | Projeksjon |
| --- | --- | --- |
| Henter | Alle kolonnene i alle tabellene | Bare de du ber om |
| Sporing | Alt havner i change trackeren | Ingenting |
| Når | Du skal **endre** grafen og lagre den | Du skal **vise** noe |

En lesemodell som ikke *kan* lagres ved et uhell. Hold på den tanken til oppgave 3A.

### Oppgave 2B: To søskensamlinger, og det kartesiske produktet

📄 [`KaffebarRepository.Level2B.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level2B.cs)
🧪 `Level2Tests.Level2B_TwoCollections_DoNotMultiplyTheRows`

```csharp
db.Orders
    .Include(o => o.Lines).ThenInclude(l => l.Bean).ThenInclude(b => b.Roastery)
    .Include(o => o.StatusHistory)
    .OrderBy(o => o.CreatedAt)
    .AsSplitQuery()
    .ToListAsync();
```

Målt mot seed-dataene (743 rader med faktiske data: 100 ordrer + 250 linjer + 393 statusendringer):

| | Spørringer | Rader fra databasen |
| --- | ---: | ---: |
| Uten `AsSplitQuery()` | 1 | **990** |
| Med `AsSplitQuery()` | 3 | **743** |

Uten split blir hver ordre til *linjer × statusendringer* rader, fordi to uavhengige `LEFT JOIN`
multipliserer hverandre. Testen asserter `RowsRead <= orders + lines + history` og feiler med
«Databasen sendte 990 rader for 743 rader med data.». Under `── Kommandoer til databasen` står én
`SELECT` med 26 kolonner og 990 rader, mot tre spørringer med til sammen 743 rader etter fiksen.

**Verdt å stoppe opp ved:**

**EF kaster ikke, den advarer.** Hibernate gir `MultipleBagFetchException` på to `List`-samlinger i
samme `JOIN FETCH`. EF kjører spørringen og logger `MultipleCollectionIncludeWarning` i
`Query`-kategorien, som du ser fordi `LogTo` lytter på den. Det er lett å overse.

**Faktoren er beskjeden her, og det er seed-dataenes skyld.** Med 1–4 linjer og høyst 4
statusendringer per ordre blir det 990 mot 743, altså rundt 1,3×. Faktoren er *multiplikativ*: en
ordre med 20 linjer og 15 hendelser gir 300 rader i stedet for 35. Legg til en tredje samling, så
ganger du igjen. Alle kolonnene i `orders` blir dessuten gjentatt i hver eneste rad.

**`AsSplitQuery()` har også en pris.** Det blir tre rundturer i stedet for én, og de tre spørringene
er ikke et konsistent øyeblikksbilde med mindre de kjører i samme transaksjon (med passende
isolasjonsnivå). En ordre som får en ny statusendring mellom spørring 1 og 3, kan bli halvveis
lastet. For kvitteringer er det greit. For en revisjonsrapport er det kanskje ikke det.

**Projeksjoner har det samme problemet.** En `Select` med to samlinger gir også ett kartesisk
produkt. `AsSplitQuery()` virker der også.

**Global standard:** `UseNpgsql(cs, o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))`,
og `AsSingleQuery()` der du vil ha én. Vi har ikke gjort det, fordi poenget er å *se* forskjellen.

### Oppgave 2C: Kassa-appen skriver

**Løsningen:** domenemetoder som holder totalprisen riktig, og `Include` før du fjerner noe fra en samling.

📄 [`KaffebarRepository.Level2C.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level2C.cs)
📄 [`Domain/Order.cs`](nivaa-4/Kaffebar.Orm/Domain/Order.cs): `AddLine`, `RemoveLine`
🧪 `Level2CTests` (2 tester)

```csharp
public void AddLine(OrderLine line)
{
    Lines.Add(line);
    TotalPrice += line.UnitPrice * line.Quantity;
}

public void RemoveLine(OrderLine line)
{
    if (Lines.Remove(line))
        TotalPrice -= line.UnitPrice * line.Quantity;
}
```

```csharp
var order = await db.Orders.Include(o => o.Lines).SingleAsync(o => o.Id == orderId);
order.RemoveLine(order.Lines.Single(l => l.Id == lineId));
await db.SaveChangesAsync();
```

**Det deltakerne ser i kollegaens kode:**

| Metode | Utfall | Årsak |
| --- | --- | --- |
| `RegisterOrderAsync` | 2 linjer, totalpris **0,00 kr** i stedet for 170 kr | Ingen regner ut prisen |
| `RemoveLineAsync` | Linjen er der fortsatt, totalpris 226 kr, ingen feilmelding | `Lines` er ikke lastet, så `RemoveAll` finner ingenting |

**Verdt å stoppe opp ved:**

**Java-fellene finnes ikke her, så vi bruker EF sine.** I Java-sporet feiler `getLinjer().add(...)`
fordi `Bestillingslinje.bestilling` er eiersiden, og `em.remove(linje)` blir ignorert fordi linjen
fortsatt ligger i en samling med `cascade = ALL`. I EF virker begge deler: `Lines.Add` setter
`OrderId` gjennom fix-up, og `db.OrderLines.Remove(line)` sletter raden og fjerner linjen fra den
lastede samlingen. EF sin felle er 1A i ny drakt: en samling som ikke er lastet, er bare en tom liste.
Å fjerne noe fra den gjør ingenting, helt stille.

**Eksperimentet med `db.OrderLines.Remove(line)`.** Linjen blir slettet, men totalprisen står igjen
på 226 kr. Derfor hører regelen hjemme i en domenemetode.

**`BeanId` holder.** EF trenger bare fremmednøkkelen, så bønnen må ikke hentes først. Det er det samme
Java-sporet oppnår med `em.getReference(...)`.

### Refleksjon i par, nivå 2

**Hvorfor ikke `AutoInclude()` (EF sin `EAGER`)?**

```csharp
modelBuilder.Entity<Order>().Navigation(o => o.Lines).AutoInclude();
```

Da blir linjene med i **alle spørringer som materialiserer `Order`**, også `FindAsync`, også lister
som bare trenger kundenavnet, og også 4A, som bare skal endre én status. (En `Count()` eller en
`Select` som ikke returnerer entiteten, påvirkes ikke.) Du har flyttet beslutningen om *hva som skal
hentes* fra stedet som vet det (spørringen) til stedet som ikke vet det (modellen). Med to
`AutoInclude`-samlinger har du dessuten bygget det kartesiske produktet fra 2B inn i hver spørring.
`IgnoreAutoIncludes()` finnes, men da må alle huske å skrive det.

Samme argument som mot `EAGER` i Hibernate: **hentestrategi hører til brukstilfellet, ikke entiteten.**

**Hvor mange rader gir 4 linjer og 4 statusendringer?** 16 rader for én ordre, mot 8 rader med faktiske data.
Med en tredje samling på 3 rader blir det 48.

**Når er én stor JOIN likevel riktig?** Når hver ordre har få rader i samlingene, slik at multiplikasjonen er
liten. Også når du trenger ett konsistent øyeblikksbilde uten å åpne en transaksjon, eller når rundturene koster
mer enn de ekstra radene, for eksempel med høy latens mot databasen.

**Hva skjer med `JOIN FETCH`/`Include` på begge samlingene samtidig?** Se 2B: kartesisk produkt.
Hibernate stopper deg med en exception, EF lar deg gjøre det og advarer.

**Hvorfor virker `order.Lines.Add(...)` uten eierside?** EF har ett forhold, ikke to sider. Fix-up
holder fremmednøkkelen og begge navigasjonene i takt når `DetectChanges` kjører.

**Hva om `OrderId` var `Guid?`?** Da blir raden ikke slettet. EF setter `order_id` til `NULL`, og du
sitter igjen med en foreldreløs linje. Oppførselen følger av om fremmednøkkelen er påkrevd, ikke av et
eget flagg som `orphanRemoval`, så en liten endring i modellen endrer hva `Remove` betyr.

**Referanselikhet og `HashSet`.** Innenfor én context gir Identity Map ett objekt per rad, så
`Lines.Remove(line)` treffer riktig objekt. Med `GetHashCode` basert på `Id` ville linjen fått en annen
hash etter lagring, fordi `Id` går fra 0 til den genererte verdien, og settet ville ikke funnet den igjen.

**Hvorfor bør ikke `Lines` kunne endres utenfra?** Fordi `order.Lines.Add(...)` går forbi `AddLine`, og
da er totalprisen feil igjen. EF kan mappe til et privat felt, med `IReadOnlyList<OrderLine>` utad.

**Hvordan sikrer testen N+1?** `Assert.Equal(1, counter.SelectCount)` feiler i det noen fjerner en
`Include`. Ytelsen blir en del av testene, ikke noe man oppdager i produksjon.

---

## Nivå 3: Kampanjetabben (skrevet om for EF)

### Oppgave 3A: Kampanjekvitteringen som ikke skal lagres

**Løsningen:** projeksjon til en DTO, og prisregelen som ren funksjon.

📄 [`KaffebarRepository.Level3A.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level3A.cs)
📄 [`Campaign.cs`](nivaa-4/Kaffebar.Orm/Campaign.cs)
📄 [`KaffebarRepository.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.cs): `UpdateStatusAsync`, ferdig skrevet i starteren
🧪 `Level3Tests` (3 tester, `Level3A_…`)

#### Hvorfor Java-varianten ikke virker i EF

I Java-oppgaven har en kollega skrevet koden: den henter ordren i en transaksjon, endrer prisen og
committer, og Hibernate lagrer endringen fordi den flusher ved commit. Gjør du det samme i EF:

```csharp
await using var tx = await db.Database.BeginTransactionAsync();
var order = await db.Orders.SingleAsync(o => o.Id == id);
order.TotalPrice = 44.20m;
await tx.CommitAsync();              // ingenting blir lagret
```

skjer ingenting. EF skriver **bare** ved `SaveChanges()`. En transaksjon uten `SaveChanges()` er
en tom transaksjon. Overraskelsen fra Java-oppgaven finnes altså ikke.

Men en annen og verre overraskelse finnes: **`SaveChanges()` lagrer alt contexten sporer**, ikke
bare det du tenkte på da du skrev kallet.

#### Den naive versjonen (det deltakerne skriver først)

```csharp
public async Task<CampaignReceipt?> GenerateCampaignReceiptAsync(Guid orderId)
{
    var order = await db.Orders
        .Include(o => o.Lines).ThenInclude(l => l.Bean).ThenInclude(b => b.Roastery)
        .SingleOrDefaultAsync(o => o.Id == orderId);
    if (order is null) return null;

    var ordinary = order.TotalPrice;
    if (order.Lines.Any(l => l.Bean.Roastery.Name == Campaign.RoasteryName))
        order.TotalPrice = Math.Round(order.TotalPrice * (1 - Campaign.Discount), 2);   // «bare til visning»

    return new CampaignReceipt(order.Id, order.CustomerName, ordinary, order.TotalPrice);
}
```

De to første testene blir grønne: Ada får 44,20 kr i stedet for 52 kr, og Kari får ingen rabatt.
Metoden lagrer jo ingenting, og den *ser* uskyldig ut.

Den tredje testen simulerer én request i et API, altså én context:

```csharp
await repository.GenerateCampaignReceiptAsync(SeedData.IngridOrderId);        // vis kampanjekvittering
await repository.UpdateStatusAsync(SeedData.KariOrderId, OrderStatus.Ready);  // baristaen jobber videre
```

`UpdateStatusAsync` er ferdig skrevet, korrekt, og handler om **en helt annen ordre**. Den kaller
`SaveChangesAsync()`. Da finner change trackeren Ingrids ordre i tilstanden `Modified` og lagrer
den også. En ny context leser Ingrids ordre: **192,10 kr i databasen, ikke 226 kr.** Kampanjen har
endret historikken, og det var ikke engang kampanjekoden som gjorde det.

**Hvorfor Ingrid og ikke Ada i den tredje testen?** Alle testene i klassen deler én database. Hadde
den tredje testen brukt Ada, ville en naiv implementasjon som lagret rabatten, også veltet
`GivesDiscountOnTimWendelboe` (da er Adas «ordinære» pris plutselig 44,20), og hvilken test som
feilet, ville avhengt av rekkefølgen. Med hver sin ordre feiler nøyaktig én test, hver gang.

#### Undersøk det med `ChangeTracker.DebugView`

Testen skriver ut `DebugView.LongView` før baristaen lagrer. Med den naive koden ser du:

```
Order {Id: 0de50001-0000-4000-8000-000000000004} Modified
  ...
  TotalPrice: 192.10 Modified Originally 226.00
  ...
```

og `Bean`, `OrderLine` og `Roastery` som `Unchanged`. Det er hele feilen på én linje.

Rett under står `── Kommandoer fra UpdateStatusAsync (Kari)`, med `UPDATE orders SET total_price` ved
siden av `UPDATE orders SET status`. Baristaen lagret to ordrer, og ba bare om den ene. Den grønne
testen for Ada viser også ordren som `Modified` i change trackeren. Kari får ingen rabatt, så hennes
står som `Unchanged`.

**Legg merke til `db.ChangeTracker.DetectChanges()` rett før utskriften.** EF bruker *snapshot
change tracking*: entitetene våre er vanlige klasser som ikke sier fra når en egenskap endres. EF
oppdager endringen først når den sammenligner nåverdiene med kopien av originalverdiene, og det
skjer i `DetectChanges()`. `SaveChanges()` kaller den automatisk. `DebugView` gjør det ikke. Uten
kallet står Ingrids ordre som `Unchanged` i utskriften, selv om den blir lagret sekundet etter. Det
ville vært en forvirrende måte å lete etter feilen på.

#### Løsningen

```csharp
var order = await db.Orders
    .Where(o => o.Id == orderId)
    .Select(o => new
    {
        o.Id, o.CustomerName, o.TotalPrice,
        Eligible = o.Lines.Any(l => l.Bean.Roastery.Name == Campaign.RoasteryName)
    })
    .SingleOrDefaultAsync();

if (order is null) return null;

return new CampaignReceipt(order.Id, order.CustomerName, order.TotalPrice,
    Campaign.Apply(order.TotalPrice, order.Eligible));
```

```csharp
public static decimal Apply(decimal ordinaryPrice, bool eligible) =>
    eligible ? Math.Round(ordinaryPrice * (1 - Discount), 2) : ordinaryPrice;
```

**Verdt å stoppe opp ved:**

**Ingen entitet, ingenting å lagre.** Projeksjonen gir en anonym type, ikke en `Order`. Change
trackeren er tom etter kallet, og `DebugView` i testen viser det. Det finnes ingen senere
`SaveChanges` som kan gjøre noe galt, fordi det ikke finnes noe å gjøre det med.

**Og den henter mindre.** `Lines.Any(...)` blir en `EXISTS`-subspørring i databasen. Den naive
versjonen hentet alle linjene, alle bønnene og alle brenneriene for å svare ja eller nei.

**`Campaign.Apply` kan ikke mutere databasen, fordi den aldri ser den.** Tall inn, tall ut. Den kan
testes uten Postgres, og den kan flyttes til et domenelag uten én eneste `using Microsoft.EntityFrameworkCore`.

#### Hvorfor ikke bare `AsNoTracking()`?

```csharp
var order = await db.Orders.AsNoTracking().Include(...).SingleAsync(o => o.Id == orderId);
order.TotalPrice = ...;
```

Det fikser testen. Entiteten er *detached*, og `SaveChanges` ser den ikke. Men:

- Du har fortsatt en `Order` med feil pris i minnet. Sender noen den videre til kode som gjør
  `db.Update(order)` eller `db.Attach(order)`, er den tilbake i trackeren, og `Update` merker
  **alle** egenskaper som endret.
- Du henter fortsatt hele grafen for å svare på ett ja/nei-spørsmål.
- Det er en konvensjon («husk `AsNoTracking`»), ikke en garanti. Projeksjonen er en garanti.

`AsNoTracking()` er riktig verktøy når du trenger *entiteter* til lesing, men ikke skal endre dem. Her
trenger vi ikke entiteter i det hele tatt.

#### Refleksjon i par, nivå 3

**Hvorfor lagret EF noe vi ikke ba om? (Hva betyr «tracked»?)** En entitet du henter med en vanlig
spørring, blir **sporet** (tracked, EF sitt ord for Hibernates *managed*). Contexten er en **Unit of
Work**: den husker originalverdiene til alt den har gitt deg, og ved `SaveChanges()` sammenligner den
(dirty checking) og skriver alle forskjellene, i én transaksjon. Tilstandene er `Added`,
`Unchanged`, `Modified`, `Deleted` og `Detached`. `SaveChanges()` betyr ikke «lagre det jeg nettopp
endret». Det betyr **«gjør databasen lik alt denne contexten vet»**.

**Hvorfor lagrer ikke EF ved commit, slik Hibernate gjør?** Fordi EF skiller *transaksjonen* fra
*unit of work*. `SaveChanges()` lager sin egen transaksjon hvis det ikke finnes en, og det er det
eneste stedet endringer skrives. Du kan kalle `SaveChanges()` flere ganger i samme transaksjon, eller
bruke en transaksjon helt uten entiteter (3C). Det er mer eksplisitt, og det gjør at Java-formen av
oppgaven ikke er en felle i EF. Fella flytter seg bare til et annet sted.

**Hvordan bryter dette med Clean Architecture?** Forretningsregelen («15 % på Tim Wendelboe, kun til
visning») lå i samme objekt som persistensen. En endring i domenet var automatisk en endring i
databasen, og om den ble lagret, avhang av hva *annen* kode gjorde senere i samme request. Det er to
lag som har vokst sammen. Grepet i fasiten er tredelt:

1. **Lesemodell** (`CampaignReceipt`) som er en `record`, ikke en entitet.
2. **Ren domenelogikk** (`Campaign.Apply`) uten avhengigheter.
3. **Repository** som oversetter mellom dem og er det eneste stedet som kjenner `DbContext`.

**Context-levetid.** I ASP.NET Core registreres `DbContext` som **scoped**: én per HTTP-request. Det
er nettopp det testen simulerer med én context rundt to repository-kall. I en ekte kodebase ligger de
to kallene gjerne i hver sin service, skrevet av hver sin utvikler, og ingen av dem ser den andre. Jo
lengre contexten lever, jo mer rekker den å spore. En context som lever lenger enn en request
(singleton, static, eller en Blazor Server-krets), er en klassisk kilde til nettopp denne feilen.

**Hva beskytter DTO-en mot?** `CampaignReceipt` hindrer at kallet får tak i entiteten. Den hindrer ikke
det metoden gjorde med entiteten *før* DTO-en ble laget. Det er derfor den naive versjonen skadet
databasen selv om den returnerte en DTO.

### Oppgave 3B: Entiteter ut av datalaget

**Løsningen:** egne `record`-er for JSON-formatet, og en projeksjon rett inn i dem.

📄 [`KaffebarRepository.Level3B.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level3B.cs)
🧪 `Level3BTests` (3 tester, én av dem er grønn fra start)

```csharp
var order = await db.Orders
    .Where(o => o.Id == orderId)
    .Select(o => new OrderJson(
        o.Id, o.CustomerName, o.Status.ToString(), o.TotalPrice,
        o.Lines.OrderBy(l => l.Id)
            .Select(l => new OrderLineJson(l.Bean.Name, l.Bean.Roastery.Name, l.Quantity, l.UnitPrice)).ToList(),
        o.StatusHistory.OrderBy(s => s.ChangedAt).Select(s => s.Status.ToString()).ToList()))
    .SingleOrDefaultAsync();

return order is null ? null : JsonSerializer.Serialize(order, JsonSerializerOptions.Web);
```

**De tre stegene deltakerne går gjennom:**

| Variant | Utfall |
| --- | --- |
| Kollegaens kode | `{"id":"…","customerName":"Ingrid","status":0,"createdAt":"…","totalPrice":226.00,"lines":[],"statusHistory":[]}`, ingen feilmelding |
| `Include` alt, serialiser entiteten | `JsonException: A possible object cycle was detected`, via `OrderLine.Order` |
| Projeksjon | Riktig format, 1 spørring, 0 entiteter sporet |

**Verdt å stoppe opp ved:**

**Hvorfor ingen HTTP?** Vi har ikke noe API i denne workshopen. Java-sporet returnerer entiteten fra et
Jersey-endepunkt, og feilene oppstår i det Jackson skriver JSON. Her oppstår de i `JsonSerializer`.
ORM-lærdommen er den samme.

**Feilene er ikke de samme som i Java.** Der kaster steg 1 `LazyInitializationException`. Her er steg 1
*stille*: tomme lister, gyldig JSON og feil data. Det er verre.

**Lazy loading gjør det ikke bedre.** Målt mot Ingrids ordre: mens contexten lever, sender serialiseringen
ny SQL, og ender så i den samme `JsonException`-en. Etter at contexten er disposet, får du
`InvalidOperationException` (`LazyLoadOnDisposedContextWarning`). I ASP.NET Core lever en scoped context
gjennom hele requesten, så du kan fyre av spørringer midt i serialiseringen av svaret uten å merke det.

**`ReferenceHandler.IgnoreCycles`** fjerner unntaket, men ikke problemet. Formatet er fortsatt en
direkte kopi av databasemodellen: `createdAt`, status som tall og hele bønne-objekter. JSON-en er en
kontrakt med kassa-appen. Gir du en kolonne nytt navn, skal ikke kontrakten endre seg.

**To samlinger i én projeksjon** gir også *linjer × statuser* rader. For én ordre er det ubetydelig,
så vi lar det stå. På en liste ville du brukt `AsSplitQuery()`, som i 2B.

### Oppgave 3C (bonus): Masseoppdatering

**Løsningen:** `ExecuteUpdateAsync`, og historikken skrevet med rå SQL først, i samme transaksjon
med isolasjonsnivå `RepeatableRead`.

📄 [`KaffebarRepository.Level3C.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level3C.cs)
🧪 `Level3CTests.Level3C_StaleReadyOrders_ArePickedUp_AndTheHistoryIsKept`

```csharp
await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead);

await db.Database.ExecuteSqlAsync($"""
    INSERT INTO status_changes (order_id, status, changed_at)
    SELECT id, 'PickedUp', {now} FROM orders
    WHERE status = 'Ready' AND created_at < {cutoff}
    """);

var updated = await stale.ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.PickedUp));

await transaction.CommitAsync();
```

Målt, med de to `Ready`-ordrene i seed-dataene (Ada og Jonas):

| | Kommandoer | Rader lest inn i minnet | Entiteter sporet |
| --- | ---: | ---: | ---: |
| Last og løkke (`Where` → sett `PickedUp` + legg til `StatusChange` → `SaveChanges`) | 2 | 2 | 4 |
| Fasiten (`INSERT … SELECT` + `ExecuteUpdate`) | 2 | 0 | 0 |
| Hent id-er, `AddRange` av `StatusChange`, `ExecuteUpdate`, `SaveChanges` | 3 | – | – |

**At antallet er likt, gjelder bare fasitens `INSERT … SELECT`.** Starterens TODO hinter om
`ExecuteSqlAsync` nettopp for at historikken kan skrives uten at noe hentes først. Den mellomste
varianten mange skriver (hent id-ene, legg til historikk som entiteter, `ExecuteUpdate` på
statusen, `SaveChanges` for historikken) koster en kommando mer, og drar historikkradene gjennom
change trackeren likevel.

**Last-og-løkke har like få rundturer som fasiten.** EF *batcher* `SaveChanges`: alle `UPDATE`-ene og
`INSERT`-ene sendes samlet, så med 2 ordrer blir det én `SELECT` og én batch. N+1-refleksen «færre
rundturer» er altså ikke hovedargumentet her.

**Forskjellen er minne, sporing og skala.** Med 2 ordrer er den ubetydelig. Med 10 000 ordrer
henter løkka 10 000 rader over nettverket, materialiserer 10 000 `Order`-objekter, lager 10 000
`StatusChange`-objekter, holder 20 000 entiteter med originalverdier i change trackeren, kjører
dirty checking på alle og sender 20 000 kommandoer. EF deler dem opp i batcher etter
`MaxBatchSize`, så 20 000 kommandoer blir mange rundturer, ikke én. `ExecuteUpdate` sender én
`UPDATE` og lar databasen gjøre jobben der dataene allerede ligger. Tenk skala, ikke tallene i
testen.

**Verdt å stoppe opp ved: `ExecuteUpdate` går forbi det du lærte i 3A.**

- **Forbi change trackeren.** Ingen `StatusChange` legges til av seg selv. Derfor skriver vi
  historikken selv, og **først**, mens ordrene fortsatt har status `Ready` og `WHERE`-en treffer dem.
- **Forbi entitetene i minnet.** Har denne contexten allerede lastet Ada, står hun fortsatt som
  `Ready` i minnet etter oppdateringen.
- **Forbi domenelogikken.** Regelen «bare `Ready` kan hentes» står i `WHERE`-en, ikke i
  `MarkAsPickedUpAsync`. Du har nå to steder å vedlikeholde den.
- **Forbi versjonssjekken du møter i 4A.** `ExecuteUpdate` tar ikke med `xmin` i `WHERE`, så den
  overskriver det som står der. Men Postgres *endrer* `xmin`, så alle andre som holder en gammel
  kopi, får konflikt.

**Java-sporets stengetid-felle finnes ikke her.** Der setter en JPQL-`UPDATE` statusen, og når prisen på
en lastet entitet lagres etterpå, skriver Hibernate hele raden tilbake, inkludert den gamle statusen. Målt
i EF, med Ada: `ExecuteUpdate` setter `PickedUp`, vi trekker 10 kr på den lastede entiteten, og
`SaveChanges` skriver bare `total_price`. Databasen får `PickedUp` og 42 kr, mens entiteten i minnet
fortsatt sier `Ready`. Med versjonsfeltet fra 4A får du i stedet `DbUpdateConcurrencyException`, fordi
`xmin` er endret.

**Transaksjonen er nødvendig.** `ExecuteSqlAsync` og `ExecuteUpdateAsync` er hver sin kommando. Uten
en eksplisitt transaksjon kan historikken bli skrevet og oppdateringen feile, eller omvendt.

**Men en vanlig transaksjon er ikke nok.** Standarden i Postgres er `ReadCommitted`, og der tar
**hver setning** sitt eget øyeblikksbilde. Tenk deg at en barista setter en gammel ordre til
`Ready` og committer i det lille vinduet mellom `INSERT`-en og `UPDATE`-en vår. `INSERT`-en så ikke
ordren, men `UPDATE`-en gjør det. Ordren blir hentet uten en rad i historikken, og ingen feil
sier fra.

Med `RepeatableRead` tar transaksjonen **ett** øyeblikksbilde ved første setning, og begge
setningene ser det samme. Ordren som ble `Ready` etterpå, er usynlig for begge og blir tatt ved
neste opprydding. Prisen: blir en av *våre* rader endret og committet av noen andre underveis,
kaster Postgres en serialiseringsfeil (`40001`) på `UPDATE`-en i stedet for å skrive over. Da ruller
alt tilbake, og operasjonen kan trygt kjøres på nytt. Den er idempotent.

**Alternativet: én setning, og ingen `ExecuteUpdate`.**

```sql
WITH updated AS (
    UPDATE orders SET status = 'PickedUp'
    WHERE status = 'Ready' AND created_at < @cutoff
    RETURNING id
)
INSERT INTO status_changes (order_id, status, changed_at)
SELECT id, 'PickedUp', @now FROM updated;
```

Én setning har ett øyeblikksbilde uansett isolasjonsnivå, og historikken skrives for nøyaktig de
radene som faktisk ble oppdatert. Det er den mest robuste varianten. Vi bruker likevel
`ExecuteUpdate` i fasiten, fordi det er EF-verktøyet oppgave 3C handler om, og fordi det er
sporbart i koden (`SetProperty(o => o.Status, …)` refaktoreres sammen med modellen, SQL-strengen
gjør det ikke).

### Oppgave 3D (bonus): Den motsatte fellen

**Løsningen:** bruk bare endringen, på en nyhentet og sporet entitet.

📄 [`KaffebarRepository.Level3D.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level3D.cs)
🧪 `Level3DTests` (2 tester)

```csharp
public Task SaveOrderAsync(Order order) => UpdateStatusAsync(order.Id, order.Status);
```

**De tre stegene deltakerne går gjennom:**

| Variant | Utfall |
| --- | --- |
| Kollegaens `SaveChangesAsync()` | Ingenting lagres, ingen feilmelding. Kari står fortsatt som `Brewing`. Contexten kjenner ikke objektet |
| `db.Update(order)` | Første test grønn. Andre test rød: `Expected: 999`, `Actual: 52.00` |
| Bare endringen | Begge grønne |

`db.Update` gir denne setningen, selv om bare statusen er endret:

```sql
UPDATE orders SET created_at = @p0, customer_name = @p1, status = @p2, total_price = @p3 ...
```

**Verdt å stoppe opp ved:**

**`Update` betyr «alt er endret».** Den merker alle egenskapene som `Modified`, og går gjennom hele den
lastede grafen. Med `Lines` lastet får hver linje også sin egen `UPDATE`. Det er EF sin motpart til
`em.merge()`, med samme ulempe: du overskriver det andre har gjort siden du leste.

**Tilbake til `SaveChanges` sin returverdi.** I steg 1 returnerer den 0. Det er den eneste
tilbakemeldingen du får.

**`Attach` og `IsModified`.** `db.Attach(order)` starter sporing med tilstanden `Unchanged`, og
`db.Entry(order).Property(o => o.Status).IsModified = true` skriver bare den ene kolonnen, uten en `SELECT`
først. Det er også en god løsning. Vi bruker `UpdateStatusAsync`, fordi den finnes og tar med historikken.

**Etter 4A** ville `db.Update` på et gammelt objekt gitt `DbUpdateConcurrencyException` i stedet for å
overskrive prisen. Versjonsfeltet stopper feilen, men den riktige løsningen er fortsatt å sende bare
endringen.

---

## Nivå 4: Kollisjoner og rå kraft

### Oppgave 4A: Kollisjonen (optimistisk låsing)

**Løsningen:** `[Timestamp] uint Version`, som Npgsql mapper til Postgres sin `xmin`, en migrering,
og en `catch` som rydder opp.

📄 [`KaffebarRepository.Level4A.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level4A.cs)
📄 [`Domain/Order.cs`](nivaa-4/Kaffebar.Orm/Domain/Order.cs): `Version`
📄 [`Migrations/20260927203007_AddOrderVersion.cs`](nivaa-4/Kaffebar.Orm/Migrations/20260927203007_AddOrderVersion.cs) (+ `.Designer.cs`)
📄 [`Migrations/KaffebarDbContextModelSnapshot.cs`](nivaa-4/Kaffebar.Orm/Migrations/KaffebarDbContextModelSnapshot.cs)
🧪 `Level4ATests` (2 tester)

#### Uten versjon: siste skriver vinner

Begge baristaene laster Jonas sin ordre (status `Ready`), begge kaller `MarkAsPickedUpAsync`.
Uten et versjonsfelt blir det to `UPDATE orders SET status = 'PickedUp' WHERE id = …`, og begge
treffer én rad. Begge får `PickupResult.PickedUp`, og historikken får **to** `PickedUp`-rader. Kunden
har hentet kaffen to ganger. Testen skriver ut begge resultatene og antall rader, og feiler på
`Assert.Equal(PickupResult.Conflict, second)`.

#### Med versjon

```csharp
[Timestamp]
public uint Version { get; set; }
```

Nå tar EF med den gamle versjonen i `WHERE`: `… WHERE id = @p AND xmin = @original`. Barista 2 har
en gammel `xmin`, oppdateringen treffer 0 rader, og EF kaster `DbUpdateConcurrencyException`
(«expected to affect 1 row(s), but actually affected 0 row(s)»).

#### Migreringen som ikke gjør noe

```bash
dotnet ef migrations add AddOrderVersion --project Kaffebar.Orm
```

```csharp
migrationBuilder.AddColumn<uint>(
    name: "xmin", table: "orders", type: "xid",
    rowVersion: true, nullable: false, defaultValue: 0u);
```

Ser ut som en ny kolonne. Men:

```bash
dotnet ef migrations script InitialCreate AddOrderVersion --project Kaffebar.Orm
```

```sql
START TRANSACTION;
INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260927203007_AddOrderVersion', '10.0.12');
COMMIT;
```

**Ingen DDL.** `xmin` er en **systemkolonne** som alle rader i Postgres har fra før: id-en til
transaksjonen som sist skrev raden. Npgsql vet det, og hopper over `ADD COLUMN`. Migreringen
finnes bare fordi modellen er endret, og EF skal vite at databasen er i takt. Glemmer du den, nekter
`MigrateAsync` å kjøre (se «De vanligste feilene»).

Det er et godt eksempel på hvorfor man **leser SQL-en en migrering lager**, og ikke bare C#-en.

#### Håndteringen

```csharp
catch (DbUpdateConcurrencyException ex)
{
    foreach (var added in db.ChangeTracker.Entries<StatusChange>()
                 .Where(e => e.State == EntityState.Added).ToList())
    {
        order.StatusHistory.Remove(added.Entity);
        added.State = EntityState.Detached;
    }

    var entry = ex.Entries.Single();
    await entry.ReloadAsync();

    return entry.State == EntityState.Detached ? PickupResult.NotFound : PickupResult.Conflict;
}
```

**Verdt å stoppe opp ved:**

**`SaveChanges` er transaksjonell.** `UPDATE`-en av ordren og `INSERT`-en i `status_changes`
sendes i samme transaksjon. Feiler den ene, rulles begge tilbake. Databasen er i orden.

**Change trackeren er det ikke.** Den tror fortsatt at ordren er `Modified` med en gammel `xmin`, og
at `StatusChange`-raden er `Added`. Uten oppryddingen ville neste `SaveChanges` i samme context
(samme request) prøve igjen og feile igjen, eller, verre, sette inn den foreldreløse historikkraden.

Testen sjekker dette til slutt med `Assert.False(db2.ChangeTracker.HasChanges(), …)` og skriver ut
`DebugView.ShortView` hvis det gjenstår noe. Den kaller med vilje **ikke** `SaveChangesAsync()` for å
sjekke: med en `catch` som bare returnerer `Conflict` uten å rydde, ville det kallet kastet *den
samme* `DbUpdateConcurrencyException` en gang til, og det ville sett ut som om `catch`-en ikke
virket i det hele tatt. `HasChanges()` spør bare, og feilmeldingen peker rett på det som er igjen.

**`ReloadAsync()`** henter raden på nytt, overskriver både nåverdier og originalverdier og setter
tilstanden til `Unchanged`. Er raden slettet, blir entiteten `Detached`, og det gir oss
`NotFound` gratis.

**«Sjekk på nytt før du lagrer» er ikke en løsning.** Det er fristende å hente ordren på nytt rett
før `SaveChanges` og returnere `Conflict` hvis statusen ikke lenger er `Ready`. Det får testen grønn,
fordi testen kjører baristaene etter hverandre. Men med ekte samtidighet kan begge lese `Ready` før
noen av dem har skrevet (check-then-act), og da er vi tilbake til to `PickedUp`. Det eneste som er
atomisk, er at databasen selv sjekker betingelsen i den samme `UPDATE`-en som skriver, og det er
nøyaktig hva `WHERE xmin = @original` gjør. Versjonsfeltet er løsningen, ikke en ekstra sjekk.

**`xmin` beskytter bare raden i `orders`.** En endring i en `order_lines`-rad endrer ikke ordrens
`xmin`. Vil du ha optimistisk låsing på hele aggregatet (ordre + linjer), må hver endring i
aggregatet også røre roten. Her går det bra, fordi `MarkAsPickedUpAsync` alltid endrer `Status` på
selve ordren.

**Alternativet `[ConcurrencyCheck]`** på `Status` ville også løst akkurat dette tilfellet: da står
`AND status = 'Ready'` i `WHERE`. Det er mer presist («feil bare hvis *statusen* er endret»), men
må vedlikeholdes per egenskap. En radversjon fanger alt.

#### Del 2: Kollisjonen mellom to kall

🧪 `Level4AClientVersionTests` (2 tester)

```csharp
var order = await db.Orders.SingleOrDefaultAsync(o => o.Id == orderId);
if (order is null)
    return PickupResult.NotFound;

db.Entry(order).Property(o => o.Version).OriginalValue = expectedVersion;
return await MarkAsPickedUpAsync(order);
```

**Den naive versjonen ser riktig ut, og gjør ingenting.** Med `order.Version = expectedVersion` får
klienten med gammel versjon `PickedUp`, og testen feiler med `Expected: Conflict`, `Actual: PickedUp`.
EF bygger `WHERE id = @p1 AND xmin = @p2` fra *originalverdien*, altså det den nettopp leste fra
databasen, så sjekken går alltid gjennom.

**Java-sporet sammenligner versjonene selv** i `BestillingTjeneste.markerSomHentet`, og kaster
`OptimisticLockException`. `OriginalValue` lar i stedet databasen gjøre sjekken i den samme `UPDATE`-en
som skriver, så det finnes ikke noe vindu mellom sjekken og skrivingen.

**Testen leser `xmin` med en egen tilkobling,** ikke gjennom `order.Version`. Da kompilerer den også før
deltakerne har lagt til `Version` i steg 2.

**HTTP-delen av Java-oppgaven er en refleksjon her.** `ExceptionMapper`, `ETag` og 409 mot 412 handler om
API-et, ikke om ORM-et, og vi har ikke noe API.

#### Refleksjon i par, 4A

**Hvilken HTTP-statuskode?**

- **409 Conflict** når serveren oppdager kollisjonen selv, slik som her: klienten sendte bare
  «marker som hentet», og tilstanden på serveren var endret i mellomtiden.
- **412 Precondition Failed** når klienten sendte versjonen den baserte seg på, typisk som
  `ETag` fra en `GET` og `If-Match` på `PATCH`. `xmin` er en utmerket `ETag`. Da er det klienten
  som sier «bare hvis ingen har endret den siden jeg så den», og 412 er det presise svaret.
- **428 Precondition Required** hvis API-et *krever* `If-Match` og klienten ikke sendte den.

Bruk ProblemDetails i begge tilfeller, slik vi gjorde i samling 3.

**Skal backend prøve på nytt?** Ikke her. Barista 2 bestemte seg basert på en tilstand som ikke
lenger stemmer. Et automatisk nytt forsøk vil bare lese ordren på nytt, se `PickedUp` og svare
`NotReady`. Det er riktig svar, men det er et *annet* svar, og brukeren bør få vite hvorfor.

Automatisk retry passer når operasjonen ikke avhenger av det brukeren så: å telle opp et lager,
legge til en hendelse, eller andre kommutative endringer. Da kan backend lese på nytt, bruke
endringen på den ferske verdien og lagre. «Legg til en kopp» er et slikt tilfelle, så lenge ordren fortsatt
kan endres. «Marker som hentet» er det ikke.

**Merk:** `EnableRetryOnFailure()` i Npgsql/EF er noe annet. Den prøver på nytt ved *forbigående*
feil (nettverksbrudd, failover), aldri ved `DbUpdateConcurrencyException`.

**Hva får du i stedet for `RollbackException`?** `DbUpdateConcurrencyException` direkte fra
`SaveChanges`. I Hibernate oppdages konflikten ved commit og kommer pakket inn, så mapperen må se på
årsaken. Her kan en felles feilhåndtering fange typen rett fram.

**Når pessimistisk låsing?** Når kollisjoner er vanlige og det er dyrt å gjøre jobben om igjen, for
eksempel ved nedtelling av et lite lager. EF har ikke noe eget API for det, men `FromSql` med
`SELECT … FOR UPDATE` i en transaksjon virker.

### Oppgave 4B: Den komplekse lesemodellen

**Løsningen:** rå SQL med en vindusfunksjon, mappet rett til en `record`.

📄 [`KaffebarRepository.Level4B.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level4B.cs)
📄 [`Dtos.cs`](nivaa-4/Kaffebar.Orm/Dtos.cs): `BeanSalesRow` (ferdig i starteren)
🧪 `Level4BTests.Level4B_TopBeans_MatchesTheSameCalculationInCSharp`

```sql
WITH monthly AS (
    SELECT date_trunc('month', o.created_at AT TIME ZONE 'UTC')::date AS month,
           r.name AS roastery, b.name AS bean,
           SUM(l.quantity)::int           AS cups_sold,
           SUM(l.quantity * l.unit_price) AS revenue
    FROM order_lines l
    JOIN orders o     ON o.id = l.order_id
    JOIN beans b      ON b.id = l.bean_id
    JOIN roasteries r ON r.id = b.roastery_id
    GROUP BY 1, 2, 3
),
ranked AS (
    SELECT m.*,
           ROW_NUMBER() OVER (PARTITION BY month, roastery
                              ORDER BY cups_sold DESC, revenue DESC, bean)::int AS rank
    FROM monthly m
)
SELECT month, roastery, bean, cups_sold, revenue, rank
FROM ranked WHERE rank <= 3
ORDER BY roastery, month, rank
```

```csharp
db.Database.SqlQueryRaw<BeanSalesRow>(TopBeansSql).ToListAsync();
```

Fasiten bruker `SqlQueryRaw` fordi den samme SQL-en også brukes i bonusen, og den har ingen verdier fra
brukeren. Med verdier er `SqlQuery<T>($"...")` riktig, slik deltakerne blir bedt om å skrive den.

**Testen sjekker tre ting:**

1. **Riktig svar.** Den regner ut det samme på den tunge måten (alle linjene inn i minnet, så LINQ
   to Objects) og sammenligner rad for rad.
2. **Én spørring.** `Assert.Equal(1, counter.SelectCount)`.
3. **Databasen gjorde jobben.** `Assert.Equal(report.Count, counter.RowsRead)`: bare rapportradene
   kom over nettverket.

Punkt 3 er der for å stoppe den fristende snarveien: hent alle 250 linjene i *én* projeksjon og
grupper i C#. Den gir riktig svar og bare én spørring, så punkt 1 og 2 er fornøyde. Men den flytter
hele datagrunnlaget til applikasjonen, og med et års salg er det hundretusenvis av rader for å
produsere noen hundre. `RowsRead` avslører det: 250 rader lest for en rapport som er mye kortere.
Det er nettopp det Java-oppgaven mener med «ORM er feil verktøy for jobben».

**Verdt å stoppe opp ved:**

**«Topp 3 *per* gruppe» er ikke `GROUP BY` + `LIMIT`.** `LIMIT 3` virker på hele resultatet, ikke per
gruppe, så du får de tre mest solgte bønnene *totalt*, ikke tre per brenneri per måned. Det du
trenger, er å rangere *innenfor* hver gruppe: `ROW_NUMBER() OVER (PARTITION BY month, roastery ...)`.

**Sorter hele resultatet: brenneri, måned, plass.** `ROW_NUMBER` bestemmer plassen innenfor
gruppen, men sier ingenting om rekkefølgen på radene ut. Uten en `ORDER BY` til slutt kommer
radene i den rekkefølgen databasen tilfeldigvis har dem, og sammenligningen i testen feiler.

**Tie-breakeren er ikke pynt.** `ORDER BY cups_sold DESC, revenue DESC, bean` gjør rangeringen
deterministisk. Uten `bean` til slutt kan to bønner med likt salg bytte plass mellom kjøringer. I
seed-dataene finnes det ingen eksakte likheter (samme måned, brenneri, kopper *og* omsetning), så
navnet avgjør aldri en plass her. Med andre data ville det gjort det, og da må SQL-en og testen være
enige om rekkefølgen på tekst. Databasens collation er ikke nødvendigvis ordinal, så
`bean COLLATE "C"` er den sikre varianten.

**`::int` på `SUM` og `ROW_NUMBER` er valgfritt.** Postgres returnerer `bigint` for begge, og `BeanSalesRow`
har `int`. Målt: Npgsql leser verdiene som `int` uten å klage, så testen er grønn også uten cast. Vi har den med
for at typen i SQL-en skal stemme med record-en.

**`month` som `date`, ikke `timestamp`.** `date_trunc(...)::date` gir starten av måneden i UTC som
en ren dato, og den mappes rett til `DateOnly` i `BeanSalesRow`.

**`AT TIME ZONE 'UTC'`** før `date_trunc`. `created_at` er `timestamptz`. Uten konvertering
trunkerer Postgres i sesjonens tidssone, og en ordre 31. august kl. 23:30 UTC kan havne i
september.

**`SqlQuery<T>` for typer som ikke er entiteter** (EF 8+). Kolonnene mappes til egenskapene på
navn, med den samme navnekonvensjonen som resten av modellen. Derfor heter kolonnene `cups_sold`, ikke
`CupsSold`. Og det er en `FormattableString`: `{verdi}` i strengen blir parametre, ikke
strengsammenslåing. `SqlQueryRaw` finnes, og den er der SQL-injeksjonen bor.

#### Refleksjon: kunne vi gjort dette i LINQ?

Delvis. `GroupBy` med `Sum` oversettes fint, men den formen de fleste prøver for «topp N per gruppe», gir
`InvalidOperationException` om at uttrykket ikke kan oversettes (målt på EF Core 10 med Npgsql):

```csharp
db.OrderLines.GroupBy(l => l.BeanId)
    .SelectMany(g => g.OrderByDescending(l => l.Quantity).Take(3))    // kaster
```

Går du via nøklene, blir det i stedet `ROW_NUMBER() OVER (PARTITION BY …)` i SQL-en:

```csharp
db.OrderLines.Select(l => l.BeanId).Distinct()
    .SelectMany(k => db.OrderLines.Where(l => l.BeanId == k).OrderByDescending(l => l.Quantity).Take(3))
```

Det er vist på en enkel gruppering. Vi har ikke skrevet hele rapporten på denne måten, med aggregater per måned
og plassering. Et godt råd: **når du må lese den genererte SQL-en for å stole på den, kan du like gjerne skrive
SQL-en.**

#### Refleksjon: hvordan beskytter du deg når rå SQL ikke refaktoreres?

Med testen. Gir du `UnitPrice` et nytt navn og lager en migrering, sier kompilatoren ingenting, men
`Level4B_TopBeans_…` kjører SQL-en mot en ekte database og feiler fordi kolonnen er borte. Det er grunnen til at
rå SQL bør ha en test som faktisk kjører den, og ikke bare en mock.

#### «Bakdøren»: EF sin `doReturningWork`

```csharp
var connection = db.Database.GetDbConnection();              // en NpgsqlConnection
await db.Database.OpenConnectionAsync();
await using var command = connection.CreateCommand();        // eller Dapper, som ikke er installert her
```

Nyttig for ting EF ikke kan: `COPY`, `LISTEN/NOTIFY`, store bulk-importer. Tilkoblingen eies av
contexten. Er du i en transaksjon, må du sende den med (`db.Database.CurrentTransaction?.GetDbTransaction()`).
For en rapport som denne er `SqlQuery<T>` enklere, og den er parametrisert og logget som alt annet.

**Bonusen `GetTopBeansWithAdoNetAsync`** kjører samme SQL på denne måten, og mapper hver rad for hånd.
`Level4B_Bonus_AdoNet_GivesTheSameReport` viser hva du mister: loggen er tom, og `QueryCounter` teller 0,
fordi kommandoen aldri går gjennom EF. Det er EF sin versjon av Java-spørsmålet «hva mistet du med `doWork`?».

#### Refleksjon: ser rapporten en ordre som ikke er lagret?

Nei, verken rå SQL eller LINQ. Målt med én ordre lagt til med `db.Orders.Add(...)` i en åpen transaksjon: 100
ordrer før, 100 med rå SQL, 100 med LINQ, og 101 med rå SQL etter `SaveChangesAsync()`. EF flusher aldri
av seg selv. Java-sporet har en egen test for dette, fordi Hibernate flusher før en native query, men ikke
før JDBC. Vil du se ordren i samme transaksjon, må du kalle `SaveChangesAsync()` selv.

### Oppgave 4C (bonus): Black Friday-importen

**Løsningen:** bolker med `SaveChanges` og `ChangeTracker.Clear()`, inne i én transaksjon.

📄 [`KaffebarRepository.Level4C.cs`](nivaa-4/Kaffebar.Orm/KaffebarRepository.Level4C.cs)
🧪 `Level4CTests` (2 tester)

```csharp
await using var transaction = await db.Database.BeginTransactionAsync();

foreach (var chunk in newOrders.Chunk(ImportChunkSize))
{
    db.Orders.AddRange(chunk.Select(item => new Order { /* som hos kollegaen */ }));
    await db.SaveChangesAsync();
    db.ChangeTracker.Clear();
}

await transaction.CommitAsync();
```

Målt med 1000 ordrer og 2000 linjer. Tidene er fra én kjøring på én maskin, så les dem som en
størrelsesorden:

| Variant | Kommandoer | Tid | Sporet etterpå | Lagret etter feil på siste linje (av 250) |
| --- | ---: | ---: | ---: | ---: |
| Kollegaen: `SaveChanges` per ordre | 1000 | ca. 2200 ms | 3000 | 249 |
| Én `SaveChanges` for alt | 3 | ca. 250 ms | 3000 | 0 |
| Bolker på 100 med `Clear()`, uten transaksjon | 10 | ca. 280 ms | 0 | 200 |
| Bolker på 100 med `Clear()`, i én transaksjon | 10 | ca. 280 ms | 0 | 0 |

**Verdt å stoppe opp ved:**

**Mesteparten av Java-oppgaven er allerede gjort for deg.** Java-sporet må skru på
`hibernate.jdbc.batch_size` og `hibernate.order_inserts`. EF batcher og sorterer etter tabell som standard.
Fellen her er å kalle `SaveChanges` i løkka.

**Hver `SaveChanges` er sin egen transaksjon.** Det er den EF-spesifikke fella. I Java-sporet ligger hele
importen i én transaksjon, og `flush()` skriver uten å committe. I EF committer `SaveChanges` når det ikke
finnes en transaksjon fra før, så bolkene alene gir en halvferdig import: 200 av 250 ordrer i testen.

**Identity-kolonner stopper ikke batchingen.** Hibernate kan ikke batche `INSERT`-er med `IDENTITY`, fordi
den trenger id-en med en gang. `OrderLine.Id` er en identity-kolonne her, og 2000 linjer går likevel i
batcher, fordi EF får id-ene tilbake med `RETURNING` i samme rundtur.

**`Clear()` og bønnene.** Etter `Clear()` er alle entitetene detached. Hadde vi holdt på `Bean`-objekter og
satt `line.Bean = bean`, måtte vi tenkt på hvordan de ble sporet igjen. Med `BeanId` er problemet borte.

**Når droppe EF?** Ved millioner av rader. Npgsql sin `BeginBinaryImport` bruker `COPY`, og er i en annen
klasse, men da går du også forbi alt EF gjør for deg.

---

## Valgfrie oppgaver

De hører ikke til noe nivå. Deltakerne lager filene selv, og alt heter `Optional…`. Løsningene ligger i
`losninger/` fra nivået oppgaven passer etter: valgfri 1 i `nivaa-1` til `nivaa-4`, valgfri 2 fra
`nivaa-2`, valgfri 3 fra `nivaa-3` og valgfri 4 bare i `nivaa-4`. `dotnet test --filter Optional` kjører
bare dem.

### Valgfri 1: Kan ikke oversettes

**Løsningen:** filtrer på `DayOfWeek` rett i spørringen, ikke i en egen C#-metode.

📄 [`KaffebarRepository.Optional1.cs`](nivaa-1/Kaffebar.Orm/KaffebarRepository.Optional1.cs)
🧪 `Optional1Tests`

```csharp
db.Orders
    .Where(o => o.CreatedAt.DayOfWeek == DayOfWeek.Saturday || o.CreatedAt.DayOfWeek == DayOfWeek.Sunday)
    .ToListAsync();
```

```sql
WHERE floor(date_part('dow', o.created_at AT TIME ZONE 'UTC'))::int = 6
   OR floor(date_part('dow', o.created_at AT TIME ZONE 'UTC'))::int = 0
```

| Variant | Resultat |
| --- | --- |
| `IsWeekend(o.CreatedAt)` i `Where` | `InvalidOperationException`: «could not be translated» |
| `ToListAsync()` først, filter i C# | Riktig svar (33), men `Rader lest` 100. Testen er rød |
| `DayOfWeek` i spørringen | 33 helgeordrer, 33 rader lest |

**Hvorfor kaster EF?** Før EF Core 3 filtrerte EF i C# av seg selv, med bare en advarsel i loggen. Det ga
riktige svar og skjulte at hele tabellen ble hentet. Nå må du velge det selv, med `AsEnumerable()` eller
`ToList()`, og da står valget i koden.

**Tidssonen.** Npgsql legger på `AT TIME ZONE 'UTC'`, så «helg» er helg i UTC. En ordre lørdag kl. 00:30
norsk tid er fredag i UTC. Skal det være norsk helg, må tidssonen inn i spørringen.

**Når er C# greit?** Når datamengden er liten og begrenset, eller logikken ikke finnes i SQL. Da bør du
filtrere så mye som mulig i databasen først.

### Valgfri 2: Testen som stopper N+1

**Løsningen:** én test som teller spørringene, med lazy loading på.

📄 [`Optional2Tests.cs`](nivaa-2/Kaffebar.Orm.Tests/Optional2Tests.cs)

```csharp
var counter = new QueryCounter();
await using var db = fixture.CreateContext(output.WriteLine, counter, lazyLoading: true);

var orders = await new KaffebarRepository(db).GetAllOrdersWithDetailsAsync();
Receipts.Write(orders, _ => { });

output.Commands(counter);
Assert.Equal(1, counter.SelectCount);
```

Uten `ThenInclude(b => b.Roastery)`:

| | Feilmelding |
| --- | --- |
| Lazy loading av | `NullReferenceException` inne i `Receipts.Write` |
| Lazy loading på | `Expected: 1`, `Actual: 7`, og tabellen viser `SELECT roasteries` 6 ganger |

Begge er røde, men bare den andre forteller hva som er galt. Med lazy loading på blir en glemt `Include`
til flere spørringer, slik den ville blitt i en app som har lazy loading på.

**Gode feilmeldinger** sier hva som ble målt og hva som var forventet, for eksempel «7 spørringer for
kvitteringene, forventet 1». Spørsmål og hint hører hjemme i dokumentasjonen.

### Valgfri 3: Gammel data fra Identity Map

**Løsningen:** les uten å gå via Identity Map, eller les objektet på nytt.

📄 [`Optional3Tests.cs`](nivaa-3/Kaffebar.Orm.Tests/Optional3Tests.cs)

```csharp
var second = await db.Orders.AsNoTracking().SingleAsync(o => o.Id == SeedData.AdaOrderId);
// eller: await db.Entry(first).ReloadAsync();
// eller: en ny context
```

| Variant | Spørringer | Andre lesing | Samme objekt |
| --- | ---: | --- | --- |
| Vanlig spørring | 2 | 52.00 kr | Ja |
| `AsNoTracking()` | 2 | 60.00 kr | Nei |
| `FindAsync` | 1 | 52.00 kr | Ja |

**Hva skjer?** Den andre spørringen går til databasen og får 60 tilbake. EF finner så en ordre med samme
id i change trackeren, og gir deg den i stedet. Raden fra databasen overskriver ikke en entitet som
allerede er sporet. `FindAsync` sjekker change trackeren først og sender ingen SQL i det hele tatt.

**Samme mekanisme som i 1B.** Identity Map ga 15 spørringer for bønnene i stedet for 250. Den samme
regelen, én entitet per id per context, gir her gammel data.

**Kort levetid.** I en request er vinduet kort. I en bakgrunnsjobb eller en desktop-app som holder
contexten lenge, blir det et reelt problem. Derfor bør en context leve kort.

**Koblingen til 4A.** Lagrer contexten med den gamle verdien, overskriver den det den andre lagret. Med
versjonen fra 4A blir det `DbUpdateConcurrencyException` i stedet.

### Valgfri 4: Migreringen som mister data

**Løsningen:** rett migreringen for hånd til `RenameColumn` + `AlterColumn`, i både `Up` og `Down`.

📄 [`Domain/Order.cs`](nivaa-4/Kaffebar.Orm/Domain/Order.cs) (`Comment`),
[`Migrations/*_Optional4AddOrderNote.cs`](nivaa-4/Kaffebar.Orm/Migrations/),
[`Migrations/*_Optional4RenameNoteToComment.cs`](nivaa-4/Kaffebar.Orm/Migrations/)
🧪 `Optional4Tests`

| Endring | Hva EF Core 10 genererte |
| --- | --- |
| Bare nytt navn, `Note` → `Comment` | `RenameColumn`. EF gjettet riktig |
| Nytt navn og `[MaxLength(200)]` samtidig | `DropColumn` + `AddColumn`, og «An operation was scaffolded that may result in the loss of data» |

```csharp
migrationBuilder.RenameColumn(name: "note", table: "orders", newName: "comment");

migrationBuilder.AlterColumn<string>(
    name: "comment", table: "orders",
    type: "character varying(200)", maxLength: 200, nullable: true,
    oldClrType: typeof(string), oldType: "text", oldNullable: true);
```

`Down` gjør det samme baklengs: `AlterColumn` tilbake til `text`, og så `RenameColumn` tilbake til `note`.

**Hva var forskjellen?** Så lenge bare navnet endret seg, kjente EF igjen navnebyttet. Da typen også
endret seg (`text` til `character varying(200)`), lignet det ikke lenger på et navnebytte, og EF lagde en
ny kolonne. Advarselen kommer i terminalen, ikke som en feil, og er lett å overse. EF gjetter ofte riktig,
men det er en gjetning, og derfor leser man migreringen.

**Hvorfor merket ikke de andre testene noe?** Testdatabasen migreres fra tom og seedes etterpå. Det finnes
ingen data å miste. Bare en database med data i kolonnen avslører det, og det er det testen lager.

**Hvem bør lese migreringen?** Den som lager den, og den som godkjenner PR-en. Mot produksjon er
`dotnet ef migrations script` det tryggeste: et SQL-skript noen faktisk har lest.

---

## De vanligste feilene, og hva symptomet er

| Symptom | Årsak | Fiks |
| --- | --- | --- |
| Kvitteringene har ingen linjer, ingen feil (1A) | EF laster ikke navigasjoner du ikke har bedt om | `Include`, projeksjon, eller (bevisst) lazy loading |
| `InvalidOperationException` om at en navigasjon ikke er `virtual` (1B) | `UseLazyLoadingProxies()` krever `virtual` på *alle* navigasjoner | Legg til `virtual` |
| `InvalidOperationException` ved lazy loading etter at contexten er disposet | Proxyen trenger en levende context | Last det du trenger mens contexten lever |
| Linjen er ikke slettet, og ingen feilmelding (2C) | `Lines` er ikke lastet, så det finnes ingenting å fjerne | `Include(o => o.Lines)` |
| Totalprisen er 0 eller for høy (2C) | Linjer legges til eller fjernes rett i samlingen | `Order.AddLine`, `Order.RemoveLine` |
| 990 rader i stedet for 743 (2B) | To `Include` av samlinger i samme spørring | `AsSplitQuery()` |
| `NeverChangesTheOrderInTheDatabase` feiler med 192,10 mot 226 (3A) | Sporet entitet endret, og en *annen* `SaveChanges` lagret den | Projeksjon (eller `AsNoTracking()`) |
| `DebugView` viser Ingrids ordre som `Unchanged`, men den blir lagret likevel (3A) | `DebugView` kjører ikke `DetectChanges()`, det gjør `SaveChanges()` | `db.ChangeTracker.DetectChanges()` før utskriften |
| **Alle** testene i **alle** testklassene feiler i fixturen med `InvalidOperationException`: «… has pending changes. Add a new migration …» (`PendingModelChangesWarning`) (4A) | `Version` lagt til i `Order` uten migrering. Hver fixture migrerer sin egen database, og EF 9+ gjør ventende modellendringer til en feil i `MigrateAsync` | `dotnet ef migrations add AddOrderVersion --project Kaffebar.Orm` |
| `"lines":[]` og `"status":0` i JSON-en, ingen feilmelding (3B) | Entiteten serialiseres uten `Include` | Projeksjon til egne `record`-er |
| `JsonException: A possible object cycle was detected` (3B) | `OrderLine.Order` peker tilbake på ordren | Projeksjon til egne `record`-er |
| Endringen på en ordre lagres ikke, og `SaveChanges` returnerer 0 (3D) | Objektet er detached | Bruk bare endringen på en nyhentet entitet |
| `Expected: 999`, `Actual: 52.00` (3D) | `db.Update` skriver alle kolonnene tilbake | Samme som over |
| To `PickedUp`-rader i historikken (4A) | Ingen samtidighetskontroll | `[Timestamp] uint Version` |
| `DbUpdateConcurrencyException`: «expected to affect 1 row(s), but actually affected 0 row(s)» (4A) | Versjonen virker, men ingen fanger unntaket | `try/catch` i `MarkAsPickedUpAsync`, returner `PickupResult.Conflict` |
| «Barista 2 sin context har fortsatt ulagrede endringer» (4A) | `catch`-en returnerer `Conflict` uten å rydde change trackeren | Detach de nye `StatusChange`-radene, `ReloadAsync()` |
| Klient med gammel versjon får `PickedUp` (4A, del 2) | `order.Version = …` brukes ikke i `WHERE` | `db.Entry(order).Property(o => o.Version).OriginalValue = …` |
| 4B feiler på `RowsRead` selv om rapporten er riktig | Linjene hentes og grupperes i C# | La databasen gruppere og rangere |
| 200 av 250 ordrer står igjen etter feilen (4C) | Hver `SaveChanges` er sin egen transaksjon | Legg hele importen i én transaksjon |
| Rå SQL finner ingen ordrer med status `'PICKED_UP'` eller `3` | Enums lagres som tekst med C#-navnet | `'PickedUp'` |
| `SqlQuery<T>` gir feil om manglende kolonne | Kolonnenavnene i SQL-en matcher ikke egenskapene | `AS cups_sold` (snake_case, samme konvensjon som modellen) |
| `InvalidCastException`: «Reading as 'System.DateOnly' is not supported» | `month` er en timestamp, ikke en `date` | `::date` |
| «Cannot write DateTimeOffset with Offset=…» | Npgsql godtar bare UTC for `timestamptz` | `DateTimeOffset.UtcNow`, eller `.ToUniversalTime()` |
| Testcontainers finner ingen Docker | Ingen runtime kjører, eller den ligger et uvanlig sted | Start Podman/Docker, sett `DOCKER_HOST`, eller bruk `KAFFEBAR_POSTGRES` |
| Rancher Desktop kjører, men blir ikke funnet | Rancher kjører i containerd-modus, som ikke eksponerer Docker-API-et | Bytt til dockerd (moby) i innstillingene |
| Mange gamle Postgres-containere etter en avbrutt testkjøring | Ryuk er av med Podman, og `DisposeAsync` rakk ikke å kjøre | `podman ps --filter label=org.testcontainers`, så `podman rm -f <id>` |
| Podman: «short-name resolution» | Podman godtar ikke alltid korte image-navn | Allerede løst: `docker.io/library/postgres:18-alpine` |

---

## Står noen fast?

**Står noen fast på en oppgave,** kan du gi dem fasitfilene for den oppgaven fra `losninger/nivaa-N/Kaffebar.Orm/`,
med samme navn. De fleste oppgavene er én fil, `KaffebarRepository.Level<ID>.cs`, og det rører ikke de andre.
Noen trenger mer:

| Oppgave | Filer |
| --- | --- |
| 1A | `KaffebarRepository.Level1A.cs` og `Receipts.cs` |
| 1B | `Data/KaffebarDb.cs` |
| 2C | `KaffebarRepository.Level2C.cs` og `Domain/Order.cs` |
| 3A | `KaffebarRepository.Level3A.cs` og `Campaign.cs` |
| 4A | Se under |

**Står noen fast på et helt nivå,** går de videre i neste mappe. Der er nivået løst, med fasitens kode.

**4A er mer enn én fil.** Den tar med seg `Domain/Order.cs` (med `Version`), migreringen `AddOrderVersion`
(to filer) og `KaffebarDbContextModelSnapshot.cs`. Gjør du det for hånd, må alle fire med, ellers kaster
`MigrateAsync`.

**Forventet ved start, per mappe:**

| Mappe | Tester | Grønne | Røde |
| --- | ---: | ---: | ---: |
| `nivaa-1` | 2 | 0 | 2 |
| `nivaa-2` | 7 | 2 | 5 |
| `nivaa-3` | 16 | 8 | 8 |
| `nivaa-4` | 24 | 17 | 7 |

Alle testene er grønne i `losninger/nivaa-1` til `nivaa-4`.

**Bare se hvordan det ser ut.** Åpne `nivaa-3` og `losninger/nivaa-3` side om side og diff filen for
oppgaven. Det er den raskeste veien til «å, det var sånn».

**Kjør én oppgave med SQL-en synlig:**

```bash
dotnet test --filter Level3A --logger "console;verbosity=detailed"
```

Er det for mye SQL i utskriften, sett `ShowSql` øverst i `Kaffebar.Orm.Tests/PostgresFixture.cs` til `false`.

---

## Tidsbruk

Dette er anslag, ikke målinger: ingen gruppe har kjørt oppgavene ennå. Tidene tar med refleksjon i par, og
nivåtidene ligger nær tidene i Java-sporets `oppgaver.md`.

| Blokk | Minutter |
| --- | ---: |
| Forarbeid | 15 |
| Nivå 1 (1A + 1B) | 45 |
| Nivå 2 (2A + 2B + 2C) | 90 |
| Nivå 3 (3A + 3B) | 75 |
| 3C (bonus) | 20 |
| 3D (bonus) | 20 |
| Nivå 4 (4A + 4B) | 90 |
| 4C (bonus) | 30 |

| Spor | Uten bonus | Java, til sammenligning |
| --- | ---: | ---: |
| Fersk (forarbeid + 1 + 2) | 150 | 135 |
| Erfaren (forarbeid + 2 + 3) | 180 | 150–165 |
| ORM-veteran (forarbeid + 3 + 4) | 180 | 120–150 |

Java-tallene er uten forarbeid, som Java ikke har. Det er i refleksjonen i par det meste av læringen skjer,
så sett av tid til den.
