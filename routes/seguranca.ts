import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const router = Router()

// ROTA DE BACKUP
router.get('/backup', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany()
    const alunos = await prisma.aluno.findMany()
    const depositos = await prisma.deposito.findMany()
    const logs = await prisma.log.findMany()

    const dadosBackup = {
      usuarios,
      alunos,
      depositos,
      logs,
      dataBackup: new Date().toISOString()
    }

    const caminho = path.resolve(__dirname, '../../backup.json')
    fs.writeFileSync(caminho, JSON.stringify(dadosBackup, null, 2))

    res.status(200).json({
      mensagem: 'Backup gerado com sucesso!',
      arquivo: 'backup.json'
    })
  } catch (erro) {
    console.error('Erro ao gerar backup:', erro)
    res.status(500).json({ erro: 'Erro ao gerar o backup.' })
  }
})

// ROTA DE RESTAURAÇÃO
router.post('/restore', async (req, res) => {
  try {
    const caminho = path.resolve(__dirname, '../../backup.json')

    if (!fs.existsSync(caminho)) {
      return res.status(404).json({ erro: 'Arquivo de backup.json não encontrado.' })
    }

    const conteudo = fs.readFileSync(caminho, 'utf8')
    const dados = JSON.parse(conteudo)

    // Validação mínima
    if (!dados.usuarios || !Array.isArray(dados.usuarios)) {
      return res.status(400).json({ erro: 'Formato do backup inválido ou corrompido.' })
    }

    // DELEÇÃO EM ORDEM REVERSA (para respeitar as FKs)
    await prisma.deposito.deleteMany()
    await prisma.aluno.deleteMany()
    await prisma.log.deleteMany()
    await prisma.usuario.deleteMany()

    // INSERÇÃO EM ORDEM CORRETA
    for (const usuario of dados.usuarios || []) {
      const { id, createdAt, updatedAt, ...limpo } = usuario
      await prisma.usuario.create({ data: limpo })
    }

    for (const aluno of dados.alunos || []) {
      const { id, createdAt, updatedAt, ...limpo } = aluno
      await prisma.aluno.create({ data: limpo })
    }

    for (const deposito of dados.depositos || []) {
      const { id, createdAt, updatedAt, ...limpo } = deposito
      await prisma.deposito.create({ data: limpo })
    }

    for (const log of dados.logs || []) {
      const { id, createdAt, updatedAt, ...limpo } = log
      await prisma.log.create({ data: limpo })
    }

    res.status(200).json({
      mensagem: 'Dados restaurados com sucesso a partir do backup.'
    })
  } catch (erro) {
    console.error('Erro ao restaurar dados:', erro)
    res.status(500).json({ erro: 'Erro ao restaurar os dados.' })
  }
})

export default router
