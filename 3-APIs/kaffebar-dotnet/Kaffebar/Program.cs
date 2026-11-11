using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddValidation();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton<OrderStore>();
builder.Services.AddSingleton<RatingStore>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapGet("/menu", () => CoffeeMenu.All)
    .WithName("GetMenu")
    .WithSummary("Hent kaffemeny")
    .WithDescription("Returnerer en liste over alle tilgjengelige kaffedrikker i kaffebaren.");

app.MapGet("/orders", IResult (
    OrderStore orders,
    OrderStatus? status = null,
    int limit = 100,
    int offset = 0) =>
{
    if (limit is < 1 or > 100 || offset < 0)
    {
        return TypedResults.BadRequest(new { message = "limit må være 1–100 og offset kan ikke være negativ." });
    }

    return TypedResults.Ok(orders.List(status, limit, offset));
})
    .WithName("ListOrders")
    .WithSummary("Hent bestillinger")
    .WithDescription("Returnerer bestillinger, nyeste først. Kan filtreres på status og pagineres med limit og offset.")
    .Produces<Order[]>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest);

app.MapPost("/orders", IResult (CreateOrderRequest request, OrderStore orders) =>
{
    var coffee = CoffeeMenu.Find(request.CoffeeId);
    if (coffee is null)
    {
        return TypedResults.NotFound();
    }

    var order = orders.Create(request, coffee);
    return TypedResults.Created($"/orders/{order.OrderId}", order);
})
    .WithName("CreateOrder")
    .WithSummary("Opprett en bestilling")
    .WithDescription("Oppretter en bestilling med status PENDING.")
    .Produces<Order>(StatusCodes.Status201Created)
    .Produces(StatusCodes.Status404NotFound)
    .ProducesValidationProblem();

app.MapGet("/orders/{orderId:guid}", IResult (Guid orderId, OrderStore orders) =>
{
    var order = orders.Get(orderId);
    return order is null ? TypedResults.NotFound() : TypedResults.Ok(order);
})
    .WithName("GetOrder")
    .WithSummary("Hent én bestilling")
    .Produces<Order>()
    .Produces(StatusCodes.Status404NotFound);

app.MapPatch("/orders/{orderId:guid}", IResult (
    Guid orderId,
    UpdateOrderStatusRequest request,
    OrderStore orders) =>
{
    if (!Enum.IsDefined(request.Status))
    {
        return TypedResults.BadRequest(new { message = "Ukjent ordrestatus." });
    }

    var result = orders.TryUpdateStatus(orderId, request.Status, out var updated);
    return result switch
    {
        OrderStatusUpdateResult.NotFound => TypedResults.NotFound(),
        OrderStatusUpdateResult.Conflict => TypedResults.Conflict(
            new { message = "Ordren må følge statusflyten PENDING → BREWING → READY." }),
        OrderStatusUpdateResult.Updated => TypedResults.Ok(updated),
        _ => throw new InvalidOperationException("Ukjent resultat fra statusoppdateringen.")
    };
})
    .WithName("UpdateOrderStatus")
    .WithSummary("Oppdater status på en bestilling")
    .WithDescription("Flytter en bestilling ett steg videre: PENDING → BREWING → READY.")
    .Produces<Order>()
    .Produces(StatusCodes.Status404NotFound)
    .Produces(StatusCodes.Status409Conflict)
    .Produces(StatusCodes.Status400BadRequest)
    .ProducesValidationProblem();

app.MapPost("/orders/{orderId:guid}/rating", IResult (
    Guid orderId,
    CreateRatingRequest request,
    OrderStore orders,
    RatingStore ratings) =>
{
    if (request.Rating is null || !Enum.IsDefined(request.Rating.Value))
    {
        return TypedResults.BadRequest(new { message = "Velg en gyldig kaffevurdering." });
    }

    var order = orders.Get(orderId);
    if (order is null || !orders.IsOwnedBy(orderId, UserStore.DemoUserId))
    {
        return TypedResults.NotFound();
    }

    if (order.Status != OrderStatus.READY)
    {
        return TypedResults.Conflict(new { message = "Du kan vurdere en bestilling når den er klar." });
    }

    return TypedResults.Created(
        $"/orders/{orderId}/rating",
        ratings.Upsert(orderId, UserStore.DemoUserId, request.Rating.Value));
})
    .WithName("CreateOrderRating")
    .WithSummary("Vurder en ferdig bestilling")
    .WithDescription("Lagrer eller oppdaterer brukerens vurdering av en ferdig bestilling.")
    .Produces<OrderRating>(StatusCodes.Status201Created)
    .Produces(StatusCodes.Status404NotFound)
    .Produces(StatusCodes.Status409Conflict)
    .Produces(StatusCodes.Status400BadRequest);

app.MapGet("/orders/{orderId:guid}/rating", IResult (
    Guid orderId,
    OrderStore orders,
    RatingStore ratings) =>
{
    if (orders.Get(orderId) is null || !orders.IsOwnedBy(orderId, UserStore.DemoUserId))
    {
        return TypedResults.NotFound();
    }

    var rating = ratings.Get(orderId, UserStore.DemoUserId);
    return rating is null ? TypedResults.NotFound() : TypedResults.Ok(rating);
})
    .WithName("GetOrderRating")
    .WithSummary("Hent vurdering for en bestilling")
    .Produces<OrderRating>()
    .Produces(StatusCodes.Status404NotFound);

app.MapGet("/users/{userId:guid}/weekly-summary", IResult (
    Guid userId,
    UserStore users,
    RatingStore ratings) =>
{
    if (!users.Exists(userId))
    {
        return TypedResults.NotFound();
    }

    return TypedResults.Ok(ratings.GetWeeklySummary(userId));
})
    .WithName("GetWeeklySummary")
    .WithSummary("Hent ukas kaffeoppsummering")
    .WithDescription("Viser vurderinger fra inneværende uke, regnet fra mandag i UTC.")
    .Produces<WeeklySummary>()
    .Produces(StatusCodes.Status404NotFound);

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
    return users.Delete(userId) ? TypedResults.NoContent() : TypedResults.NotFound();
})
    .WithName("DeleteUser")
    .WithSummary("Slett en bruker")
    .WithDescription("Sletter brukeren med angitt ID. Returnerer 404 hvis brukeren ikke finnes.")
    .Produces(StatusCodes.Status204NoContent)
    .Produces(StatusCodes.Status404NotFound);

app.Run();

public record Coffee(Guid Id, string Name, double Price);

public enum OrderStatus
{
    PENDING,
    BREWING,
    READY
}

public enum OrderStatusUpdateResult
{
    Updated,
    NotFound,
    Conflict
}

public enum CoffeeSize
{
    SMALL,
    MEDIUM,
    LARGE
}

public enum MilkType
{
    WHOLE,
    SKIMMED,
    OAT,
    SOY
}

public enum CoffeeRating
{
    SAVED_MY_MORNING,
    PRETTY_OK,
    TASTED_LIKE_A_HUG
}

public sealed record CreateOrderRequest
{
    [Required]
    public required Guid CoffeeId { get; init; }

    [Required, StringLength(50, MinimumLength = 2), RegularExpression(@".*\S.*")]
    public required string CustomerName { get; init; }

    [Required]
    public required CoffeeSize Size { get; init; }

    public MilkType? MilkType { get; init; }
    public bool? ExtraShot { get; init; }

    [Range(1, 10)]
    public int Quantity { get; init; } = 1;
}

public sealed record UpdateOrderStatusRequest
{
    [Required]
    public required OrderStatus Status { get; init; }
}

public sealed record CreateRatingRequest
{
    public CoffeeRating? Rating { get; init; }
}

public sealed record Order(
    Guid OrderId,
    Guid CoffeeId,
    string CoffeeName,
    string CustomerName,
    CoffeeSize Size,
    MilkType? MilkType,
    bool? ExtraShot,
    int Quantity,
    OrderStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record OrderRating(
    Guid OrderId,
    Guid UserId,
    CoffeeRating Rating,
    DayOfWeek DayOfWeek,
    DateTimeOffset CreatedAt);

public sealed record RatingMessage(string Text, DayOfWeek? FocusDay);

public sealed record WeeklySummary(
    int SavedMondaysCount,
    int SavedTuesdaysCount,
    int SavedWednesdaysCount,
    int SavedThursdaysCount,
    int SavedFridaysCount,
    int SavedSaturdaysCount,
    int SavedSundaysCount,
    Dictionary<string, int> RatingCounts,
    List<RatingMessage> Messages);

public sealed record CreateUserRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public string Name { get; init; } = string.Empty;
}

public sealed record UserResponse(Guid Id, string Name);
public sealed record User(Guid Id, string Name);

public static class CoffeeMenu
{
    public static readonly Coffee[] All =
    [
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000001"), "Filterkaffe", 39),
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000002"), "Espresso", 35),
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000003"), "Dobbel espresso", 45),
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000004"), "Americano", 42),
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000005"), "Cortado", 47),
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000006"), "Cappuccino", 49),
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000007"), "Kaffe Latte", 52),
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000008"), "Flat White", 55),
        new(Guid.Parse("c0ffee01-0000-4000-8000-000000000009"), "Chai Latte", 54),
        new(Guid.Parse("c0ffee01-0000-4000-8000-00000000000a"), "Mocha", 59)
    ];

    public static Coffee? Find(Guid id) => All.FirstOrDefault(coffee => coffee.Id == id);
}

public sealed class OrderStore
{
    private readonly ConcurrentDictionary<Guid, Order> _orders = new();
    private readonly ConcurrentDictionary<Guid, Guid> _owners = new();

    public Order Create(CreateOrderRequest request, Coffee coffee)
    {
        var now = DateTimeOffset.UtcNow;
        var order = new Order(
            Guid.NewGuid(),
            coffee.Id,
            coffee.Name,
            request.CustomerName.Trim(),
            request.Size,
            request.MilkType,
            request.ExtraShot,
            request.Quantity,
            OrderStatus.PENDING,
            now,
            now);

        _orders[order.OrderId] = order;
        _owners[order.OrderId] = UserStore.DemoUserId;
        return order;
    }

    public Order? Get(Guid orderId) => _orders.GetValueOrDefault(orderId);

    public bool IsOwnedBy(Guid orderId, Guid userId) =>
        _owners.TryGetValue(orderId, out var ownerId) && ownerId == userId;

    public Order[] List(OrderStatus? status, int limit, int offset) =>
        _orders.Values
            .Where(order => status is null || order.Status == status)
            .OrderByDescending(order => order.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToArray();

    public OrderStatusUpdateResult TryUpdateStatus(
        Guid orderId,
        OrderStatus status,
        out Order? updated)
    {
        while (true)
        {
            if (!_orders.TryGetValue(orderId, out var current))
            {
                updated = null;
                return OrderStatusUpdateResult.NotFound;
            }

            if (NextStatus(current.Status) != status)
            {
                updated = null;
                return OrderStatusUpdateResult.Conflict;
            }

            var candidate = current with { Status = status, UpdatedAt = DateTimeOffset.UtcNow };
            if (_orders.TryUpdate(orderId, candidate, current))
            {
                updated = candidate;
                return OrderStatusUpdateResult.Updated;
            }
        }
    }

    private static OrderStatus? NextStatus(OrderStatus status) => status switch
    {
        OrderStatus.PENDING => OrderStatus.BREWING,
        OrderStatus.BREWING => OrderStatus.READY,
        _ => null
    };
}

public sealed class RatingStore
{
    private readonly ConcurrentDictionary<Guid, OrderRating> _ratings = new();

    public OrderRating Upsert(Guid orderId, Guid userId, CoffeeRating rating)
    {
        var now = DateTimeOffset.UtcNow;
        var entry = new OrderRating(orderId, userId, rating, now.DayOfWeek, now);
        _ratings[orderId] = entry;
        return entry;
    }

    public OrderRating? Get(Guid orderId, Guid userId) =>
        _ratings.TryGetValue(orderId, out var rating) && rating.UserId == userId ? rating : null;

    public WeeklySummary GetWeeklySummary(Guid userId)
    {
        var now = DateTimeOffset.UtcNow;
        var utcDate = now.UtcDateTime.Date;
        var startOfWeek = new DateTimeOffset(
            utcDate.AddDays(-(((int)now.DayOfWeek + 6) % 7)),
            TimeSpan.Zero);
        var weeklyRatings = _ratings.Values
            .Where(rating => rating.UserId == userId && rating.CreatedAt >= startOfWeek)
            .ToArray();
        var savedRatings = weeklyRatings
            .Where(rating => rating.Rating == CoffeeRating.SAVED_MY_MORNING)
            .ToArray();
        var dayCounts = Enum.GetValues<DayOfWeek>()
            .ToDictionary(day => day, day => savedRatings.Count(rating => rating.DayOfWeek == day));

        var counts = Enum.GetValues<CoffeeRating>()
            .ToDictionary(rating => rating.ToString(), rating => weeklyRatings.Count(item => item.Rating == rating));
        var messages = GenerateMessages(dayCounts, counts, weeklyRatings.Length);

        return new WeeklySummary(
            dayCounts[DayOfWeek.Monday],
            dayCounts[DayOfWeek.Tuesday],
            dayCounts[DayOfWeek.Wednesday],
            dayCounts[DayOfWeek.Thursday],
            dayCounts[DayOfWeek.Friday],
            dayCounts[DayOfWeek.Saturday],
            dayCounts[DayOfWeek.Sunday],
            counts,
            messages);
    }

    private static List<RatingMessage> GenerateMessages(
        Dictionary<DayOfWeek, int> savedCounts,
        Dictionary<string, int> ratingCounts,
        int totalRatings)
    {
        var messages = new List<RatingMessage>();
        if (totalRatings == 0)
        {
            messages.Add(new RatingMessage("Ingen kaffe vurdert denne uka – hvem er du?? ☕", null));
            return messages;
        }

        foreach (var day in Enum.GetValues<DayOfWeek>())
        {
            if (savedCounts[day] >= 4)
            {
                messages.Add(new RatingMessage(
                    $"Du har reddet {savedCounts[day]} {NorwegianDayNames[day]} med kaffe! ☕",
                    day));
            }
        }

        if (savedCounts[DayOfWeek.Saturday] == 0)
        {
            messages.Add(new RatingMessage("En lørdag uten kaffe – du er overmenneske!", DayOfWeek.Saturday));
        }

        if (savedCounts[DayOfWeek.Friday] >= 3)
        {
            messages.Add(new RatingMessage(
                $"Fredag er ditt beste vennskap med kaffe. {savedCounts[DayOfWeek.Friday]} ganger! 🎉",
                DayOfWeek.Friday));
        }

        if (ratingCounts[CoffeeRating.TASTED_LIKE_A_HUG.ToString()] >= 2)
        {
            messages.Add(new RatingMessage("Noen av kaffene dine smakte visst som klemmer... 💔", null));
        }

        if (messages.Count == 0)
        {
            messages.Add(new RatingMessage("Kaffeuka di går helt strålende – fortsett sånn! ☕", null));
        }

        return messages;
    }

    private static readonly Dictionary<DayOfWeek, string> NorwegianDayNames = new()
    {
        [DayOfWeek.Monday] = "mandager",
        [DayOfWeek.Tuesday] = "tirsdager",
        [DayOfWeek.Wednesday] = "onsdager",
        [DayOfWeek.Thursday] = "torsdager",
        [DayOfWeek.Friday] = "fredager",
        [DayOfWeek.Saturday] = "lørdager",
        [DayOfWeek.Sunday] = "søndager"
    };
}

public sealed class UserStore
{
    public static readonly Guid DemoUserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly ConcurrentDictionary<Guid, User> _users = new()
    {
        [DemoUserId] = new User(DemoUserId, "Demo-bruker")
    };

    public bool Exists(Guid userId) => _users.ContainsKey(userId);

    public User Create(string name)
    {
        var user = new User(Guid.NewGuid(), name);
        _users[user.Id] = user;
        return user;
    }

    public bool Delete(Guid userId) => _users.TryRemove(userId, out _);
}
