from django.db import models

class Contribution(models.Model):
    x_handle = models.CharField(max_length=100)
    wallet_address = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=20, decimal_places=9)  # up to 9 dp for SOL
    signature = models.CharField(max_length=255, unique=True)
    network = models.CharField(max_length=20, default="devnet")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.x_handle} - {self.amount} SOL - {self.wallet_address}"
