from django.urls import path
from .views import (
    RegisterView,
    ProfileView,
    OnboardingView,
    UserSearchView,
    SendFriendRequestView,
    RespondFriendRequestView,
    RemoveFriendView,
    FriendListView,
    PendingRequestsView,
    FriendRecipesView,
)

urlpatterns = [
    path('register/',   RegisterView.as_view(),   name='register'),
    path('profile/',    ProfileView.as_view(),    name='profile'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),

    # ── Friends ───────────────────────────────────────────────────────────────
    # Search all users
    path('users/search/',                    UserSearchView.as_view(),          name='user-search'),
    # Send a request
    path('friends/request/',                 SendFriendRequestView.as_view(),   name='friend-request-send'),
    # Accept / reject a pending request
    path('friends/request/<int:request_id>/', RespondFriendRequestView.as_view(), name='friend-request-respond'),
    # List accepted friends
    path('friends/',                         FriendListView.as_view(),          name='friend-list'),
    # List incoming pending requests
    path('friends/requests/',                PendingRequestsView.as_view(),     name='friend-requests-pending'),
    # Remove a friend
    path('friends/<int:request_id>/',        RemoveFriendView.as_view(),        name='friend-remove'),
    # View a friend's public + friends_only recipes
    path('friends/<int:user_id>/recipes/',   FriendRecipesView.as_view(),       name='friend-recipes'),
]
