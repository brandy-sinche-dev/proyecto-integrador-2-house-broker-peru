import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def seed_admin():
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@empresa.com', 'admin123')
        print("Administrador creado exitosamente: admin / admin123")
    else:
        print("El usuario admin ya existe en la base de datos.")

if __name__ == '__main__':
    seed_admin()
