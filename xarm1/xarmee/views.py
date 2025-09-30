# xarmee/views.py
import requests
from decimal import Decimal
from django.conf import settings
from rest_framework import status, generics
from rest_framework.response import Response
from .models import Contribution
from .serializers import ContributionSerializer

LAMPORTS_PER_SOL = 10**9

class ContributionCreateView(generics.CreateAPIView):
    queryset = Contribution.objects.all()
    serializer_class = ContributionSerializer

    def create(self, request, *args, **kwargs):
        data = request.data
        signature = data.get("signature")
        amount = data.get("amount")
        wallet_address = data.get("wallet_address")
        x_handle = data.get("x_handle")

        # basic validation
        if not all([signature, amount, wallet_address, x_handle]):
            return Response({"detail": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

        if Contribution.objects.filter(signature=signature).exists():
            return Response({"detail": "Duplicate signature"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify transaction on Solana RPC
        try:
            rpc_url = settings.SOLANA_RPC
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTransaction",
                "params": [signature, {"encoding": "json", "commitment": "confirmed"}],
            }
            resp = requests.post(rpc_url, json=payload, timeout=10)
            resp.raise_for_status()
            resp_json = resp.json()

            tx_result = resp_json.get("result")
            if not tx_result:
                return Response({"detail": "Transaction not found or not confirmed yet"}, status=status.HTTP_400_BAD_REQUEST)

            meta = tx_result.get("meta") or {}
            pre_balances = meta.get("preBalances") or []
            post_balances = meta.get("postBalances") or []
            account_keys = tx_result["transaction"]["message"]["accountKeys"]

            receiver = getattr(settings, "RECEIVER_ADDRESS", None)
            if receiver:
                try:
                    recv_index = account_keys.index(receiver)
                except ValueError:
                    return Response({"detail": "Transaction does not include receiver"}, status=status.HTTP_400_BAD_REQUEST)

                received_lamports = post_balances[recv_index] - pre_balances[recv_index]
                expected_lamports = int(Decimal(amount) * LAMPORTS_PER_SOL)

                if received_lamports < expected_lamports:
                    return Response({"detail": "Received amount is less than expected"}, status=status.HTTP_400_BAD_REQUEST)

        except requests.RequestException as e:
            return Response({"detail": f"RPC error: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            return Response({"detail": f"Verification error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Save contribution
        serializer = self.get_serializer(data={
            "x_handle": x_handle,
            "wallet_address": wallet_address,
            "amount": amount,
            "signature": signature
        })
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
