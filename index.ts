import express from 'express'
import routesAlunos from './routes/alunos'
import routesEmprestimos from './routes/emprestimos'
import routesLivros from './routes/livros'


const app = express()
const port = 3000

app.use(express.json())

app.use("/alunos", routesAlunos)
app.use("/emprestimos", routesEmprestimos)
app.use("/livros", routesLivros)


app.get('/', (req, res) => {
  res.send('API: Sistema de Biblioteca')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})