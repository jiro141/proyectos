from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# SQLite para desarrollo local (PostgreSQL via Docker para prod)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
