from django.contrib.auth import logout


class InactiveUserMiddleware:
    """End existing sessions when an administrator suspends an account."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated and not request.user.is_active:
            logout(request)
        return self.get_response(request)
