using Kaffebar.Services;

namespace Kaffebar.Endpoints;

public static class UserEndpoints
{
    public static void MapUsers(this WebApplication app)
    {
        app.MapGet("/users/active", (IUserService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(service.GetActiveUsers(cancellationToken)))
            .WithName("GetActiveUsers")
            .WithSummary("Hent aktive brukere")
            .WithDescription("Returnerer alle brukere med isActive=true, eller en tom liste hvis ingen er aktive.");
    }
}
