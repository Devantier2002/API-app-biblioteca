import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const router = Router()

router.post("/", async (req, res) => {
  const { email, senha } = req.body
  const mensagemPadrao = "Login ou senha incorretos"

  if (!email || !senha) {
    return res.status(400).json({ erro: mensagemPadrao })
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } })

    if (!usuario) {
      return res.status(400).json({ erro: mensagemPadrao })
    }

    // Verifica se está bloqueado
    if (usuario.bloqueado) {
      return res.status(403).json({ erro: "Usuário bloqueado. Contate o administrador." })
    }

    const senhaCorreta = bcrypt.compareSync(senha, usuario.senha)

    if (!senhaCorreta) {
      // Incrementa tentativas
      const novasTentativas = usuario.tentativasInvalidas + 1
      const deveBloquear = novasTentativas >= 3

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          tentativasInvalidas: novasTentativas,
          bloqueado: deveBloquear
        }
      })

      // Log de tentativa inválida
      await prisma.log.create({
        data: {
          descricao: "Tentativa de acesso inválida",
          complemento: `Usuário: ${usuario.id} - ${usuario.nome} (${novasTentativas}x)`,
          usuarioId: usuario.id
        }
      })

      const erroMensagem = deveBloquear
        ? "Usuário bloqueado após 3 tentativas inválidas."
        : mensagemPadrao

      return res.status(400).json({ erro: erroMensagem })
    }

    // Login bem-sucedido: resetar tentativas
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasInvalidas: 0,
        bloqueado: false
      }
    })

    // Gera token
    const token = jwt.sign(
      {
        userLogadoId: usuario.id,
        userLogadoNome: usuario.nome
      },
      process.env.JWT_KEY as string,
      { expiresIn: "1h" }
    )

    res.status(200).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      token
    })

  } catch (error) {
    console.error("Erro ao realizar login:", error)
    res.status(500).json({ erro: "Erro interno ao realizar login" })
  }
})



export default router
