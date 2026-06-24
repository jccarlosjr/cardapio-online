from django.db import models
from restaurants.models import Restaurant


class Category(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['order']
        unique_together = ('restaurant', 'name')

    def __str__(self):
        return self.name


class Product(models.Model):
    restaurant = models.ForeignKey(Restaurant,on_delete=models.CASCADE,related_name='products')
    category = models.ForeignKey(Category,on_delete=models.CASCADE,related_name='products')
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10,decimal_places=2)
    image = models.ImageField(upload_to='products/',blank=True,null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Produto'
        verbose_name_plural = 'Produtos'
        ordering = ['name']

    def __str__(self):
        return self.name

    def validate_and_calculate_options(self, option_ids):
        from decimal import Decimal
        
        # Ensure we have a list of integers
        option_ids = [int(oid) for oid in (option_ids or [])]
        
        # Fetch the selected options
        from catalog.models import ProductOption
        options = ProductOption.objects.filter(id__in=option_ids, active=True)
        
        # Validate that all option IDs exist and are active
        if len(options) != len(set(option_ids)):
            found_ids = set(options.values_list('id', flat=True))
            invalid_ids = set(option_ids) - found_ids
            raise ValueError(f"As seguintes opções são inválidas ou inativas: {list(invalid_ids)}")
            
        # Group selections by option group
        selected_by_group = {}
        for opt in options:
            if opt.group.product_id != self.id:
                raise ValueError(f"A opção '{opt.name}' não pertence ao produto '{self.name}'.")
            selected_by_group.setdefault(opt.group, []).append(opt)
            
        # Validate constraints for each option group
        for group in self.option_groups.all():
            selected_opts = selected_by_group.get(group, [])
            count = len(selected_opts)
            if count < group.min_select:
                raise ValueError(f"O grupo '{group.name}' exige no mínimo {group.min_select} seleções. Você selecionou {count}.")
            if count > group.max_select:
                raise ValueError(f"O grupo '{group.name}' permite no máximo {group.max_select} seleções. Você selecionou {count}.")
                
        # Calculate final price
        additional_price_sum = sum(opt.additional_price for opt in options)
        return self.price + additional_price_sum



class ProductImage(models.Model):
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='images')
    image = models.ImageField(upload_to='products/gallery/')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Imagem de Produto'
        verbose_name_plural = 'Imagens de Produtos'
        ordering = ['order']

    def __str__(self):
        return f'{self.product.name} - Imagem {self.id}'


class ProductOptionGroup(models.Model):
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='option_groups')
    name = models.CharField(max_length=100)
    min_select = models.PositiveIntegerField(default=0)
    max_select = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Grupo de Opções de Produto'
        verbose_name_plural = 'Grupos de Opções de Produtos'
        ordering = ['order']

    def __str__(self):
        return f'{self.product.name} - {self.name}'


class ProductOption(models.Model):
    group = models.ForeignKey(ProductOptionGroup,on_delete=models.CASCADE,related_name='options')
    name = models.CharField(max_length=100)
    additional_price = models.DecimalField(max_digits=10,decimal_places=2,default=0)
    active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Opção de Produto'
        verbose_name_plural = 'Opções de Produtos'
        ordering = ['order']

    def __str__(self):
        return self.name
