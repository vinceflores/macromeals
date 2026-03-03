from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# Register your models here.
class CustomUserAdmin(UserAdmin):
    
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name')}),
      
        ('Macro Goals', {
            'fields': ('daily_calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal', 'water_goal')
        }),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    
    list_display = ['email', 'daily_calorie_goal', 'is_staff']

admin.site.register(CustomUser, CustomUserAdmin)