from django.contrib import admin
from django.urls import path
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
#from broadcast.views import index, broadcast, watch
from django.conf.urls import include

urlpatterns = [
    path('', include('broadcast.urls')), # Path changed to '' to prevent 404 on :8000/
    path('admin/', admin.site.urls),
]

urlpatterns += staticfiles_urlpatterns()