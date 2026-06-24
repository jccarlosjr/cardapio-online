from django.db import models
from django.utils.text import slugify


class Restaurant(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, blank=True, null=True)
    phone = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='restaurants/logos', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    zip_code = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=100, blank=True, null=True)
    number = models.CharField(max_length=100, blank=True, null=True)
    neighborhood = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=2, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Restaurante'
        verbose_name_plural = 'Restaurantes'


class RestaurantSettings(models.Model):
    restaurant = models.OneToOneField(Restaurant, on_delete=models.CASCADE, related_name='settings')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    pix_key = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        verbose_name = 'Configuração do Restaurante'
        verbose_name_plural = 'Configurações do Restaurante'

    def __str__(self):
        return f'Configurações de {self.restaurant.name}'


class BusinessHours(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='business_hours')
    day_of_week = models.IntegerField(choices=[(0, 'Domingo'), (1, 'Segunda'), (2, 'Terça'), (3, 'Quarta'), (4, 'Quinta'), (5, 'Sexta'), (6, 'Sábado')])
    open_time = models.TimeField(null=True, blank=True)
    close_time = models.TimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Horário de Funcionamento'
        verbose_name_plural = 'Horários de Funcionamento'

        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'day_of_week'],
                name='unique_business_hour_per_day'
            )
        ]

    def __str__(self):
        return f'{self.restaurant.name} - {self.get_day_of_week_display()} {self.open_time} - {self.close_time}'
