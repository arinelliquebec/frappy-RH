# 🚀 Deploy FrappYOU API no Azure

## ⚠️ SEGURANÇA - LEIA PRIMEIRO

### Credenciais e Secrets

**NUNCA** commite credenciais no repositório Git:

- ❌ Arquivos `.env` com senhas reais
- ❌ Connection strings com credenciais
- ❌ JWT secrets no código fonte
- ❌ Chaves de API ou tokens

**Use sempre:**

- ✅ Azure Key Vault para secrets em produção
- ✅ GitHub Secrets para CI/CD
- ✅ Variáveis de ambiente no Azure App Service
- ✅ Arquivos `.env.example` apenas com placeholders

### Gerar JWT Secret Seguro

```bash
# Linux/macOS
openssl rand -base64 32

# Ou
head -c 32 /dev/urandom | base64
```

O JWT_SECRET deve ter **pelo menos 32 caracteres** para segurança adequada.

---

## 🔄 Deploy Automático (CI/CD)

O projeto possui GitHub Actions configurado para deploy automático!

### Configurar Secrets no GitHub

Vá em **Settings** → **Secrets and variables** → **Actions** e adicione:

| Secret | Como obter |
|--------|-----------|
| `AZURE_CREDENTIALS` | Ver instruções abaixo |
| `ACR_USERNAME` | `az acr credential show --name frappyouacr --query username -o tsv` |
| `ACR_PASSWORD` | `az acr credential show --name frappyouacr --query "passwords[0].value" -o tsv` |

#### Gerar AZURE_CREDENTIALS

```bash
az ad sp create-for-rbac \
  --name "frappyou-github-actions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/frappyou-rg \
  --sdk-auth
```

Copie o JSON gerado e cole no secret `AZURE_CREDENTIALS`.

### Como funciona

- ✅ **Push no `main`** com alterações em `backend/` → Deploy automático
- ✅ **Workflow dispatch** → Deploy manual via GitHub Actions

---

## 📦 Deploy Manual

## Pré-requisitos

- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) instalado
- [Docker](https://docs.docker.com/get-docker/) instalado
- Conta Azure com SQL Server já configurado

## Deploy Rápido

### 1. Configurar o script

Edite `azure-deploy.sh` e altere as variáveis conforme necessário:

```bash
RESOURCE_GROUP="frappyou-rg"      # Nome do Resource Group
LOCATION="brazilsouth"            # Região Azure
ACR_NAME="frappyouacr"            # Nome do Container Registry
APP_NAME="frappyou-api"           # Nome do App Service
# Plano: B2 (2 vCPU, 3.5GB RAM)
```

### 2. Executar o deploy

```bash
chmod +x azure-deploy.sh
./azure-deploy.sh
```

### 3. Configurar variáveis de ambiente

Após o deploy, configure as variáveis no Azure Portal ou via CLI:

```bash
az webapp config appsettings set \
  --resource-group frappyou-rg \
  --name frappyou-api \
  --settings \
    DB_SERVER="seu-servidor.database.windows.net" \
    DB_PORT="1433" \
    DB_USER="seu-usuario" \
    DB_PASSWORD="sua-senha" \
    DB_NAME="frappyou" \
    JWT_SECRET="sua-chave-jwt-super-secreta" \
    ALLOWED_ORIGINS="https://seu-frontend.vercel.app" \
    PORT="8080"
```

### 4. Liberar firewall do SQL Server

No Azure Portal:
1. Vá para seu SQL Server
2. **Networking** → **Firewall rules**
3. Ative **"Allow Azure services and resources to access this server"**

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `PORT` | Porta do servidor (default: 8080) | Não |
| `DB_SERVER` | Servidor SQL Azure | ✅ Sim |
| `DB_PORT` | Porta SQL (default: 1433) | Não |
| `DB_USER` | Usuário SQL | ✅ Sim |
| `DB_PASSWORD` | Senha SQL | ✅ Sim |
| `DB_NAME` | Nome do banco (default: frappyou) | Não |
| `JWT_SECRET` | Chave JWT (mín. 32 caracteres) | ✅ Sim |
| `ALLOWED_ORIGINS` | URLs CORS | ✅ Sim |

> ⚠️ **Importante**: Use o Azure Key Vault para armazenar `DB_PASSWORD` e `JWT_SECRET` em produção.

## Testar Deploy

```bash
# Health check
curl https://frappyou-api.azurewebsites.net/health

# Resposta esperada:
# {"status":"ok","message":"FrappYOU API is running"}
```

## Atualizar Deploy

Após alterações no código:

```bash
# Rebuild e push
docker build -t frappyouacr.azurecr.io/frappyou-api:latest .
docker push frappyouacr.azurecr.io/frappyou-api:latest

# Reiniciar App Service
az webapp restart --resource-group frappyou-rg --name frappyou-api
```

## Logs

```bash
# Ver logs em tempo real
az webapp log tail --resource-group frappyou-rg --name frappyou-api
```

