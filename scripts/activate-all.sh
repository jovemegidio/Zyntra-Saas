#!/bin/bash
IDS="sA4rTHTuM3uiRiYO Aa50V2ddujenx6pS PLBW2ig4RrsJu42j hnp3b5XvekmpniDF MtrN7H9I7995gCQZ RLkKJBds32JTz8Xx Kc4y4rEbGJTTJxpc 1i21QrGBuJfA9c44"
for id in $IDS; do
    docker exec aluforce-n8n n8n update:workflow --id=$id --active=true 2>&1
    echo "Activated: $id"
done
echo "Restarting n8n container..."
docker restart aluforce-n8n
echo "Done!"
