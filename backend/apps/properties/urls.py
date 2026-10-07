from rest_framework.routers import SimpleRouter

from .views import FavoriteViewSet, PropertyViewSet

router = SimpleRouter(trailing_slash=False)
favorite_router = SimpleRouter(trailing_slash=True)

router.register("properties", PropertyViewSet, basename="property")
favorite_router.register("favorites", FavoriteViewSet, basename="favorite")

urlpatterns = router.urls + favorite_router.urls
