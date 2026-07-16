"""
WSGI configuration for PythonAnywhere.

Instructions:
1. Go to Web tab in PythonAnywhere dashboard
2. Under "Code", set "WSGI configuration file" to point to this file
3. OR copy the content below into the PA WSGI file

How PA finds Django:
- It sets DJANGO_SETTINGS_MODULE=config.settings.prod
- django.middleware.security.SecurityMiddleware handles HTTPS redirect
- Whitenoise serves static files
"""

import os
import sys

# Add the project root to the Python path
path = '/home/tuusuario/pizzeria-backend'
if path not in sys.path:
    sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.prod'

from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise

application = get_wsgi_application()

# Serve static files through Whitenoise
from django.conf import settings
application = WhiteNoise(application, root=settings.STATIC_ROOT)
