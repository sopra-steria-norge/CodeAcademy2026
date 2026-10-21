using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Registrer OpenAPI-tjenestene. Disse genererer spesifikasjonen
// automatisk basert på endepunktene og typene i prosjektet (code-first).
builder.Services.AddOpenApi();
builder.Services.AddValidation();
builder.Services.AddSingleton<UserStore>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // Eksponerer den genererte spesifikasjonen på /openapi/v1.json
    app.MapOpenApi();

    // Scalar gir et moderne, interaktivt UI på /scalar/v1
    // for å utforske og teste API-et.
    app.MapScalarApiReference();
}

// --- Hello Coffee --------------------------------------------------------
// Et minimal API-endepunkt som returnerer en hardkodet kaffemeny.
// Dette er utgangspunktet for workshopen. Bygg videre herfra!
app.MapGet("/menu", () => new[]
{
    new Coffee(Guid.NewGuid(), "Kaffe Latte", 48.50m),
    new Coffee(Guid.NewGuid(), "Cappuccino", 45.00m),
    new Coffee(Guid.NewGuid(), "Espresso", 35.00m)
})
.WithName("GetMenu")
.WithSummary("Hent kaffemeny")
.WithDescription("Returnerer en liste over alle tilgjengelige kaffedrikker i kaffebaren.");

app.MapPost("/orders", (CreateOrderRequest request, CancellationToken cancellationToken) =>
{
    var order = new OrderResponse(Guid.NewGuid(), request.CoffeeId);
    return TypedResults.Created($"/orders/{order.OrderId}", order);
})
.WithName("CreateOrder")
.WithSummary("Opprett en bestilling")
.WithDescription("Oppretter en bestilling for en kaffe og returnerer ordren med en autogenerert OrderId.");

app.MapPost("/users", (CreateUserRequest request, UserStore users) =>
{
    var user = users.Create(request.Name);
    return TypedResults.Created($"/users/{user.Id}", new UserResponse(user.Id, user.Name));
})
.WithName("CreateUser")
.WithSummary("Opprett en bruker")
.WithDescription("Oppretter en bruker med navn og returnerer brukeren med en autogenerert ID.")
.Produces<UserResponse>(StatusCodes.Status201Created)
.ProducesValidationProblem();

app.MapDelete("/users/{userId:guid}", IResult (Guid userId, UserStore users) =>
{
    if (users.Delete(userId))
    {
        return TypedResults.NoContent();
    }

    return TypedResults.NotFound();
})
.WithName("DeleteUser")
.WithSummary("Slett en bruker")
.WithDescription("Sletter brukeren med angitt ID. Returnerer 404 hvis brukeren ikke finnes.")
.Produces(StatusCodes.Status204NoContent)
.Produces(StatusCodes.Status404NotFound);

app.Run();

// DTO-er kan ligge i Program.cs når prosjektet er lite.
// Etter hvert er det ryddig å flytte dem til egne filer i en Models-mappe.
public record Coffee(Guid Id, string Name, decimal Price);

/// <summary>Inndata for å bestille en kaffe.</summary>
public sealed record CreateOrderRequest
{
    public required Guid CoffeeId { get; init; }
}

/// <summary>En opprettet bestilling med en autogenerert ID.</summary>
public sealed record OrderResponse(Guid OrderId, Guid CoffeeId);

/// <summary>Inndata for å opprette en bruker.</summary>
public sealed record CreateUserRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public string Name { get; init; } = string.Empty;
}

/// <summary>En bruker returnert av API-et.</summary>
public sealed record UserResponse(Guid Id, string Name);

public sealed record User(Guid Id, string Name);

public sealed class UserStore
{
    private static readonly Guid DemoUserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly ConcurrentDictionary<Guid, User> _users = new()
    {
        [DemoUserId] = new User(DemoUserId, "Demo-bruker")
    };

    public User Create(string name)
    {
        while (true)
        {
            var user = new User(Guid.NewGuid(), name);
            if (_users.TryAdd(user.Id, user))
            {
                return user;
            }
        }
    }

    public bool Delete(Guid userId) => _users.TryRemove(userId, out _);
}
