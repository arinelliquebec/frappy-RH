-- Script de diagnóstico para encontrar Yasmin Condé Arrighi

-- 1. Buscar na tabela de usuários do sistema
SELECT 'USERS TABLE' as Tabela, id, name, email, cpf, role, created_at
FROM users
WHERE name LIKE '%Yasmin%' OR name LIKE '%Condé%' OR name LIKE '%Arrighi%';

-- 2. Buscar na tabela PessoasFisicasFradema
SELECT 'PESSOAS_FISICAS' as Tabela, Id, Nome, Cpf, EmailEmpresarial, DataCadastro
FROM dbo.PessoasFisicasFradema
WHERE Nome LIKE '%Yasmin%' OR Nome LIKE '%Condé%' OR Nome LIKE '%Arrighi%';

-- 3. Buscar na tabela ColaboradoresFradema (com JOIN)
SELECT 'COLABORADORES' as Tabela, c.Id as ColaboradorId, p.Id as PessoaFisicaId, p.Nome, p.Cpf, c.Cargo, c.Filial, c.Ativo
FROM dbo.ColaboradoresFradema c
INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
WHERE p.Nome LIKE '%Yasmin%' OR p.Nome LIKE '%Condé%' OR p.Nome LIKE '%Arrighi%';

-- 4. Verificar se existe PessoaFisica sem Colaborador
SELECT 'PESSOA_SEM_COLABORADOR' as Tabela, p.Id, p.Nome, p.Cpf, p.EmailEmpresarial
FROM dbo.PessoasFisicasFradema p
LEFT JOIN dbo.ColaboradoresFradema c ON c.PessoaFisicaId = p.Id
WHERE (p.Nome LIKE '%Yasmin%' OR p.Nome LIKE '%Condé%' OR p.Nome LIKE '%Arrighi%')
  AND c.Id IS NULL;

-- 5. Verificar se o nome está NULL ou vazio
SELECT 'NOMES_VAZIOS' as Tabela, Id, Nome, Cpf, EmailEmpresarial
FROM dbo.PessoasFisicasFradema
WHERE (Nome IS NULL OR LTRIM(RTRIM(Nome)) = '')
  AND (Cpf LIKE '%Yasmin%' OR EmailEmpresarial LIKE '%yasmin%' OR EmailEmpresarial LIKE '%conde%' OR EmailEmpresarial LIKE '%arrighi%');
