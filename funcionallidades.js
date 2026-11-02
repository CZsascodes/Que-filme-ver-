// 🔑 API TMDB
const apiKey = "1453e467eb527f984e293ade2e4a7512";

// ===================== CLASSE USER (convertida da Betinha) =====================
class User {
  constructor(nome, apelido, email, senha) {
    this.nome = nome;
    this.apelido = apelido;
    this.email = email;
    this.senhaConta = senha;
    this.filmesAvaliados = {}; // { "Superbad": 3 }
  }

  static validarTexto(texto) {
    if (!texto || texto.trim() === "") return "Campo vazio!";
    if (!/^[a-zA-ZÀ-ÿ ]+$/.test(texto)) return "Use apenas letras!";
    return null;
  }

  avaliarFilme(nomeFilme, nota, poster, sinopse) {
    this.filmesAvaliados[nomeFilme] = { nota, poster, sinopse, data: new Date() };
  }
}

class BancoUsuarios {
  constructor() {
    this.usuarios = JSON.parse(localStorage.getItem('usuarios_filmes')) || [];
    this.usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado')) || null;
    this.tentativasLogin = 1;
    this.MAX_TENTATIVAS = 3;
  }

  salvar() {
    localStorage.setItem('usuarios_filmes', JSON.stringify(this.usuarios));
    localStorage.setItem('usuarioLogado', JSON.stringify(this.usuarioLogado));
    // Atualiza lista geral tbm pra ranking
    const idx = this.usuarios.findIndex(u => u.apelido === this.usuarioLogado.apelido);
    if(idx >= 0) this.usuarios[idx] = this.usuarioLogado;
    localStorage.setItem('usuarios_filmes', JSON.stringify(this.usuarios));
  }

  cadastrar() {
    const nome = document.getElementById('nome-usuario').value.trim();
    const apelido = document.getElementById('apelido-usuario').value.trim();
    const email = document.getElementById('email-usuario').value.trim();
    const senha = document.getElementById('senha-usuario').value.trim();

    let erro = User.validarTexto(nome) || User.validarTexto(apelido);
    if (erro) return alert(erro);
    if (this.usuarios.find(u => u.apelido === apelido)) return alert("Este usuário já existe");
    const novo = new User(nome, apelido, email, senha);
    this.usuarios.push(novo);
    this.usuarioLogado = novo;
    this.salvar();
    fecharLogin();
    atualizarTela();
  }

  login() {
    const apelido = document.getElementById('apelido-usuario').value.trim();
    const senha = document.getElementById('senha-usuario').value.trim();
    const user = this.usuarios.find(u => u.apelido === apelido);

    if (!user || user.senhaConta!== senha) {
      alert(`Login errado. Tentativas restantes: ${this.MAX_TENTATIVAS - this.tentativasLogin}`);
      this.tentativasLogin++;
      if (this.tentativasLogin > this.MAX_TENTATIVAS) alert("Bloqueado! Recarrega a página");
      return;
    }
    this.usuarioLogado = user;
    this.tentativasLogin = 1;
    this.salvar();
    fecharLogin();
    atualizarTela();
  }

  logout() {
    this.usuarioLogado = null;
    localStorage.removeItem('usuarioLogado');
    atualizarTela();
  }
}

const banco = new BancoUsuarios();
let filmeAtualDados = null; // guarda dados do filme aberto

// ===================== SUAS FUNÇÕES DO SITE =====================
function scrollAssistidos(valor) {
  document.querySelector(".assistidos").scrollBy({ left: valor, behavior: "smooth" });
}

function abrir(nomeFilme) {
  if (!banco.usuarioLogado) return abrirLogin();

  fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${nomeFilme}&language=pt-BR`)
   .then(res => res.json())
   .then(dados => {
      const filme = dados.results[0];
      if (!filme) return alert("Filme não achado na API");

      filmeAtualDados = filme;
      document.getElementById('modal').style.display = 'flex';
      document.getElementById('tituloFilme').innerText = filme.title;
      document.getElementById('imgFilme').src = "https://image.tmdb.org/t/p/w500" + filme.poster_path;

      // Mostra quem já avaliou
      let html = `<p>${filme.overview}</p><br>`;

      let todasAvaliacoes = [];
      banco.usuarios.forEach(u => {
        if (u.filmesAvaliados[filme.title]) {
          todasAvaliacoes.push({ apelido: u.apelido, nota: u.filmesAvaliados[filme.title].nota });
        }
      });

      if (todasAvaliacoes.length > 0) {
        const media = todasAvaliacoes.reduce((a,b)=>a+b.nota,0) / todasAvaliacoes.length;
        html += `<b>⭐ Média da galera: ${media.toFixed(1)} (${todasAvaliacoes.length} votos)</b><br>`;
        html += todasAvaliacoes.map(a => `${a.apelido}: ${'⭐'.repeat(a.nota)}`).join('<br>');
      } else {
        html += "Ninguém avaliou ainda. Seja o primeiro!";
      }
      document.getElementById('sinopseFilme').innerHTML = html;
    });
}

function darNota(nota) {
  if (!banco.usuarioLogado ||!filmeAtualDados) return;

  const titulo = filmeAtualDados.title;
  const poster = "https://image.tmdb.org/t/p/w500" + filmeAtualDados.poster_path;

  banco.usuarioLogado.avaliarFilme(titulo, nota, poster, filmeAtualDados.overview);
  banco.salvar();

  alert(`${banco.usuarioLogado.apelido} deu ${nota} estrelas pra ${titulo}!`);
  abrir(titulo); // atualiza modal
  mostrarBanco(); // atualiza ranking
}

function fecharModal() { document.getElementById("modal").style.display = "none"; }
function abrirLogin() { document.getElementById('modal-login').style.display = 'flex'; }
function fecharLogin() { document.getElementById('modal-login').style.display = 'none'; }

function atualizarTela() {
  const span = document.getElementById('usuario-logado');
  const btnSair = document.getElementById('btn-sair');
  if (banco.usuarioLogado) {
    span.innerText = `Logado: ${banco.usuarioLogado.apelido} ☯`;
    btnSair.style.display = 'inline';
  } else {
    span.innerText = 'Ninguém logado';
    btnSair.style.display = 'none';
  }
  mostrarBanco();
}

function mostrarBanco() {
  const div = document.getElementById('ranking');
  if (!div) return;
  div.innerHTML = '';

  let todosFilmes = {};
  banco.usuarios.forEach(u => {
    Object.entries(u.filmesAvaliados).forEach(([titulo, dados]) => {
      if (!todosFilmes[titulo]) todosFilmes[titulo] = {...dados, titulo, avaliacoes: [] };
      todosFilmes[titulo].avaliacoes.push({ apelido: u.apelido, nota: dados.nota });
    });
  });

  Object.values(todosFilmes)
  .sort((a,b) => {
      const mediaA = a.avaliacoes.reduce((s,v)=>s+v.nota,0)/a.avaliacoes.length;
      const mediaB = b.avaliacoes.reduce((s,v)=>s+v.nota,0)/b.avaliacoes.length;
      return mediaB - mediaA;
    })
  .forEach(f => {
      const media = f.avaliacoes.reduce((s,v)=>s+v.nota,0)/f.avaliacoes.length;
      const ehMeu = banco.usuarioLogado && banco.usuarioLogado.filmesAvaliados[f.titulo];

      div.innerHTML += `
        <div style="width:140px; text-align:center; position:relative">
          <img src="${f.poster}" style="width:100%; border-radius:8px">
          <b>${f.titulo}</b><br>${media.toFixed(1)} ⭐ (${f.avaliacoes.length})
          ${ehMeu? `
            <br>
            <button onclick="editarAvaliacao('${f.titulo}')" style="font-size:11px">✏️ Editar</button>
            <button onclick="removerAvaliacao('${f.titulo}')" style="font-size:11px">🗑️ Remover</button>
          ` : ''}
        </div>`;
    });
}

atualizarTela();
// Fecha qualquer modal com ESC (igual o X)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharModal();
    fecharLogin();
  }
}); // Fecha clicando fora da caixinha
window.addEventListener('click', (e) => {
  if (e.target.id === 'modal') fecharModal();
  if (e.target.id === 'modal-login') fecharLogin();
});
function removerAvaliacao(titulo) {
  if (!banco.usuarioLogado) return;
  if (!confirm(`Remover ${titulo} da sua lista?`)) return;

  delete banco.usuarioLogado.filmesAvaliados[titulo];
  banco.salvar();
  mostrarBanco();
  fecharModal();
}

function editarAvaliacao(titulo) {
  const nova = prompt(`Nova nota para ${titulo} (1 a 3):`);
  if (!nova) return;
  const nota = parseInt(nova);
  if (nota < 1 || nota > 3) return alert("Só vale 1, 2 ou 3");

  // só troca a nota, mantem poster e sinopse
  banco.usuarioLogado.filmesAvaliados[titulo].nota = nota;
  banco.salvar();
  mostrarBanco();
  abrir(titulo); // reabre pra atualizar
}
// se já avaliei, mostra opção de remover/editar no modal também
if (banco.usuarioLogado && banco.usuarioLogado.filmesAvaliados[filme.title]) {
  html += `<br><br>
    <button onclick="editarAvaliacao('${filme.title}')">✏️ Mudar nota</button>
    <button onclick="removerAvaliacao('${filme.title}')">🗑️ Remover avaliação</button>
  `;
}