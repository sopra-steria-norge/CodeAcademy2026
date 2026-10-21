using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Kaffebar.Models;
using Kaffebar.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Kaffebar.Tests;

public sealed class ActiveUsersTests
{
    [Theory]
    [InlineData(0, 0)]
    [InlineData(0, 3)]
    [InlineData(3, 0)]
    [InlineData(3, 2)]
    [InlineData(200, 5)]
    public async Task ActiveUsers_ReturnsExactlyAllActiveUsers(int activeCount, int inactiveCount)
    {
        var users = Enumerable.Range(0, activeCount + inactiveCount)
            .Select(index => new User(Guid.NewGuid(), $"User {index}", index < activeCount))
            .Reverse()
            .ToArray();
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            {
                services.RemoveAll<IUserService>();
                services.AddSingleton<IUserService>(new UserService(users));
            }));
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/users/active");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        var actual = await response.Content.ReadFromJsonAsync<UserResponse[]>();
        Assert.NotNull(actual);
        var expected = users.Where(user => user.IsActive)
            .Select(user => new UserResponse(user.Id, user.Name, true))
            .ToArray();
        Assert.Equal(expected, actual);

        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Array, json.RootElement.ValueKind);
        foreach (var user in json.RootElement.EnumerateArray())
        {
            Assert.Equal(3, user.EnumerateObject().Count());
            Assert.True(user.GetProperty("id").TryGetGuid(out _));
            Assert.Equal(JsonValueKind.String, user.GetProperty("name").ValueKind);
            Assert.True(user.GetProperty("isActive").GetBoolean());
        }
    }

    [Fact]
    public async Task ActiveUsers_DefaultDataReturnsAdaAndGrace()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var users = await client.GetFromJsonAsync<UserResponse[]>("/users/active");

        Assert.NotNull(users);
        Assert.Equal(["Ada", "Grace"], users.Select(user => user.Name));
        Assert.All(users, user => Assert.True(user.IsActive));
    }

    [Fact]
    public async Task OpenApi_DescribesActiveUsersAsArrayWithUserSchema()
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var endpoint = json.RootElement.GetProperty("paths").GetProperty("/users/active").GetProperty("get");
        Assert.Equal("GetActiveUsers", endpoint.GetProperty("operationId").GetString());
        var schema = endpoint.GetProperty("responses").GetProperty("200")
            .GetProperty("content").GetProperty("application/json").GetProperty("schema");
        Assert.Equal("array", schema.GetProperty("type").GetString());
        Assert.Equal("#/components/schemas/UserResponse",
            schema.GetProperty("items").GetProperty("$ref").GetString());
        var properties = json.RootElement.GetProperty("components").GetProperty("schemas")
            .GetProperty("UserResponse").GetProperty("properties");
        Assert.Equal("boolean", properties.GetProperty("isActive").GetProperty("type").GetString());
    }

    [Fact]
    public async Task Scalar_ServesUiConfiguredToLoadOpenApi()
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/scalar/v1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("scalar", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("\"url\":\"openapi/v1.json\"", html);
    }

    [Fact]
    public async Task Menu_StillReturnsOriginalCoffeeMenu()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/menu");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var menu = await response.Content.ReadFromJsonAsync<Coffee[]>();
        Assert.NotNull(menu);
        Assert.Equal(["Kaffe Latte", "Cappuccino", "Espresso"], menu.Select(coffee => coffee.Name));
        Assert.Equal([48.50m, 45.00m, 35.00m], menu.Select(coffee => coffee.Price));
    }
}
