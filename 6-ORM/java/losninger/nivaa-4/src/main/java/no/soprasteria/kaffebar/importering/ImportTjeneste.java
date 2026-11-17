package no.soprasteria.kaffebar.importering;

import jakarta.persistence.EntityManagerFactory;
import no.soprasteria.kaffebar.domene.Bestilling;
import no.soprasteria.kaffebar.domene.Bestillingslinje;
import no.soprasteria.kaffebar.domene.Kaffebonne;

import java.util.List;

/**
 * Importerer bestillinger fra nettbutikken.
 *
 * <p>I tillegg til denne klassen er JDBC-batching slått på i persistence.xml:
 * <ul>
 *   <li>{@code hibernate.jdbc.batch_size=50}: opptil 50 rader per rundtur til databasen.</li>
 *   <li>{@code hibernate.order_inserts=true}: uten denne veksler Hibernate mellom INSERT i bestilling og
 *       bestillingslinje, og hver veksling avslutter batchen.</li>
 * </ul>
 * Batching virker bare med {@code GenerationType.SEQUENCE} (standard her). Med {@code IDENTITY} må Hibernate
 * sende hver INSERT for seg for å få id-en tilbake, og batching skrus av i stillhet.
 */
public class ImportTjeneste {

    /** Bør være lik hibernate.jdbc.batch_size. */
    private static final int BOLKSTORRELSE = 50;

    private final EntityManagerFactory emf;

    public ImportTjeneste(EntityManagerFactory emf) {
        this.emf = emf;
    }

    /**
     * @return antall importerte bestillinger
     */
    public int importer(List<NyBestilling> nyeBestillinger) {
        return emf.callInTransaction(em -> {
            for (int i = 0; i < nyeBestillinger.size(); i++) {
                var ny = nyeBestillinger.get(i);
                var bestilling = new Bestilling(ny.kundenavn(), ny.tidspunkt());
                for (var linje : ny.linjer()) {
                    // getReference: ingen SELECT, og proxyen overlever em.clear() uten å bli lastet
                    var kaffebonne = em.getReference(Kaffebonne.class, linje.kaffebonneId());
                    bestilling.leggTilLinje(new Bestillingslinje(kaffebonne, linje.antall(), linje.enhetspris()));
                }
                em.persist(bestilling);

                // Uten dette holder persistence context på alle 3000 entitetene (pluss øyeblikksbilder for
                // dirty checking) til commit. flush() skriver bolken, clear() slipper den fra minnet.
                if ((i + 1) % BOLKSTORRELSE == 0) {
                    em.flush();
                    em.clear();
                }
            }
            return nyeBestillinger.size();
        });
    }
}
