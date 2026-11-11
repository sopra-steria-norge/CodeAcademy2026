namespace Kaffebar.Models;

/// <summary>En bruker returnert av API-et, med aktiv/inaktiv-status.</summary>
public sealed record UserResponse(Guid Id, string Name, bool IsActive);
