using Kaffebar.Models;

namespace Kaffebar.Services;

public interface IUserService
{
    IReadOnlyList<UserResponse> GetActiveUsers(CancellationToken cancellationToken);
}
