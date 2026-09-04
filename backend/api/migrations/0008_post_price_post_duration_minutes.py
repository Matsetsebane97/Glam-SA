from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0007_booking_availabilityslot_serviceoffering"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="price",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="post",
            name="duration_minutes",
            field=models.PositiveIntegerField(default=60),
        ),
    ]