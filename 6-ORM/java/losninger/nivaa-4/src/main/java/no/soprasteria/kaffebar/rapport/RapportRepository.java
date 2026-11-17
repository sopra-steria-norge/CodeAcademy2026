package no.soprasteria.kaffebar.rapport;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import org.hibernate.Session;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Dashboardet: de 3 mest solgte kaffebønnene per brenneri per måned, med omsetning.
 *
 * <p>Regler:
 * <ul>
 *   <li>Måneden er måneden til {@code Bestilling.tidspunkt}.</li>
 *   <li>Mest solgt = høyest {@code antallSolgt}. Ved likt antall: høyest omsetning, deretter kaffebønnens navn
 *       alfabetisk.</li>
 *   <li>Radene sorteres på brenneri, måned og plassering.</li>
 * </ul>
 */
public class RapportRepository {

    /**
     * {@code GROUP BY} + {@code LIMIT 3} gir topp 3 totalt, ikke per gruppe. ROW_NUMBER() OVER (PARTITION BY ...)
     * nummererer radene innen hver brenneri/måned, og så filtrerer vi på plassering i et ytre ledd.
     */
    private static final String TOPP_BONNER_SQL = """
            WITH salg AS (
                SELECT br.navn                                     AS brenneri,
                       CAST(date_trunc('month', b.tidspunkt) AS date) AS maaned,
                       k.navn                                      AS kaffebonne,
                       SUM(l.antall)                               AS antall_solgt,
                       SUM(l.antall * l.enhetspris)                AS omsetning
                FROM bestillingslinje l
                JOIN bestilling b  ON b.id = l.bestilling_id
                JOIN kaffebonne k  ON k.id = l.kaffebonne_id
                JOIN brenneri br   ON br.id = k.brenneri_id
                GROUP BY br.navn, CAST(date_trunc('month', b.tidspunkt) AS date), k.navn
            ),
            rangert AS (
                SELECT salg.*,
                       ROW_NUMBER() OVER (
                           PARTITION BY brenneri, maaned
                           ORDER BY antall_solgt DESC, omsetning DESC, kaffebonne
                       ) AS plassering
                FROM salg
            )
            SELECT brenneri, maaned, plassering, kaffebonne, antall_solgt, omsetning
            FROM rangert
            WHERE plassering <= 3
            ORDER BY brenneri, maaned, plassering
            """;

    private final EntityManager em;

    public RapportRepository(EntityManager em) {
        this.em = em;
    }

    /**
     * Rapporten med {@code em.createNativeQuery(sql, Tuple.class)}.
     */
    public List<RapportRad> toppBonnerMedNativeQuery() {
        // Hibernate flusher persistence context før en native query (den vet ikke hvilke tabeller
        // SQL-en leser), så rapporten ser også endringer som ikke er committet i denne transaksjonen.
        @SuppressWarnings("unchecked")
        List<Tuple> rader = em.createNativeQuery(TOPP_BONNER_SQL, Tuple.class).getResultList();

        return rader.stream()
                .map(rad -> new RapportRad(
                        rad.get("brenneri", String.class),
                        tilLocalDate(rad.get("maaned")),
                        ((Number) rad.get("plassering")).intValue(),
                        rad.get("kaffebonne", String.class),
                        ((Number) rad.get("antall_solgt")).longValue(),
                        (BigDecimal) rad.get("omsetning")))
                .toList();
    }

    /**
     * Rapporten med ren JDBC via {@code em.unwrap(Session.class).doReturningWork(...)}.
     */
    public List<RapportRad> toppBonnerMedJdbc() {
        // doWork/doReturningWork gir oss JDBC-tilkoblingen direkte, og Hibernate vet ingenting om hva vi
        // gjør med den. Den flusher derfor ikke ventende endringer først. Uten em.flush() ser ikke
        // rapporten bestillinger som er persistert, men ennå ikke skrevet, i samme transaksjon.
        // flush() krever en aktiv transaksjon – uten transaksjon finnes det heller ingenting å flushe.
        if (em.isJoinedToTransaction()) {
            em.flush();
        }

        return em.unwrap(Session.class).doReturningWork(connection -> {
            try (var statement = connection.prepareStatement(TOPP_BONNER_SQL);
                 var resultat = statement.executeQuery()) {
                var rapport = new ArrayList<RapportRad>();
                while (resultat.next()) {
                    rapport.add(new RapportRad(
                            resultat.getString("brenneri"),
                            resultat.getObject("maaned", LocalDate.class),
                            resultat.getInt("plassering"),
                            resultat.getString("kaffebonne"),
                            resultat.getLong("antall_solgt"),
                            resultat.getBigDecimal("omsetning")));
                }
                return rapport;
            }
        });
    }

    private static LocalDate tilLocalDate(Object verdi) {
        return switch (verdi) {
            case LocalDate dato -> dato;
            case Date dato -> dato.toLocalDate();
            default -> throw new IllegalArgumentException("Uventet datotype: " + verdi.getClass());
        };
    }
}
