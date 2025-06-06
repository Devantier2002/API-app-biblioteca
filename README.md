# 📚 Biblioteca Escolar API - Documentação Completa

> **API REST para gerenciamento de alunos, livros e empréstimos em uma biblioteca escolar.  
> Desenvolvida com Node.js, Express, Prisma, Zod e Nodemailer para envio de relatórios por e-mail.**



🛠️ Funcionalidades da API
A API está dividida em 3 grandes áreas: Livros, Alunos e Empréstimos. Além disso, tem funcionalidade para envio de relatórios por e-mail.

📘 Livros
Esta seção gerencia o catálogo de livros da biblioteca.

Método	Rota	Descrição
GET	/livros	Retorna todos os livros cadastrados.
GET	/livros/:id	Retorna os dados de um livro específico pelo ID.
POST	/livros	Cadastra um novo livro na biblioteca.
PUT	/livros/:id	Atualiza as informações de um livro existente.
DELETE	/livros/:id	Remove um livro do sistema pelo ID.

Explicação:

Os livros possuem título, autor, preço e quantidade disponível para empréstimo.

Ao criar ou atualizar, o corpo JSON deve conter esses dados.

A quantidade disponível é usada para controlar o estoque e permitir empréstimos.

👨‍🎓 Alunos
Gerencia os usuários que podem fazer empréstimos.

Método	Rota	Descrição
GET	/alunos	Lista todos os alunos cadastrados.
POST	/alunos	Cadastra um novo aluno.
PUT	/alunos/:id	Atualiza dados do aluno pelo ID.
DELETE	/alunos/:id	Remove um aluno do sistema.
PATCH	/alunos/depositar/:id	Adiciona saldo na conta do aluno.
GET	/alunos/email/:id	Envia relatório dos empréstimos do aluno por e-mail.

Explicação:

Cada aluno possui nome, matrícula, curso e saldo disponível para realizar empréstimos.

O saldo funciona como uma "carteira" virtual para pagar os livros que ele empresta.

A rota de depósito permite que o aluno adicione crédito à sua conta.

A funcionalidade de envio de e-mail gera um relatório detalhado dos livros que o aluno está com empréstimo ativo, mostrando valores totais e saldo restante, e envia para um e-mail fixo configurado.

📖 Empréstimos
Controle dos empréstimos feitos pelos alunos.

Método	Rota	Descrição
GET	/emprestimos	Lista todos os empréstimos (ativos e finalizados).
POST	/emprestimos	Cria um novo empréstimo entre aluno e livro.
DELETE	/emprestimos/:id	Exclui um empréstimo e atualiza a disponibilidade do livro.
PATCH	/emprestimos/devolver/:alunoId	Realiza a devolução de um livro pelo aluno.

Explicação:

Para criar um empréstimo, o sistema verifica se o aluno tem saldo suficiente e se o livro está disponível.

Quando um empréstimo é excluído ou devolvido, a quantidade disponível do livro é atualizada, liberando o exemplar para futuros empréstimos.

A devolução é feita via PATCH, informando o aluno e o livro devolvido, que atualiza o sistema automaticamente.

📬 Relatório de Empréstimos por E-mail
Rota: GET /alunos/email/:id

Gera um relatório detalhado em formato HTML com:

Dados pessoais do aluno

Lista de livros que estão emprestados e não devolvidos

Valores dos empréstimos e saldo atual

O relatório é enviado automaticamente para o e-mail fixo configurado no código (exemplo: responsavel@escola.com).
