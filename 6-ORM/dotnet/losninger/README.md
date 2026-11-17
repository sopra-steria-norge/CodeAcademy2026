# Løsningsforslag – kun for kursholder

> ⚠️ Ikke del denne mappen med deltakerne. Fjern den før repoet deles, eller legg den i en egen gren.

Hver mappe er et selvstendig prosjekt med løsningsforslaget for nivået, og alle testene er grønne. Løsningen
på nivå N er også utgangspunktet for nivå N+1.

De valgfrie oppgavene har også løsning her, fra nivået de passer etter. Filene, testene og migreringene
heter `Optional…`, og de finnes ikke i startmappene (`nivaa-1` til `nivaa-4`). Deltakerne lager dem selv.

Gjennomgangen, oppgave for oppgave og med svar på refleksjonsspørsmålene, står i [`FASIT.md`](FASIT.md), og
tidsestimatene står nederst der.

```bash
for n in nivaa-*; do (cd "$n" && dotnet test --nologo) && echo "$n OK"; done
```

Oppsett og container-runtime står i [`../README.md`](../README.md).
