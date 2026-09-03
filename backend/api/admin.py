from django.contrib import admin

from .models import Message, Post, UserProfile


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("creator", "service", "location", "likes_count", "created_at")
    list_filter = ("media_type", "created_at", "location")
    search_fields = ("creator", "handle", "service", "caption", "location")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "account_type", "location_label", "whatsapp_number")
    list_filter = ("account_type",)
    search_fields = ("user__username", "user__email", "location_label", "whatsapp_number")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("sender", "recipient", "post", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("sender__username", "recipient__username", "body")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


admin.site.site_header = "Glam SA administration"
admin.site.site_title = "Glam SA admin"
admin.site.index_title = "Manage Glam SA"
