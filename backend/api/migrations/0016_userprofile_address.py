from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("api", "0015_review")]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="province",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="city",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="suburb",
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
