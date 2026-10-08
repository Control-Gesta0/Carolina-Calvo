// Tutorial 2: chave de API de produção do Asaas para a régua de cobrança.
// Telas ilustrativas: o caminho Integrações > Chaves de API segue a documentação oficial do Asaas.
(() => {
const KEY = '$aact_prod_000Mzk••••••••••••••••••••••••••••••';

const side = (on) => `
  <div class="as-side"><div class="logo">asaas</div>
  ${['Início', 'Cobranças', 'Clientes', 'Pix', 'Transferências', 'Relatórios', 'Integrações', 'Minha conta']
    .map(x => `<div class="it ${x === on ? 'on' : ''}" id="m-${x.normalize('NFD').replace(/[^a-z]/gi, '').toLowerCase()}">${x}</div>`).join('')}</div>
  <div class="as-top"><span style="margin-left:auto" class="muted">Carolina Calvo Advogados</span><div class="avatar" style="background:#0b5cd5">C</div></div>`;

const keysPage = `
  <div class="as-main"><h1 class="pt" style="font-size:22px">Integrações</h1>
    <div class="tabs"><div class="on" id="tab">Chaves de API</div><div>Webhooks</div><div>Logs de requisições</div></div>
    <div class="row" style="justify-content:space-between;margin-bottom:16px"><div class="muted">Use as chaves para conectar sistemas à sua conta Asaas.</div><span class="as-btn" id="gerar">+ Gerar chave de API</span></div>
    <table class="t"><tr><th>Nome</th><th>Criada em</th><th>Expira em</th><th>Status</th></tr>
      <tr><td colspan="4" class="muted" style="text-align:center;padding:26px">Nenhuma chave criada</td></tr></table></div>`;

window.SC_DATA = { scenes: [
{
  id: 'intro', kind: 'card', dur: 9,
  html: `<img class="logo" src="logo.png">
    <div class="kicker">Tutorial 2 de 2 · Dra. Carolina Calvo</div>
    <h1>Gerar a chave do Asaas para a cobrança automática</h1>
    <p>Com essa chave, o sistema consulta as cobranças, envia o link de pagamento no dia certo e confirma quando o cliente paga. Leva cerca de 3 minutos.</p>
    <div class="warn">Use o computador (o aplicativo do celular não gera a chave) e entre com um usuário administrador da conta.</div>
    <p style="margin-top:16px;font-size:15px;color:#6b7280">Telas ilustrativas: o caminho e os nomes seguem o Asaas, mas o visual da sua tela pode ser um pouco diferente.</p>`,
  captions: [{ at: 0, text: 'No final você vai enviar <b>1 chave</b> ao Guilherme.' }],
},
{
  id: 'login', kind: 'browser', dur: 8, step: 'Passo 1 de 6', url: 'www.asaas.com/login',
  cursorStart: { x: 900, y: 460 },
  html: `<div style="position:absolute;inset:0;background:#f2f5fa;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:430px;padding:30px 32px"><div style="font-weight:800;font-size:26px;color:#0b5cd5;margin-bottom:18px">asaas</div>
        <div class="field"><div class="input" id="email" style="min-width:0"><span class="lbl">E-mail</span><span class="val"></span></div></div>
        <div class="field"><div class="input" id="senha" style="min-width:0"><span class="lbl">Senha</span><span class="val"></span></div></div>
        <span class="as-btn" id="entrar" style="display:block;text-align:center">Entrar</span></div></div>`,
  actions: [
    { at: 0.5, move: '#email' }, { at: 1.0, click: true }, { at: 1.2, type: '#email', text: 'admin@escritorio.com.br', d: 1.1 },
    { at: 2.8, move: '#senha' }, { at: 3.3, click: true }, { at: 3.5, type: '#senha', text: '••••••••••', d: 0.8 },
    { at: 4.8, move: '#entrar' }, { at: 5.5, click: true },
  ],
  captions: [{ at: 0, text: 'Entre em <b>www.asaas.com</b> com o usuário administrador. É a conta real, não o ambiente de testes (sandbox).' }],
},
{
  id: 'menu', kind: 'browser', dur: 8, step: 'Passo 2 de 6', url: 'www.asaas.com/dashboard',
  html: side('Início') + `<div class="as-main"><h1 class="pt" style="font-size:22px">Início</h1>
      <div class="row" style="gap:16px">${['Recebido no mês', 'A receber', 'Vencidas'].map(x => `<div class="card" style="flex:1"><div class="muted">${x}</div><div style="font-size:22px;font-weight:700;margin-top:6px">R$ ••••</div></div>`).join('')}</div></div>`,
  actions: [
    { at: 0.6, move: '#m-integracoes' }, { at: 1.2, hl: '#m-integracoes' }, { at: 4.2, click: true },
  ],
  captions: [
    { at: 0, text: 'No menu, clique em <b>Integrações</b>.' },
    { at: 3.0, text: 'Se não aparecer no menu lateral, clique no seu nome ou ícone de perfil e procure <b>Integrações</b>.' },
  ],
},
{
  id: 'chaves', kind: 'browser', dur: 9, step: 'Passo 3 de 6', url: 'www.asaas.com/customerApiAccessToken/index',
  html: side('Integrações') + keysPage,
  actions: [
    { at: 0.4, move: '#tab' }, { at: 0.8, hl: '#tab', to: 3.6 },
    { at: 3.8, move: '#gerar' }, { at: 4.4, hl: '#gerar' }, { at: 6.6, click: true },
  ],
  captions: [
    { at: 0, text: 'Abra a aba <b>Chaves de API</b>.' },
    { at: 3.7, text: 'Clique para gerar uma nova chave. O botão pode aparecer como <b>Gerar chave de API</b>, <b>Gerar API Key</b> ou <b>Nova chave</b>.' },
  ],
},
{
  id: 'form', kind: 'browser', dur: 10, step: 'Passo 4 de 6', url: 'www.asaas.com/customerApiAccessToken/index',
  html: side('Integrações') + keysPage + `<div class="modal-bg"></div>
    <div class="modal" style="left:330px;top:70px;width:560px"><h2 class="pt" style="font-size:19px">Gerar nova chave de API</h2>
      <div class="field" style="margin-top:22px"><div class="input" id="kname" style="min-width:0"><span class="lbl">Nome da chave</span><span class="val"></span></div></div>
      <div class="field"><div class="input" id="kexp" style="min-width:0"><span class="lbl">Data de expiração (opcional)</span><span class="val"><span class="ph">dd/mm/aaaa</span></span></div></div>
      <div style="text-align:right"><span class="btn g">Cancelar</span> <span class="as-btn" id="kgo">Gerar chave</span></div></div>`,
  actions: [
    { at: 0.5, move: '#kname' }, { at: 1.0, click: true }, { at: 1.2, type: '#kname', text: 'Control Gestão - Anna', d: 1.4 },
    { at: 3.8, move: '#kexp' }, { at: 4.1, hl: '#kexp', to: 7.0 },
    { at: 7.2, move: '#kgo' }, { at: 7.9, click: true },
  ],
  captions: [
    { at: 0, text: 'Nome da chave: <b>Control Gestão - Anna</b>.' },
    { at: 3.8, text: 'Deixe a <b>data de expiração em branco</b>. Se a chave vencer, a cobrança automática para.' },
    { at: 7.1, text: 'Clique em <b>Gerar</b>.' },
  ],
},
{
  id: 'codigo', kind: 'browser', dur: 8, step: 'Passo 5 de 6', url: 'www.asaas.com/customerApiAccessToken/index',
  html: side('Integrações') + keysPage + `<div class="modal-bg"></div>
    <div class="modal" style="left:350px;top:80px;width:520px"><h2 class="pt" style="font-size:19px">Confirme sua identidade</h2>
      <p class="muted" style="margin:6px 0 20px">Digite o código de segurança que enviamos para você.</p>
      <div class="field"><div class="input" id="cod" style="min-width:0"><span class="lbl">Código</span><span class="val"></span></div></div>
      <div style="text-align:right"><span class="as-btn" id="cok">Confirmar</span></div></div>`,
  actions: [
    { at: 0.6, move: '#cod' }, { at: 1.2, click: true }, { at: 1.4, type: '#cod', text: '• • • • • •', d: 1.2 },
    { at: 3.4, move: '#cok' }, { at: 4.1, click: true },
  ],
  captions: [{ at: 0, text: 'Se o Asaas pedir um código de segurança (SMS, e-mail ou aplicativo autenticador), digite e confirme.' }],
},
{
  id: 'copiar', kind: 'browser', dur: 11, step: 'Passo 6 de 6', url: 'www.asaas.com/customerApiAccessToken/index',
  html: side('Integrações') + keysPage + `<div class="modal-bg"></div>
    <div class="modal" style="left:300px;top:60px;width:640px"><h2 class="pt" style="font-size:19px">Sua chave de API</h2>
      <div class="warn" style="background:#fff4ef;border-left:4px solid #EF4E22;padding:10px 14px;border-radius:6px;font-size:14px;color:#7c2d12;margin:10px 0 16px">Copie agora: a chave é exibida uma única vez.</div>
      <div class="row" id="key" style="justify-content:space-between;border:1px solid #dadce0;border-radius:6px;padding:12px 14px;margin-bottom:20px"><span class="secret">${KEY}</span></div>
      <div style="text-align:right"><span class="btn g">Fechar</span> <span class="as-btn" id="kcopy">Copiar</span></div></div>`,
  actions: [
    { at: 0.4, hl: '#key', to: 4.6 }, { at: 0.8, move: '#key', fx: 0.2 },
    { at: 4.8, move: '#kcopy' }, { at: 5.5, click: true }, { at: 5.6, hl: '#kcopy' },
  ],
  captions: [
    { at: 0, text: 'A chave aparece <b>uma única vez</b>. Ela começa com <b>$aact_prod_</b>.' },
    { at: 4.7, text: 'Clique em <b>Copiar</b> e cole num bloco de notas antes de fechar a janela.' },
  ],
},
{
  id: 'fim', kind: 'card', dur: 14, compact: true,
  html: `<img class="logo" src="logo.png">
    <div class="kicker">Pronto. Agora é só enviar</div>
    <h1>Mande ao Guilherme, em mensagem privada:</h1>
    <ul><li data-n="1">A chave de API (começa com $aact_prod_)</li></ul>
    <div class="warn">Não envie no grupo nem no ClickUp. Com essa chave é possível consultar e criar cobranças na sua conta.</div>
    <p style="margin-top:14px">Não ative a lista de IPs permitidos (Whitelist de IPs): o sistema roda na nuvem e os endereços mudam.</p>
    <p style="margin-top:10px">Se a chave vazar, exclua em Integrações › Chaves de API e gere outra.</p>`,
  captions: [{ at: 0, text: 'Travou em algum passo? Pause o vídeo e chame o Guilherme.' }],
},
]};
})();
