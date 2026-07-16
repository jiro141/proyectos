from .base import *

# ─── Modo producción ────────────────────────────────────────────────────
DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS').split(',')
SECRET_KEY = config('SECRET_KEY')

# ─── CORS ───────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='').split(',')
if not CORS_ALLOWED_ORIGINS or CORS_ALLOWED_ORIGINS == ['']:
    CORS_ALLOW_ALL_ORIGINS = True

# ─── Base de datos (PythonAnywhere) ─────────────────────────────────────
# Por defecto: MySQL (gratis en PA). Podés overridear con PostgreSQL via .env.
# PA te da los datos de MySQL en la pestaña "MySQL" del dashboard.
DATABASES = {
    'default': {
        'ENGINE': config('DB_ENGINE', default='django.db.backends.mysql'),
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='3306'),
        # Opciones necesarias para MySQL en PythonAnywhere
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# ─── Static files con Whitenoise ──────────────────────────────────────
# Whitenoise sirve archivos estáticos sin necesidad de Nginx
MIDDLEWARE.insert(
    1,  # después de SecurityMiddleware, antes de SessionMiddleware
    'whitenoise.middleware.WhiteNoiseMiddleware',
)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ─── Channels/WebSockets (NO disponible en PythonAnywhere) ──────────────
# Se eliminan las apps de channels de la lista
INSTALLED_APPS = [app for app in INSTALLED_APPS if app not in ('daphne', 'channels')]

if 'CHANNEL_LAYERS' in locals():
    del CHANNEL_LAYERS
