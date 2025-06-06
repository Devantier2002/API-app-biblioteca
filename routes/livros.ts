import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

// Validação de dados do Livro
const livroSchema = z.object({
  titulo: z.string().min(3, { message: "Título deve ter pelo menos 3 caracteres" }),
  autor: z.string().min(3, { message: "Autor deve ter pelo menos 3 caracteres" }),
  preco: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Preço deve ser um número válido",
  }),
  quantidadeDisponivel: z.number().int().nonnegative({ message: "Quantidade deve ser 0 ou mais" })
})

// Listar todos os livros
router.get('/', async (req, res) => {
  try {
    const livros = await prisma.livro.findMany()
    res.status(200).json(livros)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// Buscar um livro por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const livro = await prisma.livro.findUnique({
      where: { id: Number(id) }
    })
    if (!livro) {
      return res.status(404).json({ erro: "Livro não encontrado" })
    }
    res.status(200).json(livro)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// Criar um novo livro
router.post('/', async (req, res) => {
  const valida = livroSchema.safeParse(req.body)

  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { titulo, autor, preco, quantidadeDisponivel } = valida.data

  try {
    const livro = await prisma.livro.create({
      data: { 
        titulo, 
        autor, 
        preco: Number(preco), 
        quantidadeDisponivel 
      }
    })
    res.status(201).json(livro)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Atualizar um livro
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const valida = livroSchema.safeParse(req.body)

  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { titulo, autor, preco, quantidadeDisponivel } = valida.data

  try {
    const livro = await prisma.livro.update({
      where: { id: Number(id) },
      data: { 
        titulo, 
        autor, 
        preco: Number(preco), 
        quantidadeDisponivel 
      }
    })
    res.status(200).json(livro)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Deletar um livro
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  try {
    const livro = await prisma.livro.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(livro)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
