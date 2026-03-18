from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from apps.analytics.views import admin_user_list, admin_quiz_list

urlpatterns = [
    path('admin/', admin.site.urls),
    # API Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # App Routes
    path('api/auth/', include('apps.users.urls')),
    path('api/quizzes/', include('apps.quizzes.urls')),
    path('api/attempts/', include('apps.attempts.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    
    # Admin Specific
    path('api/admin/users/', admin_user_list, name='admin-user-list'),
    path('api/admin/quizzes/', admin_quiz_list, name='admin-quiz-list'),
]
