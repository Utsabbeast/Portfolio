
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('terms/', views.terms, name='terms'),
    path('folio/', views.folio, name='folio'),
    path('shuri/', views.shuri, name='shuri'),
]
