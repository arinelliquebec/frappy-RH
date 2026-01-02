#!/bin/bash

# ===========================================
# Script para configurar variáveis de ambiente no Azure App Service
# ===========================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Configurando variáveis de ambiente no Azure App Service${NC}"
echo ""

# Configurações
RESOURCE_GROUP="frappyou-rg"
APP_NAME="frappyou-api"

# Verificar se está logado no Azure
if ! az account show &>/dev/null; then
    echo -e "${YELLOW}⚠️  Você não está logado no Azure. Fazendo login...${NC}"
    az login
fi

echo -e "${YELLOW}📋 Configurações atuais:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  App Service: $APP_NAME"
echo ""

# Ler variáveis do .env local
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ Arquivo .env encontrado. Carregando variáveis...${NC}"
    source backend/.env
else
    echo -e "${RED}❌ Arquivo backend/.env não encontrado!${NC}"
    echo "   Crie o arquivo com as variáveis necessárias."
    exit 1
fi

# Validar variáveis obrigatórias
if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ JWT_SECRET não definido no .env${NC}"
    exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ JWT_SECRET deve ter pelo menos 32 caracteres${NC}"
    exit 1
fi

if [ -z "$DB_SERVER" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Variáveis de banco de dados não definidas no .env${NC}"
    exit 1
fi

echo -e "${YELLOW}⚙️  Configurando variáveis de ambiente...${NC}"

# Configurar variáveis
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings \
    PORT="${PORT:-8080}" \
    JWT_SECRET="$JWT_SECRET" \
    DB_SERVER="$DB_SERVER" \
    DB_PORT="${DB_PORT:-1433}" \
    DB_USER="$DB_USER" \
    DB_PASSWORD="$DB_PASSWORD" \
    DB_NAME="${DB_NAME:-frademabr}" \
    ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://www.frappyou.app,https://frappyou.app}" \
  --output none

echo ""
echo -e "${GREEN}✅ Variáveis configuradas com sucesso!${NC}"
echo ""

# Verificar configuração
echo -e "${YELLOW}📊 Verificando configuração...${NC}"
az webapp config appsettings list \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --query "[?name=='JWT_SECRET' || name=='DB_SERVER' || name=='PORT'].{Name:name, Value:value}" \
  --output table

echo ""
echo -e "${YELLOW}🔄 Reiniciando App Service...${NC}"
az webapp restart \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --output none

echo ""
echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo ""
echo -e "${YELLOW}🔗 Testando API...${NC}"
sleep 10  # Aguardar restart

HEALTH_URL="https://$APP_NAME.azurewebsites.net/health"
if curl -s "$HEALTH_URL" | grep -q "ok"; then
    echo -e "${GREEN}✅ API está funcionando!${NC}"
    echo "   URL: $HEALTH_URL"
else
    echo -e "${RED}⚠️  API pode estar iniciando. Verifique os logs:${NC}"
    echo "   az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"
fi

echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Rotacione as credenciais que foram expostas!${NC}"
echo "   1. Gere novo JWT_SECRET: openssl rand -base64 32"
echo "   2. Altere a senha do banco no Azure Portal"
echo "   3. Execute este script novamente com as novas credenciais"
