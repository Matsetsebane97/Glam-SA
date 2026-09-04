from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0009_serviceoffering_post"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="category",
            field=models.CharField(blank=True, max_length=80),
        ),
    ]