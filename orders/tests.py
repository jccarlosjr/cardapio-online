from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from restaurants.models import Restaurant
from checkout.models import Customer, Address
from orders.models import Order, OrderStatusHistory

User = get_user_model()

class OrderStatusHistoryTestCase(APITestCase):

    def setUp(self):
        # Create standard dependencies
        self.restaurant = Restaurant.objects.create(name='Test Restaurant', phone='123456789')
        self.customer = Customer.objects.create(name='John Doe', phone='987654321', email='john@example.com')
        self.address = Address.objects.create(
            customer=self.customer,
            zip_code='12345-678',
            street='Main St',
            number='100',
            neighborhood='Center',
            city='Test City',
            state='TS'
        )
        # Create user (email is USERNAME_FIELD in CustomUser)
        self.user = User.objects.create_user(email='staff@example.com', password='password123', name='Staff')
        self.user.restaurant = self.restaurant
        self.user.save()

        # Grant change_order permission so they can change status
        change_order_perm = Permission.objects.get(codename='change_order', content_type__app_label='orders')
        self.user.user_permissions.add(change_order_perm)

        # Create Order (initial status 'pending')
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            customer=self.customer,
            address=self.address,
            total=100.00,
            status=Order.StatusChoice.PENDING
        )

    def test_status_history_cascade_and_propagate(self):
        # Change order status to 'confirmed' -> this should create a history entry
        self.order.status = Order.StatusChoice.CONFIRMED
        self.order.save()

        history_1 = OrderStatusHistory.objects.get(order=self.order, new_status=Order.StatusChoice.CONFIRMED)
        self.assertEqual(history_1.old_status, Order.StatusChoice.PENDING)

        # Change order status to 'preparing' -> this should create another history entry
        self.order.status = Order.StatusChoice.PREPARING
        self.order.save()

        history_2 = OrderStatusHistory.objects.get(order=self.order, new_status=Order.StatusChoice.PREPARING)
        self.assertEqual(history_2.old_status, Order.StatusChoice.CONFIRMED)

        # Now edit history_1 new_status to 'ready'
        history_1.new_status = Order.StatusChoice.READY
        history_1.save()

        # Check cascade to history_2
        history_2.refresh_from_db()
        self.assertEqual(history_2.old_status, Order.StatusChoice.READY)

        # Since history_2 is the latest history entry, check that the Order status is NOT affected by history_1 edit
        # Order should still be 'preparing' because history_2 new_status is 'preparing'
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.StatusChoice.PREPARING)

        # Now edit history_2 new_status to 'delivered'
        history_2.new_status = Order.StatusChoice.DELIVERED
        history_2.save()

        # Since history_2 is the latest history entry, the Order status should now change to 'delivered'
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.StatusChoice.DELIVERED)

    def test_api_permission_and_patch(self):
        # Authenticate user
        self.client.login(email='staff@example.com', password='password123')

        # Create history entry by changing status
        self.order.status = Order.StatusChoice.CONFIRMED
        self.order.save()

        history = OrderStatusHistory.objects.get(order=self.order, new_status=Order.StatusChoice.CONFIRMED)

        # Hit API to patch history status to 'preparing'
        # DRF Router registers routers as 'orderstatus-list', 'orderstatus-detail'
        url = reverse('orderstatushistory-detail', kwargs={'pk': history.pk})
        response = self.client.patch(url, {'new_status': Order.StatusChoice.PREPARING}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        history.refresh_from_db()
        self.assertEqual(history.new_status, Order.StatusChoice.PREPARING)

        # Verify order status propagated to 'preparing'
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.StatusChoice.PREPARING)
