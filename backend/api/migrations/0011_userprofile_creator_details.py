from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_post_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="profile_photo_url",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="bio",
            field=models.TextField(blank=True, max_length=600),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="service_categories",
            field=models.CharField(blank=True, max_length=180),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="travel_radius_km",
            field=models.PositiveIntegerField(default=15),
        ),
    ]
