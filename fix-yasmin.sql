-- Script para corrigir o problema da Yasmin não aparecer na lista

-- PASSO 1: Verificar se Yasmin existe na tabela users
SELECT 'Verificando tabela users' as Etapa;
SELECT id, name, email, cpf, role, created_at
FROM users
WHERE name LIKE '%Yasmin%' OR name LIKE '%Condé%' OR name LIKE '%Arrighi%';

-- PASSO 2: Verificar se existe na tabela PessoasFisicasFradema
SELECT 'Verificando tabela PessoasFisicasFradema' as Etapa;
SELECT Id, Nome, Cpf, EmailEmpresarial
FROM dbo.PessoasFisicasFradema
WHERE Nome LIKE '%Yasmin%' OR Nome LIKE '%Condé%' OR Nome LIKE '%Arrighi%';

-- PASSO 3: Verificar se existe na tabela ColaboradoresFradema
SELECT 'Verificando tabela ColaboradoresFradema' as Etapa;
SELECT c.Id, c.PessoaFisicaId, p.Nome, c.Cargo, c.Filial, c.Ativo
FROM dbo.ColaboradoresFradema c
INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
WHERE p.Nome LIKE '%Yasmin%' OR p.Nome LIKE '%Condé%' OR p.Nome LIKE '%Arrighi%';

-- PASSO 4: Se não existir em ColaboradoresFradema, criar o registro
-- ATENÇÃO: Substitua os valores conforme necessário

-- Primeiro, pegue o ID da PessoaFisica
DECLARE @PessoaFisicaId INT;
SELECT @PessoaFisicaId = Id
FROM dbo.PessoasFisicasFradema
WHERE Nome LIKE '%Yasmin%Condé%Arrighi%'
   OR (Nome LIKE '%Yasmin%' AND Nome LIKE '%Arrighi%');

-- Se encontrou a pessoa física, criar o colaborador
IF @PessoaFisicaId IS NOT NULL
BEGIN
    -- Verificar se já existe
    IF NOT EXISTS (SELECT 1 FROM dbo.ColaboradoresFradema WHERE PessoaFisicaId = @PessoaFisicaId)
    BEGIN
        INSERT INTO dbo.ColaboradoresFradema (
            PessoaFisicaId,
            Cargo,
            Filial,
            Ativo,
            DataAdmissao
        )
        VALUES (
            @PessoaFisicaId,
            'Colaborador', -- Ajuste conforme necessário
            'Matriz',      -- Ajuste conforme necessário
            1,             -- Ativo
            GETDATE()
        );

        PRINT 'Registro criado em ColaboradoresFradema';
        SELECT 'Novo colaborador criado' as Resultado, SCOPE_IDENTITY() as NovoID;
    END
    ELSE
    BEGIN
        PRINT 'Colaborador já existe';
        SELECT 'Colaborador já existe' as Resultado;
    END
END
ELSE
BEGIN
    PRINT 'Pessoa física não encontrada';
    SELECT 'Pessoa física não encontrada - verifique o nome' as Resultado;
END

-- PASSO 5: Verificar o resultado final
SELECT 'Verificação final' as Etapa;
SELECT c.Id as ColaboradorID, p.Nome, p.Cpf, c.Cargo, c.Filial, c.Ativo
FROM dbo.ColaboradoresFradema c
INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
WHERE p.Nome LIKE '%Yasmin%' OR p.Nome LIKE '%Condé%' OR p.Nome LIKE '%Arrighi%';
