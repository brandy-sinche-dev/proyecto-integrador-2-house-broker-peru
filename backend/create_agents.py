import os
django.setup()
from django.contrib.auth import get_user_model
from apps.users.models import UserProfile, Role

User = get_user_model()

for i in range(1, 21):
    username = f'agente{i}@housebroker.pe'
    if not User.objects.filter(username=username).exists():
        user = User.objects.create_user(username=username, email=username, password='password123')
        UserProfile.objects.create(user=user, full_name=f'Agente de Bienes Raíces {i}', role=Role.AGENTE)
        print(f'Created {username}')

