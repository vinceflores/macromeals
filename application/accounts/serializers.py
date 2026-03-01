from rest_framework import serializers
from .models import CustomUser
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['email', 'first_name', 'last_name', 'protein_goal', 'carbs_goal', 'fat_goal', 'water_goal', 'daily_calorie_goal']


class RegisterSerializer(serializers.ModelSerializer):
    #password must be write only
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('email', 'first_name', 'last_name', 'password')

        # def registerUser(self, validated_data):
        #     user = CustomUser.objects.create_user(
        #         email=validated_data['email'],
        #         password=validated_data['password'],
        #         first_name = validated_data.get('first_name', ''),
        #         last_name = validated_data.get('last_name', '')
        #     )

        #     return user
    def create(self, validated_data):
        return CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '') 
        ) 