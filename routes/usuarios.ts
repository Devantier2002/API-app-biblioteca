import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const router = Router()

// 🧾 Schema de validação
const usuarioSchema = z.object({
  nome: z.string().min(10, { message: "Nome deve possuir, no mínimo, 10 caracteres" }),
  email: z.string().email().min(10, { message: "E-mail deve ter no mínimo 10 caracteres" }),
  senha: z.string()
})

// 🔐 Função de validação de senha forte
function validaSenha(senha: string): string[] {
  const erros: string[] = []

  if (senha.length < 8) erros.push("Senha deve ter pelo menos 8 caracteres")
  if (!/[a-z]/.test(senha)) erros.push("Senha deve conter letra(s) minúscula(s)")
  if (!/[A-Z]/.test(senha)) erros.push("Senha deve conter letra(s) maiúscula(s)")
  if (!/[0-9]/.test(senha)) erros.push("Senha deve conter número(s)")
  if (!/[^A-Za-z0-9]/.test(senha)) erros.push("Senha deve conter símbolo(s)")

  return erros
}

// 🔍 GET - Listar usuários
router.get("/", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany()
    res.status(200).json(usuarios)
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    res.status(500).json({ erro: "Erro ao buscar usuários" })
  }
})

// ➕ POST - Criar novo usuário
router.post("/", async (req, res) => {
  const valida = usuarioSchema.safeParse(req.body)

  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.format() })
  }

  const { nome, email, senha } = valida.data
  const errosSenha = validaSenha(senha)

  if (errosSenha.length > 0) {
    return res.status(400).json({ erro: errosSenha })
  }

  const hash = bcrypt.hashSync(senha, 12)

  try {
    const usuario = await prisma.usuario.create({
      data: { nome, email, senha: hash }
    })
    res.status(201).json(usuario)
  } catch (error) {
    console.error("Erro ao criar usuário:", error)
    res.status(400).json({ erro: "Erro ao criar usuário. Verifique se o e-mail já existe." })
  }
})

// 🔄 PUT - Atualizar usuário (com nova senha criptografada)
router.put("/:id", async (req, res) => {
  const { id } = req.params
  const valida = usuarioSchema.safeParse(req.body)

  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.format() })
  }

  const { nome, email, senha } = valida.data
  const errosSenha = validaSenha(senha)

  if (errosSenha.length > 0) {
    return res.status(400).json({ erro: errosSenha })
  }

  const hash = bcrypt.hashSync(senha, 12)

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { nome, email, senha: hash }
    })
    res.status(200).json(usuario)
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error)
    res.status(400).json({ erro: "Erro ao atualizar usuário" })
  }
})

// 🗑️ DELETE - Remover usuário
router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const usuario = await prisma.usuario.delete({
      where: { id }
    })
    res.status(200).json(usuario)
  } catch (error) {
    console.error("Erro ao excluir usuário:", error)
    res.status(400).json({ erro: "Erro ao excluir usuário" })
  }
})

// 🔓 PUT - Desbloquear usuário
router.put("/admin/desbloquear/:id", async (req, res) => {
  const { id } = req.params

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        tentativasInvalidas: 0,
        bloqueado: false
      }
    })
    res.status(200).json({ mensagem: "Usuário desbloqueado com sucesso", usuario })
  } catch (error) {
    console.error("Erro ao desbloquear usuário:", error)
    res.status(400).json({ erro: "Erro ao desbloquear usuário" })
  }
})

export default router
