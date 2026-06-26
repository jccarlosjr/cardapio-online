from .models import Customer, Address
from .serializers import CustomerSerializer, AddressSerializer
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from app.permissions import GlobalDefaultPermission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import transaction
from django.shortcuts import get_object_or_404
from restaurants.models import Restaurant
from catalog.models import Product
from orders.models import Order, OrderItem
from decimal import Decimal


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = (IsAuthenticated, GlobalDefaultPermission,)


class AdressViewSet(viewsets.ModelViewSet):
    queryset = Address.objects.all()
    serializer_class = AddressSerializer
    permission_classes = (IsAuthenticated, GlobalDefaultPermission)


class PublicCheckoutView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        data = request.data
        restaurant_id = data.get('restaurant_id')
        restaurant = get_object_or_404(Restaurant, id=restaurant_id)

        customer_data = data.get('customer', {})
        phone = customer_data.get('phone')
        name = customer_data.get('name')
        email = customer_data.get('email')

        if not phone or not name:
            return Response({'error': 'Nome e Telefone são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create customer
        customer, created = Customer.objects.get_or_create(
            phone=phone,
            defaults={'name': name, 'email': email}
        )
        if not created:
            customer.name = name
            if email:
                customer.email = email
            customer.save()

        # Handle Address
        delivery_method = data.get('delivery_method', 'delivery')
        if delivery_method == 'delivery':
            address_data = data.get('address', {})
            zip_code = address_data.get('zip_code')
            street = address_data.get('street')
            number = address_data.get('number')
            neighborhood = address_data.get('neighborhood')
            city = address_data.get('city')
            state = address_data.get('state')
            complement = address_data.get('complement', '')

            if not street or not number or not neighborhood or not city:
                return Response({'error': 'Dados de endereço incompletos.'}, status=status.HTTP_400_BAD_REQUEST)

            address, _ = Address.objects.get_or_create(
                customer=customer,
                zip_code=zip_code,
                street=street,
                number=number,
                neighborhood=neighborhood,
                city=city,
                state=state,
                complement=complement
            )
        else: # pickup
            # Use placeholder for pickup
            address, _ = Address.objects.get_or_create(
                customer=customer,
                street="Retirada no Balcão",
                number="0",
                zip_code="00000-000",
                neighborhood="Balcão",
                city=restaurant.city or "N/A",
                state=restaurant.state or "NA",
                complement=""
            )

        # Calculate Total
        items = data.get('items', [])
        if not items:
            return Response({'error': 'O pedido precisa conter pelo menos um item.'}, status=status.HTTP_400_BAD_REQUEST)

        subtotal = Decimal('0.00')
        order_items_to_create = []

        for item in items:
            product_id = item.get('product_id')
            quantity = int(item.get('quantity', 1))
            notes = item.get('notes', '')
            option_ids = item.get('option_ids', [])

            product = get_object_or_404(Product, id=product_id, restaurant=restaurant)

            try:
                price = product.validate_and_calculate_options(option_ids)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
            subtotal += price * quantity

            order_items_to_create.append({
                'product': product,
                'quantity': quantity,
                'price': price,
                'notes': notes
            })

        # Delivery fee
        delivery_fee = Decimal('0.00')
        if delivery_method == 'delivery' and hasattr(restaurant, 'settings'):
            delivery_fee = restaurant.settings.delivery_fee

        total = subtotal + delivery_fee

        # Create Order
        order = Order.objects.create(
            restaurant=restaurant,
            customer=customer,
            address=address,
            total=total,
            status=Order.StatusChoice.PENDING
        )

        # Create OrderItems
        for o_item in order_items_to_create:
            OrderItem.objects.create(
                order=order,
                product=o_item['product'],
                quantity=o_item['quantity'],
                price=o_item['price'],
                notes=o_item['notes']
            )

        # Generate WhatsApp summary message
        whatsapp_message = f"Olá! Novo pedido realizado via cardápio online:\n\n"
        whatsapp_message += f"*Pedido #{order.id}*\n"
        whatsapp_message += f"Cliente: {customer.name}\n"
        whatsapp_message += f"Contato: {customer.phone}\n"
        whatsapp_message += f"Tipo: {'Entrega' if delivery_method == 'delivery' else 'Retirada no Balcão'}\n"
        
        if delivery_method == 'delivery':
            whatsapp_message += f"Endereço: {address.street}, {address.number} ({address.complement}) - {address.neighborhood}, {address.city}\n"
        
        whatsapp_message += f"\n*Itens:*\n"
        for o_item in order_items_to_create:
            whatsapp_message += f"- {o_item['quantity']}x {o_item['product'].name}"
            if o_item['notes']:
                whatsapp_message += f" ({o_item['notes']})"
            whatsapp_message += f" - R$ {(o_item['price'] * o_item['quantity']):.2f}\n"

        whatsapp_message += f"\nSubtotal: R$ {subtotal:.2f}\n"
        if delivery_method == 'delivery':
            whatsapp_message += f"Taxa de Entrega: R$ {delivery_fee:.2f}\n"
        whatsapp_message += f"*Total: R$ {total:.2f}*\n\n"
        
        payment_map = {
            'pix': 'PIX',
            'money': 'Dinheiro',
            'card_credit': 'Cartão de Crédito na entrega',
            'card_debit': 'Cartão de Débito na entrega'
        }
        pm_name = payment_map.get(data.get('payment_method'), data.get('payment_method', 'N/A'))
        whatsapp_message += f"Forma de Pagamento: {pm_name}\n"
        if data.get('payment_method') == 'money' and data.get('change_for'):
            whatsapp_message += f"Troco para: R$ {float(data.get('change_for')):.2f}\n"

        # Return response
        return Response({
            'order_id': order.id,
            'whatsapp_message': whatsapp_message,
            'restaurant_phone': restaurant.phone
        }, status=status.HTTP_201_CREATED)

