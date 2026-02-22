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
            'fields': ('dailyCalorieGoal', 'proteinGoal', 'carbsGoal', 'fatGoal', 'waterGoal')
        }),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    
    list_display = ['email', 'dailyCalorieGoal', 'is_staff']

admin.site.register(CustomUser, CustomUserAdmin)