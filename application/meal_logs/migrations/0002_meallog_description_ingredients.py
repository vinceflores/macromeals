from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("meal_logs", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="meallog",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="meallog",
            name="ingredients",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
