package config

import (
	"log"

	"github.com/frappyou/backend/models"
	"golang.org/x/crypto/bcrypt"
)

// SeedDatabase cria dados iniciais no banco
func SeedDatabase() {
	// Seed de usuários
	seedUsersData()

	// Seed de base de conhecimento
	seedKnowledgeBase()
}

func seedUsersData() {
	// Usuário de teste
	seedUsers := []struct {
		Name     string
		Email    string
		CPF      string
		Password string
		Company  string
		Role     string
	}{
		{
			Name:     "TI Fradema",
			Email:    "ti4@fradema.com.br",
			Password: "bBhoho123#",
			Company:  "Fradema",
			Role:     "admin",
		},
		{
			Name:     "Usuário Teste",
			Email:    "teste12345678990@placeholder.local",
			CPF:      "12345678990",
			Password: "italian",
			Company:  "Fradema",
			Role:     "user",
		},
	}

	for _, u := range seedUsers {
		var existingUser models.User
		// Verifica por email ou CPF (se tiver CPF)
		query := DB.Where("email = ?", u.Email)
		if u.CPF != "" {
			query = query.Or("cpf = ?", u.CPF)
		}
		if result := query.First(&existingUser); result.Error == nil {
			log.Printf("✓ Usuário %s já existe", u.Email)
			continue
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("✗ Erro ao criar hash da senha para %s: %v", u.Email, err)
			continue
		}

		user := models.User{
			Name:     u.Name,
			Email:    u.Email,
			CPF:      u.CPF,
			Password: string(hashedPassword),
			Company:  u.Company,
			Role:     u.Role,
		}

		if result := DB.Create(&user); result.Error != nil {
			log.Printf("✗ Erro ao criar usuário %s: %v", u.Email, result.Error)
		} else {
			log.Printf("✓ Usuário %s criado com sucesso (CPF: %s)", u.Email, u.CPF)
		}
	}

	// Garantir que CPF 12365382770 seja admin master
	ensureAdminMaster()
}

// seedKnowledgeBase cria artigos iniciais na base de conhecimento
func seedKnowledgeBase() {
	// Verifica se já tem artigos
	var count int64
	DB.Model(&models.KnowledgeArticle{}).Count(&count)
	if count > 0 {
		log.Printf("✓ Base de conhecimento já possui %d artigos", count)
		return
	}

	articles := []models.KnowledgeArticle{
		// === FÉRIAS ===
		{
			Title:    "Política de Férias",
			Slug:     "politica-de-ferias",
			Summary:  "Regras e procedimentos para solicitação de férias",
			Category: models.KnowledgeCategoryVacation,
			Tags:     "férias, descanso, período aquisitivo, concessivo",
			Keywords: "férias, solicitar férias, período férias, 30 dias, descanso anual",
			Content: `# Política de Férias

## Direito às Férias

Todo colaborador tem direito a **30 dias de férias** a cada 12 meses de trabalho (período aquisitivo).

## Período Aquisitivo x Período Concessivo

- **Período Aquisitivo**: 12 meses de trabalho que dão direito às férias
- **Período Concessivo**: 12 meses seguintes para tirar as férias

## Como Solicitar

1. Acesse o sistema FrappYOU
2. Vá em "Férias"
3. Clique em "Solicitar Férias"
4. Escolha as datas desejadas
5. Aguarde aprovação do gestor

## Regras Importantes

- As férias podem ser divididas em até **3 períodos**
- Um dos períodos deve ter no mínimo **14 dias corridos**
- Os demais períodos devem ter no mínimo **5 dias corridos** cada
- As férias não podem iniciar 2 dias antes de feriados ou fim de semana
- O pagamento das férias é feito até 2 dias antes do início

## Antecedência

Recomendamos solicitar férias com pelo menos **30 dias de antecedência** para melhor planejamento.

## Dúvidas?

Entre em contato com o RH pelo chat ou e-mail rh@empresa.com.br`,
			IsPublished: true,
			IsFeatured:  true,
		},
		{
			Title:    "Venda de Férias (Abono Pecuniário)",
			Slug:     "venda-de-ferias-abono-pecuniario",
			Summary:  "Como vender até 1/3 das suas férias",
			Category: models.KnowledgeCategoryVacation,
			Tags:     "venda férias, abono, pecuniário, dinheiro",
			Keywords: "vender férias, abono pecuniário, 10 dias, converter férias dinheiro",
			Content: `# Venda de Férias (Abono Pecuniário)

## O que é?

O **abono pecuniário** é a conversão de parte das férias em dinheiro. Você pode vender até **1/3 das suas férias** (máximo 10 dias).

## Quem pode solicitar?

Qualquer colaborador com saldo de férias disponível.

## Como solicitar?

1. Acesse o FrappYOU
2. Vá em "Férias"
3. Clique em "Vender Férias"
4. Informe quantos dias deseja vender (1 a 10)
5. Aguarde aprovação

## Prazos

- A solicitação deve ser feita **até 15 dias antes do início das férias**
- O pagamento é feito junto com o adicional de férias

## Valor

O valor é calculado com base no seu salário + adicional de 1/3.

**Exemplo**: Se seu salário é R$ 3.000,00
- Valor do dia: R$ 3.000 ÷ 30 = R$ 100,00
- Com 1/3: R$ 100 × 1,33 = R$ 133,33 por dia
- 10 dias vendidos: R$ 1.333,33

## Importante

A venda de férias é uma **opção do colaborador** e não pode ser imposta pela empresa.`,
			IsPublished: true,
			IsFeatured:  false,
		},

		// === BENEFÍCIOS ===
		{
			Title:    "Plano de Saúde",
			Slug:     "plano-de-saude",
			Summary:  "Informações sobre o plano de saúde corporativo",
			Category: models.KnowledgeCategoryBenefits,
			Tags:     "saúde, plano, médico, hospital, consulta",
			Keywords: "plano saúde, médico, consulta, hospital, dependentes, coparticipação",
			Content: `# Plano de Saúde

## Cobertura

Nossa empresa oferece plano de saúde **Unimed Nacional** para todos os colaboradores.

## Quem tem direito?

- Colaboradores CLT após o período de experiência (90 dias)
- Dependentes: cônjuge e filhos até 21 anos (ou 24 se universitário)

## Inclusão de Dependentes

Para incluir dependentes:
1. Acesse o Portal RH
2. Vá em "Benefícios"
3. Clique em "Incluir Dependente"
4. Anexe os documentos necessários

**Documentos necessários:**
- RG e CPF do dependente
- Certidão de casamento ou união estável
- Certidão de nascimento (filhos)

## Coparticipação

O plano possui **coparticipação** de 30% em:
- Consultas
- Exames simples
- Pronto-atendimento

**Não há coparticipação** em:
- Internações
- Cirurgias
- Exames de alta complexidade

## Desconto em Folha

- Titular: R$ 150,00/mês
- Cada dependente: R$ 100,00/mês

## Rede Credenciada

Consulte a rede credenciada no app Unimed ou pelo site: www.unimed.com.br`,
			IsPublished: true,
			IsFeatured:  true,
		},
		{
			Title:    "Vale Refeição e Vale Alimentação",
			Slug:     "vale-refeicao-vale-alimentacao",
			Summary:  "Informações sobre VR e VA",
			Category: models.KnowledgeCategoryBenefits,
			Tags:     "VR, VA, refeição, alimentação, ticket",
			Keywords: "vale refeição, vale alimentação, VR, VA, ticket, alelo, carga",
			Content: `# Vale Refeição e Vale Alimentação

## Valores

| Benefício | Valor Mensal |
|-----------|-------------|
| Vale Refeição (VR) | R$ 35,00/dia útil |
| Vale Alimentação (VA) | R$ 400,00/mês |

## Como funciona?

- Os valores são creditados no **cartão Alelo**
- Crédito: todo dia **5** (ou próximo dia útil)
- O VR é calculado pelos dias úteis do mês
- O VA é valor fixo mensal

## Desconto em Folha

- VR: sem desconto (100% empresa)
- VA: desconto de 20% do valor (R$ 80,00)

## Onde usar?

- **VR**: restaurantes, lanchonetes, padarias
- **VA**: supermercados, açougues, hortifruti

## Saldo e Extrato

Consulte pelo app Alelo ou site: www.alelo.com.br

## Faltas e Afastamentos

- Faltas injustificadas: desconto proporcional no VR
- Férias: não há crédito de VR/VA
- Licenças médicas > 15 dias: benefício suspenso`,
			IsPublished: true,
			IsFeatured:  false,
		},

		// === FOLHA DE PAGAMENTO ===
		{
			Title:    "Entendendo seu Holerite",
			Slug:     "entendendo-seu-holerite",
			Summary:  "Guia completo para entender os itens do holerite",
			Category: models.KnowledgeCategoryPayroll,
			Tags:     "holerite, contracheque, salário, descontos",
			Keywords: "holerite, contracheque, inss, irrf, fgts, desconto, provento",
			Content: `# Entendendo seu Holerite

## Estrutura do Holerite

O holerite é dividido em:
1. **Cabeçalho**: seus dados e da empresa
2. **Proventos**: tudo que você recebe
3. **Descontos**: o que é descontado
4. **Totais**: líquido a receber

## Principais Proventos

| Item | Descrição |
|------|-----------|
| Salário Base | Seu salário mensal |
| Horas Extras | Horas trabalhadas além da jornada |
| Adicional Noturno | +20% se trabalhou após 22h |
| DSR | Descanso Semanal Remunerado |
| Adicional de Férias | 1/3 do salário nas férias |

## Principais Descontos

| Item | % ou Valor |
|------|-----------|
| INSS | 7,5% a 14% (teto: R$ 908,85) |
| IRRF | 0% a 27,5% (depende da faixa) |
| Vale Transporte | Até 6% do salário |
| Plano de Saúde | Conforme contratado |
| Vale Alimentação | 20% do valor |

## INSS - Tabela 2024

| Faixa Salarial | Alíquota |
|----------------|----------|
| Até R$ 1.412,00 | 7,5% |
| R$ 1.412,01 a R$ 2.666,68 | 9% |
| R$ 2.666,69 a R$ 4.000,03 | 12% |
| R$ 4.000,04 a R$ 7.786,02 | 14% |

## FGTS

O FGTS (8% do salário) **não é descontado** - é depositado pela empresa na sua conta da Caixa.

## Dúvidas sobre valores?

Procure o RH ou use o chat Frappy IA para esclarecer.`,
			IsPublished: true,
			IsFeatured:  true,
		},

		// === COMPLIANCE ===
		{
			Title:    "Código de Ética e Conduta",
			Slug:     "codigo-de-etica-e-conduta",
			Summary:  "Princípios e valores que guiam nossa conduta",
			Category: models.KnowledgeCategoryCompliance,
			Tags:     "ética, conduta, valores, comportamento",
			Keywords: "ética, conduta, assédio, conflito interesse, corrupção, denúncia",
			Content: `# Código de Ética e Conduta

## Nossos Valores

- **Integridade**: Agimos com honestidade e transparência
- **Respeito**: Valorizamos a diversidade e tratamos todos com dignidade
- **Responsabilidade**: Assumimos as consequências de nossas ações
- **Excelência**: Buscamos sempre entregar o melhor

## Conduta Esperada

### No Ambiente de Trabalho

- Manter postura profissional
- Respeitar colegas e superiores
- Cumprir horários e prazos
- Zelar pelos recursos da empresa

### Relacionamento com Terceiros

- Não aceitar ou oferecer presentes de valor significativo
- Manter imparcialidade nas decisões
- Proteger informações confidenciais

## Práticas Proibidas

❌ Assédio moral ou sexual
❌ Discriminação de qualquer natureza
❌ Corrupção ou suborno
❌ Conflito de interesses não declarado
❌ Uso indevido de recursos da empresa
❌ Vazamento de informações confidenciais

## Canal de Denúncias

Denúncias podem ser feitas de forma **anônima**:
- E-mail: etica@empresa.com.br
- Telefone: 0800-XXX-XXXX
- Sistema: compliance.empresa.com.br

**Garantimos**: Sigilo, não-retaliação e investigação imparcial.`,
			IsPublished: true,
			IsFeatured:  true,
		},

		// === POLÍTICAS GERAIS ===
		{
			Title:    "Política de Home Office",
			Slug:     "politica-de-home-office",
			Summary:  "Regras para trabalho remoto",
			Category: models.KnowledgeCategoryPolicies,
			Tags:     "home office, remoto, trabalho casa, híbrido",
			Keywords: "home office, trabalho remoto, híbrido, teletrabalho, casa",
			Content: `# Política de Home Office

## Modelo de Trabalho

Adotamos o modelo **híbrido**:
- 3 dias presenciais (terça, quarta e quinta)
- 2 dias home office (segunda e sexta)

## Requisitos para Home Office

✅ Aprovação do gestor direto
✅ Funções compatíveis com trabalho remoto
✅ Infraestrutura adequada em casa
✅ Assinatura do termo de responsabilidade

## Equipamentos

A empresa fornece:
- Notebook
- Headset
- Auxílio internet: R$ 100,00/mês

O colaborador deve garantir:
- Conexão de internet estável
- Ambiente adequado para trabalho
- Disponibilidade no horário comercial

## Registro de Ponto

O ponto deve ser registrado normalmente pelo aplicativo:
- Entrada
- Saída para almoço
- Retorno do almoço
- Saída

## Reuniões Presenciais

- Reuniões de equipe: presenciais (terça ou quinta)
- 1:1 com gestor: formato flexível
- Treinamentos: conforme agenda

## Exceções

Áreas operacionais e de atendimento presencial seguem escala própria definida pelo gestor.`,
			IsPublished: true,
			IsFeatured:  false,
		},
		{
			Title:    "Dress Code e Apresentação Pessoal",
			Slug:     "dress-code-apresentacao-pessoal",
			Summary:  "Orientações sobre vestimenta no trabalho",
			Category: models.KnowledgeCategoryPolicies,
			Tags:     "roupa, vestimenta, dress code, uniforme",
			Keywords: "roupa, vestimenta, dress code, uniforme, apresentação, visual",
			Content: `# Dress Code e Apresentação Pessoal

## Dias Presenciais (Business Casual)

### Para Homens
✅ Calça social ou jeans escuro
✅ Camisa social ou polo
✅ Sapato social ou sapatênis
✅ Blazer (opcional)

❌ Bermuda, regata, chinelo
❌ Camiseta de time
❌ Tênis esportivo

### Para Mulheres
✅ Calça social, saia ou vestido (comprimento adequado)
✅ Blusa, camisa ou camiseta social
✅ Sapato fechado ou sandália social
✅ Blazer (opcional)

❌ Shorts, mini-saia, decotes excessivos
❌ Chinelo, rasteirinha casual
❌ Roupas transparentes

## Sexta-feira (Casual Day)

Na sexta-feira, é permitido:
- Jeans (sem rasgos)
- Camiseta (sem estampas ofensivas)
- Tênis

## Áreas Operacionais

Colaboradores de áreas operacionais devem usar o **uniforme fornecido pela empresa**.

## Home Office

No home office, em reuniões por vídeo, mantenha apresentação profissional da cintura para cima 😄`,
			IsPublished: true,
			IsFeatured:  false,
		},

		// === CARREIRA ===
		{
			Title:    "Avaliação de Desempenho",
			Slug:     "avaliacao-de-desempenho",
			Summary:  "Como funciona o ciclo de avaliação",
			Category: models.KnowledgeCategoryCareer,
			Tags:     "avaliação, desempenho, feedback, meta",
			Keywords: "avaliação desempenho, feedback, nota, promoção, meritocracia",
			Content: `# Avaliação de Desempenho

## Ciclos de Avaliação

Realizamos avaliações **semestrais**:
- **1º Ciclo**: Janeiro a Junho (avaliação em Julho)
- **2º Ciclo**: Julho a Dezembro (avaliação em Janeiro)

## Método 360°

A avaliação é composta por:
- **Autoavaliação** (10%)
- **Avaliação do Gestor** (50%)
- **Avaliação de Pares** (20%)
- **Avaliação de Clientes Internos** (20%)

## Critérios Avaliados

1. **Entregas e Resultados** (40%)
   - Cumprimento de metas
   - Qualidade das entregas
   - Prazos

2. **Competências Comportamentais** (30%)
   - Trabalho em equipe
   - Comunicação
   - Proatividade

3. **Desenvolvimento** (30%)
   - Aprendizado contínuo
   - Compartilhamento de conhecimento
   - Evolução no período

## Escala de Notas

| Nota | Classificação | Significado |
|------|--------------|-------------|
| 5 | Excepcional | Superou todas as expectativas |
| 4 | Acima do Esperado | Superou a maioria das expectativas |
| 3 | Atende | Cumpriu as expectativas |
| 2 | Parcialmente | Precisa melhorar em alguns pontos |
| 1 | Abaixo | Não atendeu às expectativas |

## Impacto na Carreira

A avaliação influencia:
- Elegibilidade para promoções
- Participação em programas de bônus
- Prioridade em movimentações internas`,
			IsPublished: true,
			IsFeatured:  false,
		},
	}

	for _, article := range articles {
		if err := DB.Create(&article).Error; err != nil {
			log.Printf("✗ Erro ao criar artigo '%s': %v", article.Title, err)
		} else {
			log.Printf("✓ Artigo '%s' criado com sucesso", article.Title)
		}
	}

	log.Printf("✅ Base de conhecimento semeada com %d artigos", len(articles))
}

// ensureAdminMaster garante que o CPF especificado seja admin
func ensureAdminMaster() {
	adminMasterCPF := "12365382770"

	var user models.User
	result := DB.Where("cpf = ?", adminMasterCPF).First(&user)

	if result.Error == nil {
		// Usuário existe, garantir que seja admin
		if user.Role != "admin" {
			user.Role = "admin"
			if err := DB.Save(&user).Error; err != nil {
				log.Printf("✗ Erro ao promover CPF %s para admin: %v", adminMasterCPF, err)
			} else {
				log.Printf("✓ CPF %s promovido para admin master", adminMasterCPF)
			}
		} else {
			log.Printf("✓ CPF %s já é admin master", adminMasterCPF)
		}
	} else {
		log.Printf("ℹ CPF %s ainda não ativou a conta - será admin quando ativar", adminMasterCPF)
	}
}

