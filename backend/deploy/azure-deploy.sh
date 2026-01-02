#!/bin/bash

# ===========================================
# FrappYOU API - Deploy para Azure
# ===========================================

set -e

# Configurações - ALTERE CONFORME NECESSÁRIO
RESOURCE_GROUP="frappyou-rg"
LOCATION="brazilsouth"
# Nome único do ACR (adicione suas iniciais ou números)
ACR_NAME="frappyoufradema"
APP_NAME="frappyou-api"
APP_PLAN="frappyou-plan"
IMAGE_NAME="frappyou-api"
IMAGE_TAG="latest"

echo "🚀 Iniciando deploy do FrappYOU API para Azure..."

# 1. Login no Azure
echo "📝 Fazendo login no Azure..."
az login

# 2. Criar Resource Group (se não existir)
echo "📦 Criando Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION 2>/dev/null || echo "Resource Group já existe"

# 2.5 Registrar providers necessários
echo "📋 Registrando providers na subscription..."
az provider register --namespace Microsoft.ContainerRegistry --wait
az provider register --namespace Microsoft.Web --wait
echo "✅ Providers registrados"

# 3. Criar Azure Container Registry (se não existir)
echo "🐳 Criando Container Registry..."
if az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
  echo "ACR já existe"
else
  echo "Criando novo ACR: $ACR_NAME"
  az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
  if [ $? -ne 0 ]; then
    echo "❌ Erro ao criar ACR. O nome '$ACR_NAME' pode já estar em uso globalmente."
    echo "   Edite o script e altere ACR_NAME para um nome único."
    exit 1
  fi
fi

# 4. Login no ACR
echo "🔐 Fazendo login no ACR..."
az acr login --name $ACR_NAME

# 5. Build da imagem Docker
echo "🔨 Construindo imagem Docker..."
cd "$(dirname "$0")/.."
docker build -t $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG .

# 6. Push da imagem para ACR
echo "📤 Enviando imagem para ACR..."
docker push $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG

# 7. Criar App Service Plan (se não existir)
echo "📋 Criando App Service Plan..."
az appservice plan create \
  --name $APP_PLAN \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B2 2>/dev/null || echo "App Service Plan já existe"

# 8. Habilitar admin no ACR para pull
echo "🔑 Habilitando admin no ACR..."
az acr update --name $ACR_NAME --admin-enabled true

# 9. Obter credenciais do ACR
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# 10. Criar Web App (se não existir)
echo "🌐 Criando Web App..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_PLAN \
  --name $APP_NAME \
  --deployment-container-image-name $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD 2>/dev/null || echo "Web App já existe, atualizando..."

# 11. Configurar container
echo "⚙️ Configurando container..."
az webapp config container set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --container-image-name $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
  --container-registry-url https://$ACR_NAME.azurecr.io \
  --container-registry-user $ACR_USERNAME \
  --container-registry-password $ACR_PASSWORD

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🔗 URL da API: https://$APP_NAME.azurewebsites.net"
echo ""
echo "⚠️  IMPORTANTE: Configure as variáveis de ambiente com:"
echo ""
echo "az webapp config appsettings set \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --name $APP_NAME \\"
echo "  --settings \\"
echo "    DB_SERVER=\"seu-servidor.database.windows.net\" \\"
echo "    DB_PORT=\"1433\" \\"
echo "    DB_USER=\"seu-usuario\" \\"
echo "    DB_PASSWORD=\"sua-senha\" \\"
echo "    DB_NAME=\"frappyou\" \\"
echo "    JWT_SECRET=\"sua-chave-jwt\" \\"
echo "    ALLOWED_ORIGINS=\"https://frappyou-front.vercel.app\" \\"
echo "    PORT=\"8080\""

