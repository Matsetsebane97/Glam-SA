from django.db import migrations


def rename_hair_category(apps, schema_editor):
    Post = apps.get_model("api", "Post")
    UserProfile = apps.get_model("api", "UserProfile")

    Post.objects.filter(category="Hair").update(category="Bridal")
    for profile in UserProfile.objects.exclude(service_categories=""):
        categories = ["Bridal" if category.strip() == "Hair" else category.strip() for category in profile.service_categories.split(",")]
        profile.service_categories = ",".join(dict.fromkeys(category for category in categories if category))
        profile.save(update_fields=["service_categories"])


class Migration(migrations.Migration):
    dependencies = [("api", "0013_alter_booking_status")]

    operations = [migrations.RunPython(rename_hair_category, migrations.RunPython.noop)]
