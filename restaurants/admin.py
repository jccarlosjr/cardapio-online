from django.contrib import admin
from .models import Restaurant, BusinessHours, RestaurantSettings
# Register your models here.

@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'phone')
    search_fields = ['name', 'slug', 'phone']
    prepopulated_fields = {'slug': ('name',)}

admin.site.register(BusinessHours)
admin.site.register(RestaurantSettings)