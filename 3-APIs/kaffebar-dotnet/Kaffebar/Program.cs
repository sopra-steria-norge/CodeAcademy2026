using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Registrer OpenAPI-tjenestene. Disse genererer spesifikasjonen
// automatisk basert på endepunktene og typene i prosjektet (code-first).
builder.Services.AddOpenApi();

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
