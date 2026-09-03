from django.conf import settings
from django.urls import include, path, re_path
from django.http import FileResponse
from django.views.static import serve
from pathlib import Path


FRONTEND_INDEX = Path(settings.BASE_DIR) / "static" / "app" / "index.html"


def frontend(request):
    return FileResponse(FRONTEND_INDEX.open("rb"))


urlpatterns = [
    path("api/", include("api.urls")),
    path("", frontend),
    re_path(r"^(?!static/|media/).+$", frontend),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += [path("assets/<path:path>", serve, {"document_root": settings.BASE_DIR / "static" / "app" / "assets"})]
