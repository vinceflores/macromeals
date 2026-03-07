from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("meal_logs", "0002_meallog_description_ingredients"),
    ]

    operations = [
        migrations.AddField(
            model_name="meallog",
            name="servings",
            field=models.FloatField(default=1),
        ),
    ]
