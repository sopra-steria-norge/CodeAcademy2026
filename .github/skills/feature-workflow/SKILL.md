---
name: feature-workflow
description: "Følg teamets arbeidsflyt for kodeendringer: avklar krav, legg fram plan for godkjenning, implementer, test og oppsummer. Bruk ved nye features og bugfikser."
---

# Arbeidsflyt for kodeendringer

1. **Forstå:** Les relevant kode og dokumentasjon. Spør brukeren hvis kravet eller omfanget er uklart.
2. **Planlegg:** Presenter en kort plan og vent på godkjenning før du endrer filer.
3. **Test først:** Når prosjektet har et relevant testoppsett, skriv eller oppdater tester og bekreft at nye tester feiler av forventet grunn. Hvis det ikke finnes et testoppsett, si fra og bruk prosjektets tilgjengelige verifisering.
4. **Implementer:** Gjør den minste komplette endringen som oppfyller kravet; følg lokale mønstre og ikke implementer senere oppgaver uten at brukeren ber om det. For nye REST-endepunkter, bruk skillen `nytt-endepunkt`.
5. **Verifiser:** Kjør relevante tester. Kjør lint og bygg hvis prosjektet har dem, og rapporter hva som ikke kunne kjøres.
6. **Oppsummer:** Beskriv endringen, verifiseringen og eventuelle avvik eller oppfølgingspunkter.

Bruk [sikkerhetssjekklisten](./sjekkliste.md) når endringen berører tillitsgrenser, tilgang, sensitive data, nettverk, logging eller feilbehandling. Vurder bare punktene som gjelder for den aktuelle koden.
