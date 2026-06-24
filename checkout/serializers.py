from .models import Customer, Address
from rest_framework import serializers


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email']


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'zip_code', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'customer']
