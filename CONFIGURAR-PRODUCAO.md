# 🔧 Configurar Variáveis de Ambiente em Produção

## Problema
Em desenvolvimento funciona porque o `.env` está presente, mas em produção o Docker não inclui o `.env` (por segurança).

## Solução: Configurar no Azure App Service

### Opção 1: Via Azure Portal (Interface Gráfica)

1. Acesse o [Azure Portal](https://portal.azure.com)
2. Navegue até seu **App Service** (`frappyou-api`)
3. No menu lateral, clique em **Configuration** (Configuração)
4. Na aba **Application settings**, clique em **+ New application setting**
5. Adicione cada variável:

| Nome | Valor |
|------|-------|
| `PORT` | `8080` |
| `JWT_SECRET` | `yKMoCuFEat5jE/Y2HCIKuTPoyi4g6oOA73fbr3Uximc=` |
| `DB_SERVER` | `frademasql.database.windows.net` |
| `DB_PORT` | `1433` |
| `DB_USER` | `frademasql` |
| `DB_PASSWORD` | `akiko!@#777bBhoho123` |
| `DB_NAME` | `frademabr` |
| `ALLOWED_ORIGINS` | `https://www.frappyou.app,https://frappyou.app` |

6. Clique em **Save** (Salvar)
7. O App Service vai reiniciar automaticamente

### Opção 2: Via Azure CLI (Linha de Comando)

```bash
az webapp config appsettings set \
  --resource-group frappyou-rg \
  --name frappyou-api \
  --settings \
    PORT="8080" \
    JWT_SECRET="yKMoCuFEat5jE/Y2HCIKuTPoyi4g6oOA73fbr3Uximc=" \
    DB_SERVER="frademasql.database.windows.net" \
    DB_PORT="1433" \
    DB_USER="frademasql" \
    DB_PASSWORD="akiko!@#777bBhoho123" \
    DB_NAME="frademabr" \
    ALLOWED_ORIGINS="https://www.frappyou.app,https://frappyou.app"
```

### Opção 3: Via GitHub Actions (CI/CD)

Se você usa GitHub Actions, adicione as variáveis como **Secrets**:

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione cada variável como secret
3. No workflow, configure:

```yaml
- name: Set environment variables
  run: |
    az webapp config appsettings set \
      --resource-group frappyou-rg \
      --name frappyou-api \
      --settings \
        JWT_SECRET="${{ secrets.JWT_SECRET }}" \
        DB_PASSWORD="${{ secrets.DB_PASSWORD }}"
```

## ⚠️ IMPORTANTE: Segurança

### 1. Rotacionar Credenciais IMEDIATAMENTE

As credenciais foram expostas nesta conversa. Você DEVE:

```bash
# 1. Gerar novo JWT Secret
openssl rand -base64 32

# 2. Alterar senha do banco no Azure Portal:
# - Vá para SQL Server → Settings → Reset password
```

### 2. Usar Azure Key Vault (Recomendado)

Para produção, use o Azure Key Vault:

```bash
# Criar Key Vault
az keyvault create \
  --name frappyou-vault \
  --resource-group frappyou-rg \
  --location brazilsouth

# Adicionar secrets
az keyvault secret set \
  --vault-name frappyou-vault \
  --name "DB-PASSWORD" \
  --value "sua-senha-segura"

az keyvault secret set \
  --vault-name frappyou-vault \
  --name "JWT-SECRET" \
  --value "seu-jwt-secret"

# Dar permissão ao App Service
az webapp identity assign \
  --resource-group frappyou-rg \
  --name frappyou-api

# Configurar referência no App Service
az webapp config appsettings set \
  --resource-group frappyou-rg \
  --name frappyou-api \
  --settings \
    DB_PASSWORD="@Microsoft.KeyVault(SecretUri=https://frappyou-vault.vault.azure.net/secrets/DB-PASSWORD/)" \
    JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://frappyou-vault.vault.azure.net/secrets/JWT-SECRET/)"
```

## Verificar Configuração

### 1. Verificar variáveis configuradas

```bash
az webapp config appsettings list \
  --resource-group frappyou-rg \
  --name frappyou-api \
  --output table
```

### 2. Ver logs da aplicação

```bash
# Logs em tempo real
az webapp log tail \
  --resource-group frappyou-rg \
  --name frappyou-api

# Ou no Azure Portal:
# App Service → Monitoring → Log stream
```

### 3. Testar a API

```bash
# Health check
curl https://frappyou-api.azurewebsites.net/health

# Deve retornar:
# {"status":"ok","message":"FrappYOU API is running"}
```

## Troubleshooting

### Erro: "JWT_SECRET não definida"

```bash
# Verificar se a variável está configurada
az webapp config appsettings list \
  --resource-group frappyou-rg \
  --name frappyou-api \
  --query "[?name=='JWT_SECRET']"
```

### Erro: "Falha ao conectar ao banco"

1. Verificar firewall do SQL Server:
   - Azure Portal → SQL Server → Networking
   - Ativar: "Allow Azure services and resources to access this server"

2. Verificar credenciais:
```bash
az webapp config appsettings list \
  --resource-group frappyou-rg \
  --name frappyou-api \
  --query "[?name=='DB_SERVER' || name=='DB_USER']"
```

### App não reinicia após mudanças

```bash
# Forçar restart
az webapp restart \
  --resource-group frappyou-rg \
  --name frappyou-api
```

## Próximos Passos

1. ✅ Configurar variáveis de ambiente no Azure
2. ⚠️ Rotacionar credenciais expostas
3. 🔒 Migrar para Azure Key Vault
4. 📊 Configurar Application Insights para monitoramento
5. 🔐 Implementar rate limiting em produção
