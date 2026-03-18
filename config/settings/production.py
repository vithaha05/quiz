from .base import *
import dj_database_url

DEBUG = False

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

# Database configuration for Render
DATABASES['default'] = dj_database_url.config(
    default=env('DATABASE_URL'),
    conn_max_age=600,
    conn_health_checks=True,
)

# Static files for production
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Caching with Redis if available
REDIS_URL = env('REDIS_URL', default=None)
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'production-cache',
        }
    }
