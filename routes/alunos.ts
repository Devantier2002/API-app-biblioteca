import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()
const router = Router()


const alunoSchema = z.object({
  nome: z.string().min(10, { message: "Nome deve possuir, no mínimo, 10 caracteres" }),
  matricula: z.string().min(3, { message: "Matrícula deve possuir, no mínimo, 3 caracteres" }),
  curso: z.string(),
  saldo: z.number().optional(),
  email: z.string().email({ message: "E-mail inválido" })
})


const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: "b0ffd7ab33a38e",  
    pass: "8664734be871dc",    
  },
})

// Função para gerar relatório HTML
function gerarRelatorioHTML(dados: any) {
  let html = `
    <html>
      <body style="font-family: Helvetica, Arial, sans-serif;">
        <h2>Biblioteca Escolar: Relatório de Empréstimos</h2>
        <h3>Aluno: ${dados.nome} - Matrícula: ${dados.matricula}</h3>
        <h3>Curso: ${dados.curso ?? 'Não informado'}</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead style="background-color: #ddd;">
            <tr>
              <th>Data</th>
              <th>Livro</th>
              <th>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
  `

  let totalEmprestimos = 0
  for (const emprestimo of dados.emprestimos) {
    totalEmprestimos += Number(emprestimo.valor)
    const data = new Date(emprestimo.dataEmprestimo).toLocaleString('pt-BR')
    html += `
      <tr>
        <td>${data}</td>
        <td>${emprestimo.livro.titulo}</td>
        <td style="text-align: right;">${Number(emprestimo.valor).toFixed(2)}</td>
      </tr>
    `
  }

  const saldoAtual = Number(dados.saldo ?? 0)
  const valorRestante = saldoAtual - totalEmprestimos

  html += `
      <tr style="font-weight: bold; background-color: #f0f0f0;">
        <td colspan="2" style="text-align: right;">Saldo Atual:</td>
        <td style="text-align: right;">R$ ${saldoAtual.toFixed(2)}</td>
      </tr>
      <tr style="font-weight: bold; background-color: #eee;">
        <td colspan="2" style="text-align: right;">Total em Empréstimos:</td>
        <td style="text-align: right;">R$ ${totalEmprestimos.toFixed(2)}</td>
      </tr>
      <tr style="font-weight: bold; background-color: ${valorRestante < 0 ? '#fdd' : '#dfd'};">
        <td colspan="2" style="text-align: right;">${valorRestante < 0 ? 'Valor Devido:' : 'Valor Restante:'}</td>
        <td style="text-align: right;">R$ ${valorRestante.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  </body>
</html>
  `

  return html
}


// Função para enviar o e-mail
async function enviaEmail(dados: any, email: string) {
  const html = gerarRelatorioHTML(dados)

  const info = await transporter.sendMail({
    from: 'Biblioteca Escolar <biblioteca@escola.com>',
    to: email,
    subject: "Relatório de Empréstimos",
    text: "Segue o relatório de empréstimos.", 
    html: html
  })

  console.log("E-mail enviado:", info.messageId)
}

// Rota: Listar alunos
router.get("/", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany()
    res.status(200).json(alunos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// Rota: Criar aluno
router.post("/", async (req, res) => {
  const valida = alunoSchema.safeParse(req.body)

  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { nome, matricula, curso, saldo, email } = valida.data

  try {
    const aluno = await prisma.aluno.create({
      data: { 
        nome, 
        matricula, 
        curso: curso,
        email,  
        saldo: saldo ?? 0,
      }
    })
    res.status(201).json(aluno)
  } catch (error) {
    res.status(400).json({ error })
  }
})

// Rota: Deletar aluno
router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const aluno = await prisma.aluno.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(aluno)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Rota: Atualizar aluno
router.put("/:id", async (req, res) => {
  const { id } = req.params

  const valida = alunoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome, matricula, curso, saldo, email } = valida.data

  try {
    const aluno = await prisma.aluno.update({
      where: { id: Number(id) },
      data: { nome, matricula, curso, saldo, email }
    })
    res.status(200).json(aluno)
  } catch (error) {
    res.status(400).json({ error })
  }
})


// Rota: Enviar relatório de empréstimos por e-mail
router.get("/email/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar apenas os empréstimos ativos (sem devolução) do aluno
    const aluno = await prisma.aluno.findFirst({
      where: { id: Number(id) },
      include: {
        emprestimos: {
          where: { dataDevolucao: null }, // FILTRA apenas os ainda não devolvidos
          include: { livro: true }
        }
      }
    });

    if (!aluno) {
      return res.status(404).json({ erro: "Aluno não encontrado" });
    }

    

    if (!aluno.email) {
      return res.status(400).json({ erro: "Aluno não possui e-mail cadastrado" });
    }

  
    await enviaEmail(aluno, aluno.email);


    res.status(200).json({ mensagem: "Relatório enviado com sucesso", aluno });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao enviar relatório." });
  }
});



// Rota: Depositar saldo no aluno
router.patch("/depositar/:id", async (req, res) => {
  const { id } = req.params
  const { valor } = req.body

  try {
    const aluno = await prisma.aluno.update({
      where: { id: Number(id) },
      data: {
        saldo: {
          increment: valor
        }
      }
    })

    res.status(200).json({ mensagem: "Depósito realizado com sucesso", aluno })
  } catch (error) {
    res.status(400).json({ erro: "Erro ao depositar saldo." })
  }
})


export default router
