#!/bin/bash
cd /home/kuntal/vorpet
git pull origin main
sudo docker compose -f docker-compose.prod.yml up --build -d
echo "Deployed!"
