"""Maps API resources to their view functions."""

from django.urls import path

from . import views


urlpatterns = [
    path("health/", views.health),
    path("auth/signup/", views.signup),
    path("auth/login/", views.auth_login),
    path("auth/logout/", views.auth_logout),
    path("auth/me/", views.current_user),
    path("auth/profile/", views.update_profile),
    path("users/<int:user_id>/", views.user_profile),
    path("categories/", views.categories),
    path("posts/", views.posts),
    path("posts/mine/", views.my_posts),
    path("posts/<int:post_id>/", views.post_detail),
    path("posts/<int:post_id>/like/", views.post_like),
    path("artists/nearby/", views.nearby_artists),
    path("messages/", views.messages),
    path("messages/<int:recipient_id>/", views.messages),
]
