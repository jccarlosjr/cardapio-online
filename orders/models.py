from django.db import models
from restaurants.models import Restaurant
from catalog.models import Product
from checkout.models import Customer, Address


class Order(models.Model):
    class StatusChoice(models.TextChoices):
        PENDING = 'pending', 'Pendente'
        CONFIRMED = 'confirmed', 'Confirmado'
        PREPARING = 'preparing', 'Em preparo'
        READY = 'ready', 'Pronto para retirada'
        DELIVERING = 'delivering', 'Em entrega'
        DELIVERED = 'delivered', 'Entregue'
        CANCELLED = 'cancelled', 'Cancelado'

    restaurant = models.ForeignKey(Restaurant, on_delete=models.PROTECT, related_name='orders')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='orders')
    address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name='orders')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=StatusChoice.choices, default=StatusChoice.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not is_new:
            try:
                old_instance = Order.objects.get(pk=self.pk)
                old_status = old_instance.status
            except Order.DoesNotExist:
                old_status = None
        else:
            old_status = None

        super().save(*args, **kwargs)

        if not is_new and old_status is not None and old_status != self.status:
            OrderStatusHistory.objects.create(
                order=self,
                old_status=old_status,
                new_status=self.status
            )
    
    def __str__(self):
        return f'Pedido {self.id} - {self.status} - {self.restaurant.name}'

    class Meta:
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    quantity = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f'Item {self.id} - {self.product.name} - {self.order.restaurant.name}'

    class Meta:
        verbose_name = 'Item do pedido'
        verbose_name_plural = 'Itens do pedido'


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, choices=Order.StatusChoice.choices)
    new_status = models.CharField(max_length=20, choices=Order.StatusChoice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Histórico de status do pedido'
        verbose_name_plural = 'Histórico de status dos pedidos'
        ordering = ['-created_at']

    def __str__(self):
        return f'Pedido {self.order.id} - {self.new_status}'

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if not is_new:
            # Se não for um registro novo, buscamos a próxima transição cronológica
            # para atualizar seu `old_status` correspondente.
            next_entry = OrderStatusHistory.objects.filter(
                order=self.order,
                created_at__gte=self.created_at
            ).exclude(pk=self.pk).order_by('created_at', 'id').first()

            if next_entry:
                next_entry.old_status = self.new_status
                next_entry.save()

            # Se for o registro mais recente do histórico, atualiza o status do pedido
            latest = OrderStatusHistory.objects.filter(order=self.order).order_by('-created_at', '-id').first()
            if latest and latest.pk == self.pk:
                Order.objects.filter(pk=self.order.pk).update(status=self.new_status)
