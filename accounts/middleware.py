from django.contrib.sessions.models import Session
from django.utils import timezone
from .models import UserSession
from django.contrib import messages


class ConcurrentLoginMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = request.user

        if user.is_authenticated:
            current_session_key = request.session.session_key
            sessions_to_expire = Session.objects.filter(
                expire_date__gte=timezone.now(),
                session_key__in=UserSession.objects.filter(user=user, logout_time__isnull=True).values_list('session_key', flat=True)
            )

            session_expired = False
            for session in sessions_to_expire:
                if session.session_key != current_session_key:
                    session.expire_date = timezone.now()
                    session.save()
                    session_expired = True

            if session_expired:
                messages.warning(request, 'Você foi desconectado por outro dispositivo.')

            UserSession.objects.filter(
                user=user,
                logout_time__isnull=True,
                session_key__in=UserSession.objects.exclude(session_key=current_session_key, logout_time__isnull=True).values_list('session_key', flat=True)
            ).delete()

            user_session, created = UserSession.objects.get_or_create(
                user=user,
                session_key=current_session_key,
                logout_time__isnull=True,
                defaults={'login_time': timezone.now()}
            )

            if not created:
                user_session.login_time = timezone.now()
                user_session.save()

        response = self.get_response(request)
        return response
