
from django.utils import timezone
from ..models import WaterLog
import numpy as np
from django.db.models import Sum

class WaterLogService:
    def getCurrentDay(user, date = None):

        if date is None:
            date = timezone.now().date()
        
       
        result = WaterLog.objects.filter(user=user, date_logged = date).aggregate(total=Sum("water"))

       
        return round(result["total"] or 0, 2)



