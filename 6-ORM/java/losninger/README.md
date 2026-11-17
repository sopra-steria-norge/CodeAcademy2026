# Løsningsforslag – kun for kursholder

> ⚠️ Ikke del denne mappen med deltakerne. Fjern den før repoet deles, eller legg den i en egen gren.

Hver mappe er et selvstendig Maven-prosjekt med løsningsforslaget for nivået. Alle tester er grønne.
Løsningen på nivå N er også utgangspunktet for nivå N+1.

| Nivå | Hovedpoeng i løsningen | Hvor |
|---|---|---|
| 1 | Naiv `SELECT b FROM Bestilling b` gir 1 + 100 + 15 + 5 = **121** SELECT-er. Ikke ~250 for bønner: persistence context cacher bønner og brennerier som er lastet. | `KaffebarRepository`, `Kvitteringsskriver` |
| 2A | JOIN FETCH av linjer → bønne → brenneri gir 1 SELECT. Hibernate 6+ fjerner duplikate rotentiteter selv (ingen `DISTINCT`). EntityGraph-variant ved siden av. | `KaffebarRepository.hentAlleBestillinger*` |
| 2B | To `List`-er i samme JOIN FETCH → `MultipleBagFetchException`. Løst med to spørringer; den andre fyller ut de managed bestillingene. | `hentBestillingerMedTilpasninger` |
| 2C | `getLinjer().add(...)` setter bare den inverse siden → `PropertyValueException` (eiersiden `Bestillingslinje.bestilling` er null). `em.remove(linje)` mens linjen ligger i en samling med `cascade = ALL` ignoreres **i stillhet** (blir persistert igjen ved flush). Løst med domenemetodene `leggTilLinje`/`fjernLinje` + `orphanRemoval`. | `BestillingTjeneste`, `Bestilling` |
| 3A | Dirty checking: endringen på den managed entiteten skrives ved commit selv om metoden returnerer en DTO. Løst ved å regne ut prisen uten å endre entiteten (og uten transaksjon). | `KampanjeTjeneste` |
| 3B | Entitet fra endepunkt → `LazyInitializationException` (EM lukket før Jackson serialiserer). Med alt JOIN FETCH-et → uendelig rekursjon. Løst med `BestillingDto` mappet mens EM er åpen; 2 SELECT-er. | `BestillingResource`, `BestillingDto` |
| 3C | JPQL-`UPDATE` går forbi persistence context. Lastede entiteter står fortsatt som `KLAR`, og når prisen endres, skriver Hibernate hele raden tilbake, inkludert gammel status. Løst med én bulk-`UPDATE` for både status og pris. | `StengetidTjeneste` |
| 3D | Detached entitet + tom transaksjon = ingenting lagres. Løst med `em.merge()`; kommentar om ulempene. | `BestillingTjeneste` |
| 4A | `@Version` gir `UPDATE … WHERE id = ? AND versjon = ?`. Konflikt ved commit kommer som `RollbackException` med `OptimisticLockException` som årsak, så mapperen fanger `PersistenceException` og sjekker årsaken. 409 (eller 412 ved `If-Match`). GET sender versjonen som `ETag`. | `Bestilling`, `KonfliktMapper`, `BestillingResource` |
| 4B | CTE + `ROW_NUMBER() OVER (PARTITION BY brenneri, maaned …)`; `LIMIT` alene gir topp 3 totalt. Native query flusher automatisk, `doReturningWork` gjør det ikke → `em.flush()` først (krever aktiv transaksjon). | `RapportRepository` |
| 4C | `batch_size` alene: 3000 → 2000 forberedte INSERT-er (bestilling og linje veksler). Med `order_inserts`: 40. `flush()`/`clear()` hver 50. `getReference` for kaffebønnene. Ca. 3x raskere. Batching virker ikke med `IDENTITY`. | `ImportTjeneste`, `persistence.xml` |

## Kursholders oppsummering (5–10 min til slutt)
Temaer som ikke har egne oppgaver, men som er verdt å nevne:

* **Bulk-oppdatering og `@Version`:** en vanlig JPQL-`UPDATE` øker *ikke* versjonen. Stengetid-løsningen fra nivå 3 åpner derfor for tapte oppdateringer etter at `@Version` er innført på nivå 4. HQL har `UPDATE VERSIONED` (se `losninger/nivaa-4`). Et fint eksempel på at løsninger kan påvirke hverandre.
* **`equals`/`hashCode`:** standard identitets-`equals` fungerer innenfor én persistence context. Id-basert `hashCode` ødelegger `HashSet` når id-en settes ved persist. Bruk naturlig nøkkel, eller id-basert `equals` med konstant `hashCode`.
* **Skjemahåndtering:** vi bruker `drop-and-create`. I produksjon: Flyway/Liquibase + `hibernate.hbm2ddl.auto=validate`.
* **Logging:** SLF4J + Logback overalt. Jersey/Grizzly (java.util.logging) går via `jul-to-slf4j`, som installeres i `KaffebarApp`. SQL logges med loggeren `org.hibernate.SQL` i stedet for `hibernate.show_sql`, som skriver rett til `System.out` uten tidsstempel, tråd eller nivå. Parameterverdier: `org.hibernate.orm.jdbc.bind` på `TRACE`. Nivå 1 starter med SQL-loggingen av; det er første steg i oppgaven.
* **Tilkoblingspool:** alle nivåene bruker HikariCP (`hibernate-hikaricp` + `hibernate.hikari.*` i `persistence.xml`). Uten den faller Hibernate tilbake på en innebygd pool og advarer selv om det (`HHH10001002`). Poolen er satt til 5 tilkoblinger med lekkasjedeteksjon etter 30 sek. Merk: en `EntityManager` *uten* transaksjon gir tilkoblingen tilbake etter hver spørring og lekker ikke, selv om den ikke lukkes. Det er en transaksjon som aldri får commit eller rollback som holder tilkoblingen og utløser advarselen. Står man lenge på et breakpoint midt i en transaksjon, kommer advarselen også.
* **Store resultatsett:** `getResultStream()` / `ScrollableResults` i stedet for `getResultList()` på 10 000 rader.
* **Verdiobjekter:** `@Embeddable` og `AttributeConverter` (f.eks. en `Pris`-type) gir et rikere domene uten flere tabeller.
* **Paginering:** Hibernate 7 paginerer JOIN FETCH i SQL med en subspørring. Eldre versjoner gjorde det i minnet (`HHH90003004`). Den klassiske løsningen er to spørringer: ID-er først, så JOIN FETCH.

## Kjøre alt
```bash
for n in nivaa-*; do (cd "$n" && mvn -q test) && echo "$n OK"; done
```
