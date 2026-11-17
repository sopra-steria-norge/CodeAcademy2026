package no.soprasteria.kaffebar.kvittering;

import no.soprasteria.kaffebar.domene.Bestilling;

import java.util.List;

public class Kvitteringsskriver {

    /**
     * Lager en tekstlig kvittering for alle bestillingene. Forventet format:
     *
     * <pre>
     * Bestilling 1 – Kari Nordmann
     *   2 x Gatomboya (Tim Wendelboe)
     *   1 x Bombe (Supreme Roastworks)
     * Bestilling 2 – Ola Hansen
     *   3 x Kiambu (Jacu Coffee Roastery)
     * </pre>
     */
    public String lagKvittering(List<Bestilling> bestillinger) {
        var kvittering = new StringBuilder();
        for (var bestilling : bestillinger) {
            kvittering.append("Bestilling %d – %s%n".formatted(bestilling.getId(), bestilling.getKundenavn()));
            // getLinjer() er en lazy samling: første tilgang gir én SELECT per bestilling (N+1)
            for (var linje : bestilling.getLinjer()) {
                // getKaffebonne() og getBrenneri() er proxyer: én SELECT per *unike* bønne/brenneri,
                // resten hentes fra persistence context (1.-nivå-cache). Totalt 1 + 100 + 15 + 5 = 121.
                var kaffebonne = linje.getKaffebonne();
                kvittering.append("  %d x %s (%s)%n".formatted(
                        linje.getAntall(), kaffebonne.getNavn(), kaffebonne.getBrenneri().getNavn()));
            }
        }
        return kvittering.toString();
    }
}
