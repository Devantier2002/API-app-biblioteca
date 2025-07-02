import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

const emprestimoSchema = z.object({
  alunoId: z.number(),
  livroId: z.number()
})

// GET - Listar todos os empréstimos com dados do aluno e livro
router.get("/", async (req, res) => {
  try {
    const emprestimos = await prisma.emprestimo.findMany({
      include: {
        aluno: true,
        livro: true
      }
    })
    res.status(200).json(emprestimos)
  } catch (error) {
    console.error("Erro ao buscar empréstimos:", error)
    res.status(500).json({ erro: "Erro ao buscar empréstimos" })
  }
})

// POST - Criar um novo empréstimo e decrementar estoque
router.post("/", async (req, res) => {
  const valida = emprestimoSchema.safeParse(req.body)

  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { alunoId, livroId } = valida.data

  try {
    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } })
    if (!aluno) {
      return res.status(400).json({ erro: "Aluno não encontrado" })
    }

    const livro = await prisma.livro.findUnique({ where: { id: livroId } })
    if (!livro) {
      return res.status(400).json({ erro: "Livro não encontrado" })
    }

    if (livro.quantidadeDisponivel <= 0) {
      return res.status(400).json({ erro: "Livro indisponível para empréstimo" })
    }

    const valor = livro.preco

    const [emprestimo, livroAtualizado] = await prisma.$transaction([
      prisma.emprestimo.create({
        data: {
          alunoId,
          livroId,
          dataEmprestimo: new Date(),
          valor
        }
      }),
      prisma.livro.update({
        where: { id: livroId },
        data: { quantidadeDisponivel: { decrement: 1 } }
      })
    ])

    res.status(201).json({ emprestimo, livroAtualizado })
  } catch (error) {
    console.error("Erro ao criar empréstimo:", error)
    res.status(400).json({ erro: "Erro ao criar empréstimo" })
  }
})

// DELETE - Remover empréstimo e devolver livro ao estoque
router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const emprestimo = await prisma.emprestimo.findUnique({
      where: { id: Number(id) }
    })

    if (!emprestimo) {
      return res.status(404).json({ erro: "Empréstimo não encontrado" })
    }

    const [emprestimoDeletado, livroAtualizado] = await prisma.$transaction([
      prisma.emprestimo.delete({ where: { id: Number(id) } }),
      prisma.livro.update({
        where: { id: emprestimo.livroId },
        data: { quantidadeDisponivel: { increment: 1 } }
      })
    ])

    res.status(200).json({ emprestimoDeletado, livroAtualizado })
  } catch (error) {
    console.error("Erro ao excluir empréstimo:", error)
    res.status(400).json({ erro: "Erro ao excluir empréstimo" })
  }
})

// PATCH - Devolver livro via alunoId e livroId
router.patch("/devolver/:alunoId", async (req, res) => {
  const { alunoId } = req.params
  const { livroId } = req.body

  if (!livroId) {
    return res.status(400).json({ erro: "livroId é obrigatório no corpo da requisição." })
  }

  try {
    const emprestimo = await prisma.emprestimo.findFirst({
      where: {
        alunoId: Number(alunoId),
        livroId: Number(livroId),
        dataDevolucao: null
      }
    })

    if (!emprestimo) {
      return res.status(404).json({ erro: "Empréstimo ativo não encontrado para esse aluno e livro." })
    }

    const [emprestimoRemovido, livroAtualizado] = await prisma.$transaction([
      prisma.emprestimo.delete({ where: { id: emprestimo.id } }),
      prisma.livro.update({
        where: { id: livroId },
        data: { quantidadeDisponivel: { increment: 1 } }
      })
    ])

    res.status(200).json({
      mensagem: "Livro devolvido e empréstimo removido com sucesso.",
      emprestimoRemovido,
      livroAtualizado
    })
  } catch (error) {
    console.error("Erro ao devolver livro:", error)
    res.status(500).json({ erro: "Erro ao devolver e remover o empréstimo." })
  }
})

export default router
