package no.soprasteria.kaffebar.repository;

import jakarta.persistence.EntityManager;
import no.soprasteria.kaffebar.domene.Bestilling;

import java.util.List;

public class KaffebarRepository {

    private final EntityManager em;

    public KaffebarRepository(EntityManager em) {
        this.em = em;
    }

    /**
     * Henter alle bestillinger i databasen.
     */
    public List<Bestilling> hentAlleBestillinger() {
        return em.createQuery("SELECT b FROM Bestilling b", Bestilling.class)
                .getResultList();
    }
}
