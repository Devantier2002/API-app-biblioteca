import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const router = Router()
const prisma = new PrismaClient()

// Função para gerar código de 4 caracteres
function gerarCodigo(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

// 1️⃣ Solicitar recuperação de senha
router.post("/recuperar", async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ erro: "Informe o e-mail do usuário" })
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } })

    if (!usuario) {
      // Para segurança, resposta genérica
      return res.status(200).json({ mensagem: "Se o e-mail existir, o código foi enviado" })
    }

    const codigo = gerarCodigo()

    // Salva o código na tabela
    await prisma.recuperacaoSenha.create({
      data: {
        email,
        codigo
      }
    })

    // Simula envio de e-mail (substitua por integração real)
    console.log(`Código de recuperação para ${email}: ${codigo}`)

    res.status(200).json({ mensagem: "Código de recuperação enviado para o e-mail" })
  } catch (error) {
    console.error("Erro ao solicitar recuperação:", error)
    res.status(500).json({ erro: "Erro ao solicitar recuperação de senha" })
  }
})

// 2️⃣ Redefinir senha com código
router.post("/redefinir", async (req, res) => {
  const { email, codigo, novaSenha } = req.body

  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({ erro: "E-mail, código e nova senha são obrigatórios" })
  }

  try {
    const registro = await prisma.recuperacaoSenha.findFirst({
      where: { email, codigo },
      orderBy: { criadoEm: 'desc' }
    })

    if (!registro) {
      return res.status(400).json({ erro: "Código inválido ou expirado" })
    }

    const hash = bcrypt.hashSync(novaSenha, 10)

    // Atualiza a senha
    await prisma.usuario.update({
      where: { email },
      data: { senha: hash }
    })

    // Exclui o código usado
    await prisma.recuperacaoSenha.delete({ where: { id: registro.id } })

    res.status(200).json({ mensagem: "Senha atualizada com sucesso" })
  } catch (error) {
    console.error("Erro ao redefinir senha:", error)
    res.status(500).json({ erro: "Erro ao redefinir senha" })
  }
})

export default router
