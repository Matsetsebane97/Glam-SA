from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_post_price_post_duration_minutes"),
    ]

    operations = [
        migrations.AddField(
            model_name="serviceoffering",
            name="post",
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="service_offering", to="api.post"),
        ),
    ]