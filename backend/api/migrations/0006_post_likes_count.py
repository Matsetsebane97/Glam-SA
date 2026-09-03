from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("api", "0005_userprofile_account_type_userprofile_whatsapp_number_message")]

    operations = [
        migrations.AddField(
            model_name="post",
            name="likes_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]