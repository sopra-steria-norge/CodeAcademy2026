# 📋 Plan: Kaffe-Vurdering & Ukesoppsummering

## 🎯 Feature Overview

Brukeren kan gi kaffen sin en liten **humørsvurdering** etter at den er hentet (status `READY`), ikke bare stjerner, men med konkrete tilstander:
- 🚀 **"Reddet morgenen"** – Super dag!
- 😋 **"Helt grei"** – OK, noe uventet skjedde ikke
- 💔 **"Smakte som en klem"** – Noe var galt (eller det er humor)

Appen viser en **morsom ukesoppsummering** med statistikk som _"Du har reddet 4 mandager med kaffe!"_

---

## 🏗️ Arkitektur

### Tre lag:

1. **Backend (.NET API)** – Lagrer og beregner statistikk
2. **Frontend (Next.js/React)** – UI for vurdering + visning av oppsummering
3. **Database/Store** – Holder vurderinger persistert

---

## 📊 Datamodell

### Backend: Nye typer

```csharp
// Enumer for humør-vurderingene
public enum CoffeeRating
{
    SAVED_MY_MORNING,    // "Reddet morgenen"
    PRETTY_OK,           // "Helt grei"
    TASTED_LIKE_A_HUG    // "Smakte som en klem"
}

// Vurdering av en ordre (legges til i ordrehistorikken)
public record OrderRating
{
    public required Guid OrderId { get; init; }
    public required Guid UserId { get; init; }        // Hvem ga vurderingen
    public required CoffeeRating Rating { get; init; }
    public required DayOfWeek DayOfWeek { get; init; } // Mandag, tirsdag, osv.
    public required DateTime CreatedAt { get; init; }
}

// Request: Legge til vurdering
public record CreateRatingRequest
{
    public required CoffeeRating Rating { get; init; }
}

// Response: Ukesstatistikk
public record WeeklySummary
{
    public required int SavedMondaysCount { get; init; }
    public required int SavedTuesdaysCount { get; init; }
    // ... osv for alle dager
    
    public required Dictionary<string, int> RatingCounts { get; init; } // {"SAVED_MY_MORNING": 4, ...}
    public required List<RatingMessage> Messages { get; init; }
}

// Humoristiske meldinger basert på statistikk
public record RatingMessage
{
    public required string Text { get; init; }       // f.eks. "Du har reddet 4 mandager!"
    public required DayOfWeek? FocusDay { get; init; } // null hvis ikke dag-spesifikk
}
```

---

## 🔌 API-endepunkter (Backend)

### 1. Legg til vurdering for en ordre
```
POST /orders/{orderId}/rating
Body: { "rating": "SAVED_MY_MORNING" }
Response: 201 Created
```

**Regler:**
- Ordren må eksistere
- Ordren må ha status `READY` (ferdig)
- Brukeren må eie ordren (eller være samme bruker som bestilte)
- Kan kun vurdere **en gang** per ordre (idempotent – oppdater hvis allerede finnes)

**Response-eksempel:**
```json
{
  "orderId": "uuid...",
  "userId": "uuid...",
  "rating": "SAVED_MY_MORNING",
  "dayOfWeek": "Monday",
  "createdAt": "2026-10-21T14:30:00Z"
}
```

### 2. Hent ukesoppsummering for bruker
```
GET /users/{userId}/weekly-summary
Response: 200 OK
```

**Response-eksempel:**
```json
{
  "savedMondaysCount": 4,
  "savedTuesdaysCount": 2,
  "savedWednesdaysCount": 1,
  "savedThursdaysCount": 3,
  "savedFridaysCount": 6,
  "savedSaturdaysCount": 0,
  "savedSundaysCount": 1,
  "ratingCounts": {
    "SAVED_MY_MORNING": 12,
    "PRETTY_OK": 5,
    "TASTED_LIKE_A_HUG": 2
  },
  "messages": [
    {
      "text": "Du har reddet 4 mandager med kaffe! ☕",
      "focusDay": "Monday"
    },
    {
      "text": "En lørdag uten kaffe – du er overmenneske!",
      "focusDay": "Saturday"
    },
    {
      "text": "Fredag er ditt beste vennskap med kaffe. 6 ganger! 🎉",
      "focusDay": "Friday"
    }
  ]
}
```

### 3. Hent alle vurderinger for en ordre
```
GET /orders/{orderId}/rating
Response: 200 OK eller 404 Not Found
```

---

## 🎨 Frontend: UI-komponenter

### 1. RatingModal / RatingCard (etter ordre er klar)
- Vises når bruker klikker "Vurder" på en ferdig ordre
- Tre knapper/kort: "Reddet morgenen" 🚀 | "Helt grei" 😋 | "Smakte som en klem" 💔
- POST til `/orders/{orderId}/rating` ved valg
- Lukke modal etter vurdering (eller vis "Takk!"-melding)

### 2. WeeklySummaryCard (på dashboard/profil-siden)
- Viser ukesstatistikk med:
  - 7 små bokser (en per dag) som viser hvilke dager du fikk kaffe
  - Antall per dag (for hver vurdering)
  - Humoristiske meldinger som roterer eller vises alle
- Henter fra `/users/{userId}/weekly-summary`

### 3. Integrering med eksisterende MyOrderTracker
- Legg til "Vurder"-knapp på ferdig ordre (når status = `READY`)
- Klikk åpner rating modal

---

## 📋 Implementeringssteps (Prioritert rekkefølge)

### **Sprint 1: Backend – Fundament**

- [ ] Lag `CoffeeRating`-enum i `Models/`
- [ ] Lag `OrderRating`-record i `Models/`
- [ ] Lag `CreateRatingRequest`-record
- [ ] Lag `WeeklySummary` + `RatingMessage` records
- [ ] Lag `RatingStore` (In-memory, som `UserStore`)
  - Lagrer ratings i `ConcurrentDictionary<(Guid orderId, Guid userId), OrderRating>`
- [ ] Implementer rating-logikk:
  - `CreateRating(orderId, userId, rating)` – validerer ordre + bruker
  - `GetWeeklySummary(userId)` – beregner statistikk + genererer meldinger
  - `GetRatingForOrder(orderId)` – henter eksisterende vurdering
- [ ] Lag API-endepunkter:
  - `POST /orders/{orderId}/rating`
  - `GET /users/{userId}/weekly-summary`
  - `GET /orders/{orderId}/rating` (opsjonelt, for debugging)

### **Sprint 2: Backend – Vurderingsheuristikk**

- [ ] Implementer meldingsgenerator:
  - Tel hvor mange ganger per dag ("Du har reddet 4 mandager!")
  - Generer humoristiske meldinger basert på mønstre
  - Eksempler:
    - Hvis `SavedMondaysCount >= 4`: "Du har reddet {N} mandager! 🚀"
    - Hvis alle dager = 0: "Ingen kaffe denne uka – hvem er du??"
    - Hvis fredager er høy: "Fredag er kaffeens beste dag for deg! 🎉"
    - Hvis "TASTED_LIKE_A_HUG" >= 2: "Noen av dine kaffer smaker som klemmer... 💔"

### **Sprint 3: Frontend – UI-komponenter**

- [ ] Lag `RatingModal` komponent
  - Tre knapper med emoji + tekst
  - POST til backend på valg
  - Lading + feil-håndtering
- [ ] Lag `WeeklySummaryCard` komponent
  - Hent fra `GET /users/{userId}/weekly-summary`
  - Vis 7 dager med teller
  - Vis meldinger (kanskje roterende/karusell)
- [ ] Integrer `RatingModal` i `MyOrderTracker`
  - Legg til "Vurder"-knapp når ordre status = `READY`
- [ ] Integrer `WeeklySummaryCard` på hovedsiden eller en ny `/oppsummering` side

### **Sprint 4: Testing & Polering**

- [ ] Backend-tester (xUnit):
  - `CreateRating_WithValidOrder_Returns201`
  - `CreateRating_WithInvalidOrder_Returns404`
  - `CreateRating_DuplicateRating_Returns409OrUpdates`
  - `GetWeeklySummary_ReturnsCorrectCounts`
  - `GenerateMessages_ProducesHumorousText`
- [ ] Frontend-tester (Vitest):
  - `RatingModal` rendrer tre knapper
  - Klikk sender riktig request
  - `WeeklySummaryCard` viser stats
- [ ] Manuell testing:
  - Opprett ordre → vent på READY → vurder → sjekk oppsummering
  - Lag flere ordre samme dag → sjekk dag-tellingen
  - Sjekk at meldinger er riktige

### **Sprint 5: Polish & UX**

- [ ] Animasjoner på modal + meldinger
- [ ] Offline-støtte (cache ratings lokalt)
- [ ] Responsivt design (mobil-først)
- [ ] Tilgjengelighet (ARIA-labels, tastatur-navigasjon)

---

## 🗂️ Filstruktur (Backend)

```
3-APIs/kaffebar-dotnet/Kaffebar/
├── Models/
│   ├── CoffeeRating.cs (enum)
│   ├── OrderRating.cs (record)
│   ├── CreateRatingRequest.cs
│   ├── WeeklySummary.cs
│   └── RatingMessage.cs
├── Services/
│   ├── RatingStore.cs (in-memory)
│   └── RatingService.cs (business logic)
├── Controllers/
│   └── RatingsController.cs (eller legg endepunkt i Program.cs som minimal API)
└── Program.cs (registrer RatingStore + endepunkter)
```

---

## 🗂️ Filstruktur (Frontend)

```
4-Frontend/kaffebar-web/src/
├── components/
│   ├── RatingModal.tsx
│   ├── WeeklySummaryCard.tsx
│   └── MyOrderTracker.tsx (oppdater – legg til vurdering)
├── hooks/
│   ├── useRating.ts (POST /orders/{id}/rating)
│   └── useWeeklySummary.ts (GET /users/{id}/weekly-summary)
├── types/
│   └── domain.ts (oppdater – legg til Rating-typer)
└── app/
    └── (opsjonelt) oppsummering/page.tsx (ny side for full oppsummering)
```

---

## 🧪 Testdata-eksempel

**Scenario: Mandag-redder**

1. Opprett bruker: "Kari"
2. Mandag 09:00 – Ordre #1: Latte
3. Mandag 14:00 – Ordre #2: Cappuccino  
4. Tirsdag 09:00 – Ordre #3: Espresso
5. Mandag neste uke – Ordre #4: Latte
6. Mandag neste uke – Ordre #5: Cortado

**Vurderinger:**
- #1 (Mandag, uke 1): `SAVED_MY_MORNING`
- #2 (Mandag, uke 1): `SAVED_MY_MORNING`
- #3 (Tirsdag, uke 1): `PRETTY_OK`
- #4 (Mandag, uke 2): `SAVED_MY_MORNING`
- #5 (Mandag, uke 2): `SAVED_MY_MORNING`

**Forventet oppsummering (uke 2):**
```json
{
  "savedMondaysCount": 4,
  "savedTuesdaysCount": 0,
  ...
  "messages": [
    "Du har reddet 4 mandager med kaffe! ☕"
  ]
}
```

---

## ✅ Akseptanskriterier

- ✅ Bruker kan vurdere en ferdig ordre med ett av tre humør
- ✅ Backend lagrer vurderingen og knytter den til ordre + bruker + dag
- ✅ Bruker kan se ukesstatistikk (teller per dag + per humør)
- ✅ App genererer humoristiske meldinger basert på mønstre
- ✅ Frontend viser modal for vurdering + sammendrag-kort
- ✅ Vurdering er idempotent (kann ikke vurdere samme ordre to ganger)
- ✅ Responsive design (mobil + desktop)
- ✅ Tester (unit + integration)

---

## 🎨 Mulige Emoji/Ikoner

| Vurdering | Emoji | Alternativ Tekst |
|-----------|-------|------------------|
| Saved My Morning | 🚀 ☕ 🌅 | "Reddet morgenen" |
| Pretty OK | 😋 👍 ✌️ | "Helt grei" |
| Tasted Like a Hug | 💔 🤗 😅 | "Smakte som en klem" |

---

## 🔮 Framtidig utvidelse

- Samle data på tvers av ukker (måned/år)
- Dele oppsummering på sosiale medier
- Brukerprofil med historikk
- Rangliste over mest "reddet"-dager
- "Kaffeart-statistikk" – hvilken kaffe redder best?
- Push-notifisering: "Mandag kommer – kaffen venter! ☕"

---

**Laget 2026-10-21 — Klar for implementering! 🚀**
