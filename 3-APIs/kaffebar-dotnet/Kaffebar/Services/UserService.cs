using Kaffebar.Models;

namespace Kaffebar.Services;

public sealed class UserService(IEnumerable<User> users) : IUserService
{
    private readonly User[] _users = users.ToArray();

    public IReadOnlyList<UserResponse> GetActiveUsers(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return _users
            .Where(user => user.IsActive)
            .Select(user => new UserResponse(user.Id, user.Name, user.IsActive))
            .ToArray();
    }
}
