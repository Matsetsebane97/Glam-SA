from django.contrib import admin

from .models import AvailabilitySlot, Booking, Message, Post, ServiceOffering, UserProfile


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("creator", "service", "category", "price", "duration_minutes", "likes_count", "created_at")
    list_filter = ("category", "media_type", "created_at", "location")
    search_fields = ("creator", "handle", "service", "category", "caption", "location")
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


@admin.register(ServiceOffering)
class ServiceOfferingAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "price", "duration_minutes", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "owner__username", "owner__email")
    list_editable = ("price", "duration_minutes", "is_active")
    readonly_fields = ("created_at",)


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("owner", "starts_at", "ends_at", "is_available")
    list_filter = ("is_available", "starts_at")
    search_fields = ("owner__username", "owner__email")
    list_editable = ("is_available",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("service_name", "client", "creator", "price", "starts_at", "status", "created_at")
    list_filter = ("status", "starts_at", "created_at")
    search_fields = (
        "service_name",
        "client__username",
        "client__email",
        "creator__username",
        "creator__email",
        "notes",
    )
    list_editable = ("status",)
    readonly_fields = ("created_at", "price", "starts_at", "ends_at")
    date_hierarchy = "created_at"

    # These actions let the administrator process booking requests in bulk.
    actions = ("mark_confirmed", "mark_declined", "mark_cancelled")

    @admin.action(description="Confirm selected bookings")
    def mark_confirmed(self, request, queryset):
        queryset.update(status="confirmed")

    @admin.action(description="Decline selected bookings")
    def mark_declined(self, request, queryset):
        queryset.update(status="declined")

    @admin.action(description="Cancel selected bookings")
    def mark_cancelled(self, request, queryset):
        queryset.update(status="cancelled")


admin.site.site_header = "Glam SA administration"
admin.site.site_title = "Glam SA admin"
admin.site.index_title = "Manage Glam SA"
