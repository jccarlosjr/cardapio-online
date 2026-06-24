from .models import Cart, CartItem
from rest_framework import serializers


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = '__all__'
        read_only_fields = ['price']

    def validate(self, attrs):
        product = attrs.get('product') or (self.instance.product if self.instance else None)
        
        # Determine the option IDs (use provided or fallback to existing on patch)
        if 'option_ids' in attrs:
            option_ids = attrs.get('option_ids', [])
        else:
            option_ids = self.instance.option_ids if self.instance else []

        if product:
            try:
                calculated_price = product.validate_and_calculate_options(option_ids)
                attrs['price'] = calculated_price
            except ValueError as e:
                raise serializers.ValidationError(str(e))
                
        return attrs



class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = '__all__'

    def get_total(self, obj):
        return sum(item.price * item.quantity for item in obj.items.all())

