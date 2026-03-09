
from django.utils   import timezone
from ..models import WaterLog
import numpy as np
from django.db.models import Sum

class WaterLogService:
    def getCurrentDay(user):
        today = timezone.now().date()
        result = WaterLog.objects.filter(user=user, created_at__date=today).aggregate(total=Sum("water"))
        return round(result["total"] or 0, 2)



