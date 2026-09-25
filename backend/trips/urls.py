from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="health"),
    path("trips/plan/", views.TripPlanView.as_view(), name="trip-plan"),
    path("places/search/", views.PlaceSearchView.as_view(), name="place-search"),
    path("places/reverse/", views.ReverseGeocodeView.as_view(), name="place-reverse"),
]
