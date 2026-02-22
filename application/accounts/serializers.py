from rest_framework import serializers
from .models import CustomUser

class RegisterSerializer(serializers.ModelSerializer):
    #password must be write only
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('email', 'first_name', 'last_name', 'password')

        def registerUser(self, validated_data):
            user = CustomUser.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password'],
                first_name = validated_data.get('first_name', ''),
                last_name = validated_data.get('last_name', '')
            )

            return user