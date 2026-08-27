// ⚠️ COLOQUE SUAS CHAVES AQUI!
const SUPABASE_URL = 'https://kwelkifilfmaomwuqihd.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWxraWZpbGZtYW9td3VxaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MjgzNDIsImV4cCI6MjEwMzQwNDM0Mn0.JyAfUtBlMpVj6ch24c0c8tlg8UmiQO8_7ihhqM-81ys';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== AUTENTICAÇÃO ====================

async function fazerCadastro(e) {
    e.preventDefault();
    const nome = document.getElementById('cadastro-nome').value;
    const email = document.getElementById('cadastro-email').value;
    const senha = document.getElementById('cadastro-senha').value;

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: senha,
        options: { data: { nome: nome } }
    });

    if (error) {
        alert('Erro: ' + error.message);
    } else {
        alert('Conta criada! Verifique seu email para confirmar. Depois faça login.');
        window.location.href = 'auth.html';
    }
}

async function fazerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        alert('Erro: ' + error.message);
    } else {
        alert('Login feito com sucesso!');
        window.location.href = 'publicar.html';
    }
}

async function fazerLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Atualiza a barra de navegação (mostra login ou logout)
async function atualizarNav() {
    const nav = document.getElementById('nav-links');
    if (!nav) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const nome = user.user_metadata?.nome || 'Usuário';
        nav.innerHTML = `
            <a href="publicar.html">📤 Publicar</a>
            <span style="color: var(--primary);">Olá, ${nome}!</span>
            <a href="#" onclick="fazerLogout()" class="btn-logout">Sair</a>
        `;
    } else {
        nav.innerHTML = `
            <a href="publicar.html">📤 Publicar</a>
            <a href="auth.html">Entrar / Cadastrar</a>
        `;
    }
}

// ==================== PÁGINA PÚBLICA ====================

async function carregarPluginsPublico(categoriaFiltro) {
    const grid = document.getElementById('plugins-grid');
    if (!grid) return;
    grid.innerHTML = '<p>Carregando...</p>';

    let query = supabase.from('plugins').select('*').order('id', { ascending: false });
    if (categoriaFiltro !== 'todos') {
        query = query.eq('categoria', categoriaFiltro);
    }
    const { data, error } = await query;

    if (error) {
        grid.innerHTML = '<p>Erro ao carregar.</p>';
        return;
    }
    if (data.length === 0) {
        grid.innerHTML = '<p>Nenhum item encontrado.</p>';
        return;
    }

    grid.innerHTML = data.map(item => {
        const isGratis = parseFloat(item.preco) <= 0;
        const precoHTML = isGratis 
            ? `<div class="badge-gratis">✨ Grátis</div>` 
            : `<div class="price">R$ ${parseFloat(item.preco).toFixed(2)}</div>`;
        const autor = item.autor_nome || 'Anônimo';
        return `
            <div class="card">
                <img src="${item.imagem_url}" alt="${item.nome}" onerror="this.src='https://via.placeholder.com/300x150?text=Sem+Imagem'">
                <div class="card-content">
                    <span style="background: #333; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; text-transform: uppercase;">${item.categoria}</span>
                    <h3>${item.nome}</h3>
                    <p>${item.descricao}</p>
                    ${precoHTML}
                    <div class="autor-badge">👤 Por: ${autor}</div>
                    <a href="${item.download_url}" target="_blank" class="btn" style="margin-top: 10px;">${isGratis ? 'Baixar Grátis' : 'Comprar'}</a>
                </div>
            </div>
        `;
    }).join('');
}

function filtrarCategoria(categoria, botao) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    botao.classList.add('active');
    carregarPluginsPublico(categoria);
}

// ==================== PUBLICAR RECURSOS ====================

function togglePreco() {
    const isGratis = document.getElementById('is_gratis').checked;
    const precoGroup = document.getElementById('preco-group');
    const precoInput = document.getElementById('preco');
    if (isGratis) {
        precoGroup.classList.add('disabled');
        precoInput.required = false;
        precoInput.value = '';
    } else {
        precoGroup.classList.remove('disabled');
        precoInput.required = true;
    }
}

async function adicionarPlugin(event) {
    event.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('Você precisa estar logado!');
        return;
    }

    const isGratis = document.getElementById('is_gratis').checked;
    const novoItem = {
        categoria: document.getElementById('categoria').value,
        nome: document.getElementById('nome').value,
        descricao: document.getElementById('descricao').value,
        preco: isGratis ? 0 : document.getElementById('preco').value,
        imagem_url: document.getElementById('imagem_url').value,
        download_url: document.getElementById('download_url').value,
        user_id: user.id,
        autor_nome: user.user_metadata?.nome || 'Usuário'
    };

    if (!isGratis && (!novoItem.preco || novoItem.preco <= 0)) {
        alert('Insira um preço válido ou marque como grátis.');
        return;
    }

    const { error } = await supabase.from('plugins').insert([novoItem]);
    if (error) {
        alert('Erro: ' + error.message);
    } else {
        alert('Recurso publicado com sucesso!');
        document.getElementById('plugin-form').reset();
        togglePreco();
        carregarMeusRecursos();
    }
}

async function carregarMeusRecursos() {
    const lista = document.getElementById('meus-recursos');
    if (!lista) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('plugins')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });

    if (error) {
        lista.innerHTML = '<p>Erro ao carregar.</p>';
        return;
    }
    if (data.length === 0) {
        lista.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Você ainda não publicou nada.</p>';
        return;
    }

    lista.innerHTML = data.map(item => `
        <div class="card">
            <div class="card-content">
                <span style="color: var(--primary); font-size: 0.8em; text-transform: uppercase;">${item.categoria}</span>
                <h3>${item.nome}</h3>
                <p>R$ ${parseFloat(item.preco).toFixed(2)}</p>
                <button onclick="deletarPlugin(${item.id})" class="btn btn-danger">Excluir</button>
            </div>
        </div>
    `).join('');
}

async function deletarPlugin(id) {
    if (!confirm('Excluir este recurso?')) return;
    const { error } = await supabase.from('plugins').delete().eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else {
        alert('Excluído!');
        carregarMeusRecursos();
    }
}