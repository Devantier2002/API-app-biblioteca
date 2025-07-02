import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import nodemailer from "nodemailer"
import { verificaToken } from '../middlewares/verificaToken'

const prisma = new PrismaClient()
const router = Router()

const alunoSchema = z.object({
  nome: z.string().min(10, { message: "Nome deve possuir, no mínimo, 10 caracteres" }),
  turma: z.string().min(2, { message: "Turma deve possuir, no mínimo, 2 caracteres" }),
  obs: z.string().optional(),
  responsavel: z.string().min(10, { message: "Nome do Responsável deve possuir, no mínimo, 10 caracteres" }),
  email: z.string().email().min(10, { message: "E-mail, no mínimo, 10 caracteres" }),
})

router.get("/", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany()
    res.status(200).json(alunos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", verificaToken, async (req, res) => {
  const valida = alunoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome, turma, responsavel, email, obs } = valida.data
  const usuarioId = req.userLogadoId as string

  try {
    const aluno = await prisma.aluno.create({
      data: { nome, turma, responsavel, email, obs, usuarioId }
    })
    res.status(201).json(aluno)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", verificaToken, async (req, res) => {
  const { id } = req.params

  try {
    const aluno = await prisma.aluno.delete({
      where: { id: Number(id) }
    })

    const usuarioId = req.userLogadoId as string
    const usuarioNome = req.userLogadoNome as string

    const descricao = `Exclusão do Aluno: ${aluno.nome}`
    const complemento = `Usuário: ${usuarioNome}`

    await prisma.log.create({
      data: { descricao, complemento, usuarioId }
    })

    res.status(200).json(aluno)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params
  const valida = alunoSchema.safeParse(req.body)

  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome, turma, responsavel, email, obs } = valida.data

  try {
    const aluno = await prisma.aluno.update({
      where: { id: Number(id) },
      data: { nome, turma, responsavel, email, obs }
    })
    res.status(200).json(aluno)
  } catch (error) {
    res.status(400).json({ error })
  }
})

function gerarTabelaHTML(dados: any) {
  let html = `
    <html>
    <body style="font-family: Helvetica, Arial, sans-serif;">
    <h2>Cantina Escolar: Relatório de Empréstimos e Depósitos</h2>
    <h3>Aluno: ${dados.nome} - Turma: ${dados.turma}</h3>
    <h3>Responsável: ${dados.responsavel}</h3> 
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead style="background-color: rgb(195, 191, 191);">
        <tr>
          <th>Data e Hora</th>
          <th>Tipo</th>          
          <th>Descrição</th>
          <th>Débito R$</th>
          <th>Crédito R$</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalDepositos = 0;
  for (const deposito of dados.depositos) {
    totalDepositos += Number(deposito.valor);
    const dataFormatada = new Date(deposito.data).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    html += `
      <tr>
        <td>${dataFormatada}</td>
        <td>Depósito</td>
        <td>${deposito.tipo}</td>
        <td></td>
        <td style="text-align: right;">${Number(deposito.valor).toLocaleString("pt-br", { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }

  let totalEmprestimos = 0;
  for (const emp of dados.emprestimos) {
    totalEmprestimos += Number(emp.valor);
    const dataFormatada = new Date(emp.dataEmprestimo).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    html += `
      <tr>
        <td>${dataFormatada}</td>
        <td>Empréstimo</td>
        <td>${emp.livro.titulo} - ${emp.livro.autor}</td>
        <td style="text-align: right;">${Number(emp.valor).toLocaleString("pt-br", { minimumFractionDigits: 2 })}</td>
        <td></td>
      </tr>
    `;
  }

  html += `
      <tr style="font-weight: bold; background-color:rgb(235, 232, 232);">
        <td colspan="3" style="text-align: right;">Total Geral:</td>
        <td style="text-align: right;">R$ ${totalEmprestimos.toLocaleString("pt-br", { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right;">R$ ${totalDepositos.toLocaleString("pt-br", { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
    </table>
    <h3>Saldo Atual R$: ${(totalDepositos - totalEmprestimos).toLocaleString("pt-br", { minimumFractionDigits: 2 })}</h3>
    </body>
    </html>
  `;

  return html;
}

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 465,
  secure: false,
  auth: {
    user: "b0ffd7ab33a38e",
    pass: "8664734be871dc",
  },
});

async function enviaEmail(dados: any) {
  const mensagem = gerarTabelaHTML(dados);

  try {
    const info = await transporter.sendMail({
      from: 'Cantina Escolar <cantina@gmail.com>',
      to: dados.email,
      subject: "Relatório de Empréstimos e Depósitos",
      text: `Olá ${dados.nome}, seu saldo disponível é R$ ${(dados.depositos.reduce((a:any,b:any) => a + b.valor, 0) - dados.emprestimos.reduce((a:any,b:any) => a + b.valor, 0)).toFixed(2)}`,
      html: mensagem,
    });

    console.log("E-mail enviado:", info.messageId);
  } catch (err) {
    console.error("Erro ao enviar email:", err);
    throw err;  // opcional: relançar para ser tratado na rota
  }
}


router.get("/email/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const aluno = await prisma.aluno.findFirst({
      where: { id: Number(id) },
      include: {
        depositos: true,
        emprestimos: {
          include: {
            livro: true
          }
        }
      }
    });

    if (!aluno) {
      return res.status(404).json({ message: "Aluno não encontrado" });
    }

    await enviaEmail(aluno);
    res.status(200).json(aluno);
  } catch (error) {
    console.error("Erro ao buscar aluno:", error);
    res.status(500).json({ erro: "Erro ao buscar aluno" });
  }
});

export default router;
