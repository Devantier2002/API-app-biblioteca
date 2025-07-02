# 📚 Biblioteca Escolar API - Documentação Completa

API REST para gerenciamento de alunos, livros e empréstimos em uma biblioteca escolar, com envio automático de relatórios por e-mail.

Desenvolvida com Node.js, Express, Prisma, Zod e Nodemailer.

---

## 🛠️ Funcionalidades Gerais

A API está dividida em 3 grandes áreas:

- **Livros** — gerenciamento do catálogo de livros.
- **Alunos** — gerenciamento dos usuários que podem realizar empréstimos.
- **Empréstimos** — controle dos empréstimos entre alunos e livros.
- **Relatórios por E-mail** — envio automático de relatórios detalhados.

---

## 📘 Livros

Gerencia o catálogo de livros da biblioteca.

| Método | Rota         | Descrição                          |
|--------|--------------|----------------------------------|
| GET    | `/livros`      | Retorna todos os livros cadastrados. |
| GET    | `/livros/:id`  | Retorna os dados de um livro específico pelo ID. |
| POST   | `/livros`      | Cadastra um novo livro.           |
| PUT    | `/livros/:id`  | Atualiza as informações de um livro existente. |
| DELETE | `/livros/:id`  | Remove um livro do sistema pelo ID. |

**Campos do Livro:**

- `titulo` (string)  
- `autor` (string)  
- `preco` (number)  
- `quantidade` (number) — quantidade disponível para empréstimo.

---

## 👨‍🎓 Alunos

Gerencia os usuários que podem fazer empréstimos.

| Método | Rota                      | Descrição                                    |
|--------|---------------------------|----------------------------------------------|
| GET    | `/alunos`                 | Lista todos os alunos cadastrados.            |
| POST   | `/alunos`                 | Cadastra um novo aluno.                        |
| PUT    | `/alunos/:id`             | Atualiza dados do aluno pelo ID.              |
| DELETE | `/alunos/:id`             | Remove um aluno do sistema.                    |
| PATCH  | `/alunos/depositar/:id`   | Adiciona saldo na conta do aluno.             |
| GET    | `/alunos/email/:id`       | Envia relatório dos empréstimos do aluno por e-mail. |

**Campos do Aluno:**

- `nome` (string, mínimo 10 caracteres)  
- `turma` (string, mínimo 2 caracteres)  
- `responsavel` (string, mínimo 10 caracteres)  
- `email` (string, formato e-mail válido)  
- `obs` (string, opcional)  
- `saldo` (number) — crédito disponível para realizar empréstimos.

**Descrição:**

- O saldo funciona como uma "carteira" virtual para pagar os livros emprestados.
- A rota de depósito permite que o aluno adicione crédito à sua conta.
- O envio de relatório por e-mail gera um resumo detalhado dos livros emprestados, valores totais e saldo restante.

---

## 📖 Empréstimos

Controle dos empréstimos feitos pelos alunos.

| Método | Rota                           | Descrição                                      |
|--------|--------------------------------|------------------------------------------------|
| GET    | `/emprestimos`                 | Lista todos os empréstimos (ativos e finalizados). |
| POST   | `/emprestimos`                 | Cria um novo empréstimo entre aluno e livro.  |
| DELETE | `/emprestimos/:id`             | Exclui um empréstimo e atualiza a disponibilidade do livro. |
| PATCH  | `/emprestimos/devolver/:alunoId` | Realiza a devolução de um livro pelo aluno. Atualiza estoque e saldo. |

**Regras:**

- Para criar um empréstimo, o sistema verifica se o aluno tem saldo suficiente e se o livro está disponível.
- Ao excluir ou devolver um empréstimo, a quantidade disponível do livro é atualizada para liberar o exemplar.

---

## 📬 Relatório de Empréstimos por E-mail

**Rota:** `GET /alunos/email/:id`

- Gera um relatório detalhado em formato HTML com:
  - Dados pessoais do aluno (nome, turma, responsável).
  - Lista dos livros emprestados e não devolvidos.
  - Valores dos empréstimos e saldo atual.
- O relatório é enviado automaticamente para o e-mail configurado do aluno (ou responsável).

---

## 💡 Exemplos de JSON

### Criar um aluno

```json
{
  "nome": "João da Silva Santos",
  "turma": "3A",
  "responsavel": "Maria da Silva Santos",
  "email": "joao.santos@email.com",
  "obs": "Aluno com necessidades especiais"
}
```

### Criar um empréstimo

```json
{
  "alunoId": 1,
  "livroId": 3,
  "valor": 30.50
}
```

### Adicionar saldo (depósito) a um aluno

```json
{
  "tipo": "Depósito em dinheiro",
  "valor": 100.00
}
```

## ⚙️ Configuração e Observações
- Autenticação: Algumas rotas (ex: criação, atualização e exclusão de alunos) exigem token JWT para autorização, passado no header Authorization: Bearer <token>.
- Envio de email: Configurado via Nodemailer usando Mailtrap (para testes).
- Tratamento de erros: Respostas padronizadas em JSON com mensagens claras para erros de validação ou operação.


