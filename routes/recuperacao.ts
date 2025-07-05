import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import nodemailer from 'nodemailer'

const router = Router()
const prisma = new PrismaClient()

// ✅ Configuração correta com Mailtrap
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525, // ⚠️ IMPORTANTE: usar 2525 para secure: false
  auth: {
    user: "b0ffd7ab33a38e", // substitua pelo seu
    pass: "8664734be871dc"  // substitua pelo seu
  }
})

// Função para gerar código aleatório de 4 caracteres
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

    // Sempre retorna sucesso (mesmo se e-mail não existir)
    if (!usuario) {
      return res.status(200).json({ mensagem: "Se o e-mail existir, o código foi enviado" })
    }

    const codigo = gerarCodigo()

    // Apaga códigos anteriores
    await prisma.recuperacaoSenha.deleteMany({ where: { email } })

    // Salva novo código
    await prisma.recuperacaoSenha.create({
      data: { email, codigo }
    })

    // Envia e-mail real via Mailtrap
    const info = await transporter.sendMail({
      from: 'Cantina Escolar <cantina@gmail.com>',
      to: email,
      subject: "Recuperação de Senha",
      text: `Seu código de recuperação é: ${codigo}`,
      html: `<p>Seu código de recuperação é: <strong>${codigo}</strong></p>`
    })

    console.log("E-mail enviado:", info.messageId)

    res.status(200).json({ mensagem: "Código de recuperação enviado para o e-mail" })

  } catch (error) {
    console.error("Erro ao solicitar recuperação:", error)
    res.status(500).json({ erro: "Erro ao solicitar recuperação de senha" })
  }
})

// 2️⃣ Redefinir senha com código e enviar confirmação por e-mail
router.post("/redefinir", async (req, res) => {
  const { email, codigo, novaSenha } = req.body

  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({ erro: "E-mail, código e nova senha são obrigatórios" })
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ erro: "A nova senha deve ter no mínimo 6 caracteres" })
  }

  try {
    const registro = await prisma.recuperacaoSenha.findFirst({
      where: { email, codigo },
      orderBy: { criadoEm: 'desc' }
    })

    if (!registro) {
      return res.status(400).json({ erro: "Código inválido ou já utilizado" })
    }

    // Verifica validade de 15 minutos
    const agora = new Date()
    const expiracao = new Date(registro.criadoEm)
    expiracao.setMinutes(expiracao.getMinutes() + 15)

    if (agora > expiracao) {
      return res.status(400).json({ erro: "Código expirado. Solicite um novo." })
    }

    // Atualiza senha
    const hash = bcrypt.hashSync(novaSenha, 10)
    await prisma.usuario.update({
      where: { email },
      data: { senha: hash }
    })

    // Exclui o código usado
    await prisma.recuperacaoSenha.delete({ where: { id: registro.id } })

    // ✅ Envia e-mail de confirmação
    await transporter.sendMail({
      from: 'Cantina Escolar <cantina@gmail.com>',
      to: email,
      subject: "Senha atualizada com sucesso",
      text: "Sua senha foi redefinida com sucesso.",
      html: `
        <p>Olá,</p>
        <p>Informamos que sua senha foi alterada com sucesso. Se você não solicitou essa alteração, entre em contato com o suporte imediatamente.</p>
        <p><strong>Biblioteca Escolar</strong></p>
      `
    })

    res.status(200).json({ mensagem: "Senha atualizada com sucesso" })

  } catch (error) {
    console.error("Erro ao redefinir senha:", error)
    res.status(500).json({ erro: "Erro ao redefinir senha" })
  }
})


export default router
