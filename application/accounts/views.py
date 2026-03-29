from django.db import models as db_models
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, FriendRequest
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    OnboardingSerializer,
    PublicUserSerializer,
    FriendRequestSerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
# Existing views (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user    = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "User created successfully!",
                "access":  str(refresh.access_token),
                "refresh": str(refresh),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class OnboardingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = OnboardingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        goals = serializer.save(user=request.user)
        return Response({
            "message":          "Onboarding complete!",
            "calculated_goals": goals,
            "profile":          UserSerializer(request.user).data,
        }, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Friend views
# ─────────────────────────────────────────────────────────────────────────────

class UserSearchView(APIView):
    """
    GET /api/accounts/users/search/?q=john
    Returns all users whose name or email matches, excluding the requester
    and already-accepted friends.
    Includes a `friend_status` field so the frontend knows current state.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q    = request.query_params.get('q', '').strip()
        me   = request.user

        qs = CustomUser.objects.exclude(id=me.id).exclude(is_superuser=True)
        if q:
            qs = qs.filter(
                db_models.Q(email__icontains=q)       |
                db_models.Q(first_name__icontains=q)  |
                db_models.Q(last_name__icontains=q)
            )
        qs = qs[:30]

        # Build a map of existing requests involving me
        existing = FriendRequest.objects.filter(
            db_models.Q(sender=me) | db_models.Q(receiver=me)
        ).filter(receiver__in=qs) | FriendRequest.objects.filter(
            db_models.Q(sender=me) | db_models.Q(receiver=me)
        ).filter(sender__in=qs)

        request_map = {}
        for fr in existing:
            other_id = fr.receiver_id if fr.sender_id == me.id else fr.sender_id
            request_map[other_id] = fr

        results = []
        for user in qs:
            data         = PublicUserSerializer(user).data
            fr           = request_map.get(user.id)
            if not fr:
                data['friend_status'] = 'none'
                data['request_id']    = None
            elif fr.status == 'accepted':
                data['friend_status'] = 'accepted'
                data['request_id']    = fr.id
            elif fr.status == 'pending':
                if fr.sender_id == me.id:
                    data['friend_status'] = 'pending_sent'
                else:
                    data['friend_status'] = 'pending_received'
                data['request_id'] = fr.id
            else:
                data['friend_status'] = 'none'
                data['request_id']    = None
            results.append(data)

        return Response(results)


class SendFriendRequestView(APIView):
    """
    POST /api/accounts/friends/request/
    Body: { "receiver_id": <int> }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        if not receiver_id:
            return Response({'detail': 'receiver_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = CustomUser.objects.get(id=receiver_id)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if receiver == request.user:
            return Response({'detail': 'Cannot send a request to yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if any request already exists in either direction
        existing = FriendRequest.objects.filter(
            db_models.Q(sender=request.user, receiver=receiver) |
            db_models.Q(sender=receiver, receiver=request.user)
        ).first()

        if existing:
            if existing.status == 'accepted':
                return Response({'detail': 'Already friends.'}, status=status.HTTP_400_BAD_REQUEST)
            if existing.status == 'pending':
                return Response({'detail': 'Request already pending.'}, status=status.HTTP_400_BAD_REQUEST)
            # Rejected — allow resend by updating
            existing.status = 'pending'
            existing.sender   = request.user
            existing.receiver = receiver
            existing.save()
            return Response(FriendRequestSerializer(existing).data, status=status.HTTP_200_OK)

        fr = FriendRequest.objects.create(sender=request.user, receiver=receiver)
        return Response(FriendRequestSerializer(fr).data, status=status.HTTP_201_CREATED)


class RespondFriendRequestView(APIView):
    """
    PATCH /api/accounts/friends/request/<id>/
    Body: { "action": "accept" | "reject" }
    Only the receiver can respond.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, request_id: int):
        try:
            fr = FriendRequest.objects.get(id=request_id, receiver=request.user, status='pending')
        except FriendRequest.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'accept':
            fr.status = 'accepted'
            fr.save()
            return Response(FriendRequestSerializer(fr).data)
        elif action == 'reject':
            fr.status = 'rejected'
            fr.save()
            return Response(FriendRequestSerializer(fr).data)
        else:
            return Response({'detail': 'action must be "accept" or "reject".'}, status=status.HTTP_400_BAD_REQUEST)


class RemoveFriendView(APIView):
    """
    DELETE /api/accounts/friends/<id>/
    Removes an accepted friendship. Either party can remove.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, request_id: int):
        fr = FriendRequest.objects.filter(
            db_models.Q(sender=request.user) | db_models.Q(receiver=request.user),
            id=request_id,
            status='accepted',
        ).first()
        if not fr:
            return Response({'detail': 'Friendship not found.'}, status=status.HTTP_404_NOT_FOUND)
        fr.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FriendListView(APIView):
    """
    GET /api/accounts/friends/
    Returns accepted friends of the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        me      = request.user
        friends = me.get_friends()
        data    = []

        # Include the FriendRequest id so the frontend can call RemoveFriendView
        for friend in friends:
            fr = FriendRequest.objects.filter(
                db_models.Q(sender=me, receiver=friend) |
                db_models.Q(sender=friend, receiver=me),
                status='accepted',
            ).first()
            user_data = PublicUserSerializer(friend).data
            user_data['request_id'] = fr.id if fr else None
            data.append(user_data)

        return Response(data)


class PendingRequestsView(APIView):
    """
    GET /api/accounts/friends/requests/
    Returns all pending friend requests where the current user is the receiver.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending = FriendRequest.objects.filter(
            receiver=request.user, status='pending'
        ).select_related('sender')
        return Response(FriendRequestSerializer(pending, many=True).data)


class FriendRecipesView(APIView):
    """
    GET /api/accounts/friends/<user_id>/recipes/
    Returns public + friends_only recipes for a specific friend.
    Only works if the requester and the target are actually friends.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id: int):
        try:
            target = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_friends_with(target):
            return Response({'detail': 'You are not friends with this user.'}, status=status.HTTP_403_FORBIDDEN)

        # Import here to avoid circular imports
        from recipes.models import Recipe
        from recipes.views import compute_macros
        from recipes.serializers import RecipeDetailSerializer

        recipes = (
            Recipe.objects.filter(
                user=target,
                visibility__in=['public', 'friends_only'],
            )
            .prefetch_related('recipe_ingredients__ingredient', 'source_recipe__user')
        )
        for r in recipes:
            r.macros = compute_macros(r)

        return Response(RecipeDetailSerializer(recipes, many=True).data)
