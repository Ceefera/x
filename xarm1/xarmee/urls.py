from django.urls import path
from .views import ContributionCreateView

urlpatterns = [
    path("contributions/", ContributionCreateView.as_view(), name="contributions"),
]
