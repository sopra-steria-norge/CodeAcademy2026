# Sikkerhetssjekkliste for kode

Bruk sjekklisten når du skriver, endrer eller gjennomgår kode. Ikke alle punktene gjelder for alle prosjekter; vurder dem ut fra hva koden faktisk gjør.

## Input og validering

- [ ] Valider upålitelige data når de krysser en tillitsgrense, for eksempel fra brukere, API-er, opplastede filer eller eksterne tjenester. Kontroller data som allerede er lagret mot integritetsregler der det er relevant.
- [ ] Sjekk datatype, format, lengde, tillatte verdier og grenser. Avvis ugyldig input tydelig.
- [ ] Bruk allowlister der det passer, og normaliser input før den brukes.
- [ ] Bruk parameteriserte spørringer eller ORM-funksjoner; ikke bygg SQL-, shell- eller LDAP-kommandoer ved å sette sammen input.
- [ ] Kod eller escaped data riktig for konteksten når de vises i HTML, JavaScript, URL-er eller logger.

## Identitet og tilgang

- [ ] Krev autentisering der funksjonen ikke skal være offentlig.
- [ ] Kontroller autorisasjon for hver operasjon og hver ressurs; ikke stol på at skjulte knapper eller klientvalidering beskytter data.
- [ ] Bruk minste privilegium for brukere, tjenester, roller og databasekontoer.
- [ ] Kontroller eierskap og tenant-/organisasjonstilhørighet for data som hentes via ID.
- [ ] Håndter passord med en egnet, saltet passordhash; aldri lagre eller logge passord i klartekst.
- [ ] Bruk sikre sesjons- og tokeninnstillinger, og planlegg utløp, tilbakekalling og fornyelse.

## Sensitive data og hemmeligheter

- [ ] Ikke legg passord, API-nøkler, token, private nøkler eller tilkoblingsstrenger i kildekode eller versjonskontroll.
- [ ] Hent hemmeligheter fra godkjent hemmelighetslager eller beskyttet konfigurasjon, og begrens hvem som har tilgang.
- [ ] Ikke returner eller logg mer persondata eller konfidensiell informasjon enn nødvendig.
- [ ] Krypter sensitive data under overføring med TLS og, når nødvendig, ved lagring.
- [ ] Vurder dataminimering, lagringstid, sletting og tilgangslogging for personopplysninger.

## Feilbehandling og logging

- [ ] Håndter forventede feil eksplisitt, og bruk én konsistent strategi for uventede feil.
- [ ] Fang bare feil du kan håndtere. Ikke ignorer feil, returner falsk suksess eller bruk tomme standardverdier som skjuler at noe feilet.
- [ ] Sørg for at feil ikke etterlater data i en delvis eller usikker tilstand; bruk transaksjoner eller opprydding der det trengs.
- [ ] Returner trygge, forståelige feilmeldinger til brukeren. Ikke avslør stack traces, interne stier, SQL, hemmeligheter eller detaljer om infrastrukturen.
- [ ] Logg feil med nok teknisk kontekst til feilsøking, men aldri passord, token, nøkler, sesjons-ID-er eller unødvendige personopplysninger.
- [ ] Bruk strukturert logging og passende alvorlighetsgrad; unngå å logge samme feil flere ganger uten grunn.
- [ ] Ta med en sporings-ID eller korrelasjons-ID slik at en forespørsel kan følges på tvers av tjenester. Ikke bruk sensitive verdier som ID.
- [ ] Beskytt logger mot uautorisert tilgang og manipulering, og vurder maskering, tilgangskontroll og lagringstid.
- [ ] Ikke stol på logginnhold fra brukere: fjern eller kod linjeskift og kontrolltegn for å hindre loggforfalskning.

## Web, API-er og nettverk

- [ ] Bruk HTTPS og sikre standardinnstillinger for transport, informasjonskapsler og sikkerhetsheadere.
- [ ] Begrens CORS til nødvendige opprinnelser, metoder og headere.
- [ ] Beskytt tilstandsendrede nettleserforespørsler mot CSRF der det er relevant.
- [ ] Begrens forespørselsstørrelse, antall kall, samtidighet og tidsbruk for å redusere misbruk og tjenestenekt.
- [ ] Verifiser eksterne tjenesters sertifikater; ikke deaktiver TLS-kontroller for å «fikse» tilkoblingsproblemer.
- [ ] Unngå SSRF: kontroller mål for utgående forespørsler, særlig når URL-er kommer fra input.

## Filer, kommandoer og serialisering

- [ ] Bruk sikre filstier og kontroller at input ikke kan navigere utenfor tiltenkt mappe.
- [ ] Ikke kjør shell-kommandoer med usanitert input; foretrekk API-er fremfor shell når mulig.
- [ ] Begrens filtype og størrelse, og ikke stol på filnavn eller MIME-type alene ved opplasting.
- [ ] Bruk trygge deserialiseringsinnstillinger; ikke deserialiser upålitelige data til vilkårlige objekttyper.

## Avhengigheter, kryptografi og konfigurasjon

- [ ] Bruk vedlikeholdte avhengigheter fra pålitelige kilder, og oppdater sårbare pakker.
- [ ] Ikke implementer egen kryptografi. Bruk etablerte biblioteker og godkjente algoritmer.
- [ ] Bruk sikre standardverdier, og sørg for at feilsøkingsmodus og testhemmeligheter ikke følger med til produksjon.
- [ ] Skill mellom utviklings-, test- og produksjonskonfigurasjon, og begrens produksjonstilgang.

## Før du leverer

- [ ] Test både gyldig input, ugyldig input, manglende tilgang og uventede feil.
- [ ] Legg til tester for tilgangskontroll og for at feilmeldinger og logger ikke lekker sensitive data.
- [ ] Kjør relevante tester, statisk analyse og sikkerhetsskanning av avhengigheter når dette finnes i prosjektet.
- [ ] Gå gjennom endringen med spørsmålet: «Hva skjer hvis inputen er ondsinnet, tjenesten feiler, eller brukeren mangler tilgang?»