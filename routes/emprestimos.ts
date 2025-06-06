import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

// Schema para validação do empréstimo
const emprestimoSchema = z.object({
  alunoId: z.number(),
  livroId: z.number()
})

// GET - listar todos os empréstimos
router.get("/", async (req, res) => {
  try {
    const emprestimos = await prisma.emprestimo.findMany({
      include: {
        aluno: true,
        livro: true // Inclui preço do livro automaticamente
      }
    })
    res.status(200).json(emprestimos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// POST - criar um novo empréstimo com transaction e considerar preço
router.post("/", async (req, res) => {
  const valida = emprestimoSchema.safeParse(req.body)

  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { alunoId, livroId } = valida.data

  const dadoAluno = await prisma.aluno.findUnique({
    where: { id: alunoId }
  })
  if (!dadoAluno) {
    res.status(400).json({ erro: "Erro... Código do aluno inválido" })
    return
  }
  
  const dadoLivro = await prisma.livro.findUnique({
    where: { id: livroId }
  })
  if (!dadoLivro) {
    res.status(400).json({ erro: "Erro... Código do livro inválido" })
    return
  }
  if (dadoLivro.quantidadeDisponivel <= 0) {
    res.status(400).json({ erro: "Erro... Livro indisponível para empréstimo" })
    return
  }

  // valor do empréstimo = preço do livro
  const valorEmprestimo = dadoLivro.preco

  try {
    const [emprestimo, livroAtualizado] = await prisma.$transaction([
      prisma.emprestimo.create({
        data: {
          alunoId,
          livroId,
          dataEmprestimo: new Date(),
          valor: valorEmprestimo 
        }
      }),
      prisma.livro.update({
        where: { id: livroId },
        data: { quantidadeDisponivel: { decrement: 1 } }
      })
    ])

    res.status(201).json({ emprestimo, livroAtualizado })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// DELETE - excluir um empréstimo e devolver o livro ao estoque
router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const emprestimo = await prisma.emprestimo.findUnique({
      where: { id: Number(id) },
      include: { livro: true } // para retornar também o preço, se quiser
    })

    if (!emprestimo) {
      res.status(404).json({ erro: "Empréstimo não encontrado" })
      return
    }

    const [emprestimoDeletado, livroAtualizado] = await prisma.$transaction([
      prisma.emprestimo.delete({
        where: { id: Number(id) }
      }),
      prisma.livro.update({
        where: { id: emprestimo.livroId },
        data: { quantidadeDisponivel: { increment: 1 } }
      })
    ])

    res.status(200).json({ emprestimoDeletado, livroAtualizado })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})


// PATCH - Devolver livro (deletar empréstimo e devolver livro ao estoque)
router.patch("/devolver/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  const { livroId } = req.body;

  if (!livroId) {
    return res.status(400).json({ erro: "livroId é obrigatório no corpo da requisição." });
  }

  try {
    const emprestimo = await prisma.emprestimo.findFirst({
      where: {
        alunoId: Number(alunoId),
        livroId: Number(livroId),
        dataDevolucao: null // apenas empréstimos ativos
      }
    });

    if (!emprestimo) {
      return res.status(404).json({ erro: "Empréstimo ativo não encontrado para esse aluno e livro." });
    }

    const [emprestimoDeletado, livroAtualizado] = await prisma.$transaction([
      prisma.emprestimo.delete({
        where: { id: emprestimo.id }
      }),
      prisma.livro.update({
        where: { id: livroId },
        data: {
          quantidadeDisponivel: {
            increment: 1
          }
        }
      })
    ]);

    res.status(200).json({
      mensagem: "Livro devolvido e empréstimo removido com sucesso.",
      emprestimoRemovido: emprestimoDeletado,
      livroAtualizado
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao devolver e remover o empréstimo." });
  }
});





export default router
