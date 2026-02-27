import random
import hashlib
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PasswordReset

User = get_user_model()

class RequestPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value

    def save(self):
        email = self.validated_data["email"]
        user = User.objects.get(email=email)

        # generate 6-digit code
        code = str(random.randint(100000, 999999))
        hashed_code = hashlib.sha256(code.encode()).hexdigest()

        PasswordReset.objects.create(
            user=user,
            code=hashed_code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        send_mail(
            subject="Your Password Reset Code",
            message=f"Your reset code is: {code}",
            from_email=None,
            recipient_list=[email],
        )
        
class VerifyCodeSerializer(serializers.Serializer): 
    code = serializers.CharField(max_length=6)
    email = serializers.EmailField()
    def validate(self, data):
        email = data["email"]
        code = data["code"]

        try:
            user = User.objects.get(email=email)
            reset = PasswordReset.objects.filter(user=user).latest("created_at")
        except:
            raise serializers.ValidationError("Invalid reset request.")

        if reset.is_expired():
            raise serializers.ValidationError("Code expired.")

        hashed_code = hashlib.sha256(code.encode()).hexdigest()

        if hashed_code != reset.code:
            raise serializers.ValidationError("Invalid code.")

        data["user"] = user
        data["reset"] = reset
        return data

class ConfirmPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate(self, data):
        email = data["email"]
        code = data["code"]

        try:
            user = User.objects.get(email=email)
            reset = PasswordReset.objects.filter(user=user).latest("created_at")
        except:
            raise serializers.ValidationError("Invalid reset request.")

        if reset.is_expired():
            raise serializers.ValidationError("Code expired.")

        hashed_code = hashlib.sha256(code.encode()).hexdigest()

        if hashed_code != reset.code:
            raise serializers.ValidationError("Invalid code.")

        data["user"] = user
        data["reset"] = reset
        return data

    def save(self):
        user = self.validated_data["user"]
        reset = self.validated_data["reset"]
        new_password = self.validated_data["new_password"]

        user.set_password(new_password)
        user.save()

        reset.delete()