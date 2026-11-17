package no.soprasteria.kaffebar.api;

import jakarta.persistence.OptimisticLockException;
import jakarta.persistence.PersistenceException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.Map;

/**
 * Oversetter optimistisk låsefeil til 409 Conflict.
 *
 * <p>Fanger {@link PersistenceException} og ikke bare {@link OptimisticLockException}: når konflikten
 * oppdages ved commit, kommer den pakket inn i en {@code RollbackException}.
 *
 * <p>409 vs. 412: Når klienten har sendt {@code If-Match} og versjonen ikke stemmer, er
 * 412 Precondition Failed den mest presise koden. 409 Conflict passer når konflikten oppdages uten at
 * klienten oppga en versjon (to samtidige forespørsler). Begge forteller klienten at den må hente
 * bestillingen på nytt; retry på serveren gir ikke mening, fordi brukeren tok beslutningen på
 * grunnlag av utdaterte data.
 */
@Provider
public class KonfliktMapper implements ExceptionMapper<PersistenceException> {

    private final UventetFeilMapper uventetFeil = new UventetFeilMapper();

    @Override
    public Response toResponse(PersistenceException exception) {
        if (exception instanceof OptimisticLockException || exception.getCause() instanceof OptimisticLockException) {
            return Response.status(Response.Status.CONFLICT)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("feil", "Bestillingen er endret av noen andre. Hent den på nytt og prøv igjen."))
                    .build();
        }
        return uventetFeil.toResponse(exception);
    }
}
