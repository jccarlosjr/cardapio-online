from django.contrib.auth.forms import AuthenticationForm
from django import forms


class CustomAuthenticationForm(AuthenticationForm):

    username = forms.EmailField(
        label='Email'
    )

    password = forms.CharField(
        widget=forms.PasswordInput
    )