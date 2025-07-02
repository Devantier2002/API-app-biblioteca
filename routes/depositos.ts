import { PrismaClient, Tipos } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

const depositoSchema = z.object({
  alunoId: z.number(),
  tipo: z.nativeEnum(Tipos),
  valor: z.number().positive({ message: "Valor deve ser positivo" })
})

// Listar todos os depósitos com dados do aluno
router.get("/", async (req, res) => {
  try {
    const depositos = await prisma.deposito.findMany({
      include: {
        aluno: true
      }
    })
    res.status(200).json(depositos)
  } catch (error) {
    console.error("Erro ao buscar depósitos:", error)
    res.status(500).json({ erro: "Erro ao buscar depósitos" })
  }
})

// Criar um novo depósito e atualizar saldo do aluno
router.post("/", async (req, res) => {
  const valida = depositoSchema.safeParse(req.body)

  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { alunoId, tipo, valor } = valida.data

  try {
    const alunoExiste = await prisma.aluno.findUnique({
      where: { id: alunoId }
    })

    if (!alunoExiste) {
      return res.status(400).json({ erro: "Erro... Código do aluno inválido" })
    }

    const [deposito, aluno] = await prisma.$transaction([
      prisma.deposito.create({
        data: { alunoId, tipo, valor }
      }),
      prisma.aluno.update({
        where: { id: alunoId },
        data: { saldo: { increment: valor } }
      })
    ])

    res.status(201).json({ deposito, aluno })
  } catch (error) {
    console.error("Erro ao criar depósito:", error)
    res.status(400).json({ erro: "Erro ao criar depósito" })
  }
})

// Excluir depósito e atualizar saldo do aluno
router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const depositoExcluido = await prisma.deposito.findUnique({
      where: { id: Number(id) }
    })

    if (!depositoExcluido) {
      return res.status(404).json({ erro: "Depósito não encontrado" })
    }

    const [deposito, aluno] = await prisma.$transaction([
      prisma.deposito.delete({ where: { id: Number(id) } }),
      prisma.aluno.update({
        where: { id: depositoExcluido.alunoId },
        data: { saldo: { decrement: depositoExcluido.valor } }
      })
    ])

    res.status(200).json({ deposito, aluno })
  } catch (error) {
    console.error("Erro ao excluir depósito:", error)
    res.status(400).json({ erro: "Erro ao excluir depósito" })
  }
})

export default router
