from django.db import models
from catalog.models import Product


class Cart(models.Model):
    session_key = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Carrinho'
        verbose_name_plural = 'Carrinhos'

    def __str__(self):
        return self.session_key


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, null=True)
    option_ids = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = 'Item do carrinho'
        verbose_name_plural = 'Itens do carrinho'

    def __str__(self):
        return f'{self.quantity}x {self.product.name} no carrinho {self.cart.session_key}'

