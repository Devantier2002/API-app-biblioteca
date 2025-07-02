import express from 'express'
import routesAlunos from './routes/alunos'
import routesDepositos from './routes/depositos'
import routesEmprestimos from './routes/emprestimos'
import routesLivros from './routes/livros'
import routesLogin from './routes/login'
import routesRecuperacao from './routes/recuperacao'
import routesSeguranca from './routes/seguranca'
import routesUsuarios from './routes/usuarios'

const app = express()
const port = 3000

app.use(express.json())

app.use("/alunos", routesAlunos)
app.use("/depositos", routesDepositos)
app.use("/emprestimos", routesEmprestimos)
app.use("/livros", routesLivros)
app.use("/login", routesLogin)
app.use("/recuperacao", routesRecuperacao)
app.use("/seguranca", routesSeguranca)
app.use("/usuarios", routesUsuarios)

app.get('/', (req, res) => {
  res.send('API: Controle de Vendas da Cantina')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})