from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('<str:classcode>/', views.index_cc, name='index-classcode'),
    path('<str:classcode>/teacher/', views.broadcast),
    path('<str:classcode>/student/', views.watch),
    # path('<str:room_name>/', views.room, name='room'),
]
