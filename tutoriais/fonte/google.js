// Tutorial 1: credenciais do Google Agenda (OAuth com refresh token) para a Anna.
// Telas ilustrativas: os rótulos seguem o Google Cloud em português, com o inglês entre parênteses.
(() => {
const CONTA = 'contadaagenda@gmail.com';
const CID = '123456789012-a1b2c3d4e5f6.apps.googleusercontent.com';
const CSEC = 'GOCSPX-••••••••••••••••••••';

const top = (proj, search = 'Pesquisar (/) recursos, documentos, produtos e muito mais', alt = '') => `
  <div class="gc-top"><div class="burger"></div><div class="gc-brand"><b>Google</b> Cloud</div>
  <div class="proj" id="proj" style="position:relative">${proj}${alt ? `<span class="reveal" id="projalt" style="position:absolute;inset:0;background:#fff;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-weight:600">${alt} ▾</span>` : ''}</div>
  <div class="search" id="srch"><span class="val">${search}</span></div><div class="avatar" id="avatar">C</div></div>`;

const side = (on) => `
  <div class="gc-side"><div class="t">Google Auth Platform</div>
  ${['Visão geral', 'Branding', 'Público-alvo (Audience)', 'Clientes (Clients)', 'Acesso a dados (Data Access)']
    .map(x => `<div class="it ${x.startsWith(on) ? 'on' : ''}">${x}</div>`).join('')}</div>`;

window.SC_DATA = { scenes: [
{
  id: 'intro', kind: 'card', dur: 9,
  html: `<img class="logo" src="logo.png">
    <div class="kicker">Tutorial 1 de 2 · Dra. Carolina Calvo</div>
    <h1>Liberar o Google Agenda para a Anna</h1>
    <p>Com esse acesso, a Anna consulta os horários livres da sua agenda e marca a reunião com link do Google Meet. Leva cerca de 10 minutos.</p>
    <div class="warn">Faça no computador, logada na conta Google da agenda onde as reuniões são marcadas.</div>
    <p style="margin-top:16px;font-size:15px;color:#6b7280">Telas ilustrativas: os nomes dos botões são os do Google, mas o visual pode variar um pouco. Se a sua tela estiver em inglês, use o nome entre parênteses.</p>`,
  captions: [{ at: 0, text: 'No final você vai enviar <b>3 códigos</b> ao Guilherme. Vamos lá.' }],
},
{
  id: 'console', kind: 'browser', dur: 9, step: 'Passo 1 de 11', url: 'console.cloud.google.com',
  html: top('Selecione um projeto') + `
    <div class="gc-full"><h1 class="pt">Boas-vindas ao Google Cloud</h1>
      <div class="card" style="width:620px">
        <h2 class="pt">Antes de começar</h2>
        <div class="row" style="margin:6px 0 20px"><span class="chk" id="terms"></span><span style="font-size:14px">Concordo com os Termos de Serviço do Google Cloud Platform</span></div>
        <span class="btn" id="agree">Concordar e continuar (Agree and continue)</span>
      </div></div>`,
  actions: [
    { at: 0.6, move: '#avatar' }, { at: 0.9, hl: '#avatar', to: 3.8 },
    { at: 4.0, move: '#terms' }, { at: 4.7, click: true }, { at: 4.75, check: '#terms' },
    { at: 5.4, move: '#agree' }, { at: 6.1, click: true },
  ],
  captions: [
    { at: 0, text: 'Abra <b>console.cloud.google.com</b>. Confira no canto direito se está na conta Google da agenda.' },
    { at: 3.9, text: 'Se aparecer o aviso de termos (primeiro acesso), marque e clique em <b>Concordar e continuar</b>.' },
  ],
},
{
  id: 'projeto', kind: 'browser', dur: 11, step: 'Passo 2 de 11', url: 'console.cloud.google.com',
  html: top('Selecione um projeto', undefined, 'Agenda Anna') + `
    <div class="gc-full"><h1 class="pt">Painel</h1><div class="muted">Nenhum projeto selecionado.</div></div>
    <div class="reveal" id="m1"><div class="modal-bg"></div>
      <div class="modal" style="left:250px;top:70px;width:700px">
        <div class="row" style="justify-content:space-between;margin-bottom:16px"><h2 class="pt" style="margin:0">Selecione um projeto</h2><span class="btn o" id="newproj">Novo projeto (New project)</span></div>
        <div class="muted" style="padding:30px 0;text-align:center">Nenhum projeto encontrado</div></div></div>
    <div class="reveal" id="m2"><div class="modal-bg"></div>
      <div class="modal" style="left:300px;top:60px;width:600px">
        <h2 class="pt">Novo projeto</h2>
        <div class="field" style="margin-top:22px"><div class="input" id="pname"><span class="lbl">Nome do projeto *</span><span class="val"></span></div></div>
        <div class="muted" style="margin-bottom:22px">Local: Nenhuma organização</div>
        <span class="btn" id="create">Criar (Create)</span> <span class="btn g">Cancelar</span></div></div>
    <div class="reveal" id="toast" style="position:absolute;left:24px;bottom:22px;background:#323232;color:#fff;padding:12px 18px;border-radius:6px;font-size:14px">Projeto "Agenda Anna" criado</div>`,
  actions: [
    { at: 0.5, move: '#proj' }, { at: 1.2, click: true }, { at: 1.4, show: '#m1' },
    { at: 2.0, move: '#newproj' }, { at: 2.7, click: true }, { at: 3.0, hide: '#m1' }, { at: 3.0, show: '#m2' },
    { at: 3.6, move: '#pname' }, { at: 4.2, click: true }, { at: 4.4, type: '#pname', text: 'Agenda Anna', d: 1.3 },
    { at: 6.4, move: '#create' }, { at: 7.1, click: true }, { at: 7.4, hide: '#m2' }, { at: 7.6, show: '#toast' }, { at: 7.8, show: '#projalt' }, { at: 8.0, hl: '#proj' },
  ],
  captions: [
    { at: 0, text: 'Clique no seletor de projeto, no topo, e depois em <b>Novo projeto</b>.' },
    { at: 3.3, text: 'Nome do projeto: <b>Agenda Anna</b>. Clique em <b>Criar</b>.' },
    { at: 7.6, text: 'Depois de criado, confira se o projeto <b>Agenda Anna</b> está selecionado no topo da tela.' },
  ],
},
{
  id: 'api', kind: 'browser', dur: 11, step: 'Passo 3 de 11', url: 'console.cloud.google.com/apis/library',
  html: top('Agenda Anna', '') + `
    <div class="gc-full">
      <div class="reveal" id="res"><h1 class="pt">Resultados da pesquisa</h1>
        <div class="result" id="res1" style="width:640px"><div class="api-ico">31</div><div><div style="font-weight:600">Google Calendar API</div><div class="muted">Google Enterprise API · Integra o Google Agenda ao seu app</div></div></div>
        <div class="result" style="width:640px;opacity:.6"><div class="api-ico">C</div><div><div style="font-weight:600">CalDAV API</div><div class="muted">Google Enterprise API</div></div></div></div>
      <div class="reveal" id="prod" style="position:absolute;inset:0;background:#fff;padding:26px 34px">
        <div class="row" style="gap:18px;margin-bottom:18px"><div class="api-ico" style="width:64px;height:64px;font-size:22px">31</div>
          <div><h1 class="pt" style="margin:0">Google Calendar API</h1><div class="muted">Google Enterprise API</div></div></div>
        <div class="row"><span class="btn" id="enable">Ativar (Enable)</span><span class="reveal muted" id="enabled" style="color:#1e8e3e;font-weight:600">✓ API ativada</span></div>
        <p class="muted" style="margin-top:22px;max-width:640px">Integra o Google Agenda ao seu app: consultar horários, criar eventos e gerar o link do Google Meet.</p></div>
    </div>`,
  actions: [
    { at: 0.5, move: '#srch', fx: 0.2 }, { at: 1.1, click: true },
    { at: 1.3, type: '#srch', text: 'Google Calendar API', d: 1.5, ph: 'Pesquisar (/) recursos, documentos, produtos e muito mais' },
    { at: 3.1, show: '#res' }, { at: 3.5, move: '#res1' }, { at: 4.2, click: true }, { at: 4.5, show: '#prod' },
    { at: 5.2, move: '#enable' }, { at: 6.0, click: true }, { at: 6.4, show: '#enabled' },
  ],
  captions: [
    { at: 0, text: 'Na barra de busca, digite <b>Google Calendar API</b> e abra o resultado.' },
    { at: 4.5, text: 'Clique em <b>Ativar</b> (Enable). É essa API que também cria o link do Google Meet.' },
  ],
},
{
  id: 'auth1', kind: 'browser', dur: 12, step: 'Passo 4 de 11', url: 'console.cloud.google.com/auth/overview',
  html: top('Agenda Anna', '') + side('Visão geral') + `
    <div class="gc-main">
      <div id="gsbox"><h1 class="pt">Google Auth Platform</h1>
        <p class="muted" style="margin-bottom:18px">A Google Auth Platform ainda não está configurada.</p>
        <span class="btn" id="gs">Primeiros passos (Get started)</span></div>
      <div class="reveal" id="f1" style="position:absolute;inset:0;background:#fff;padding:26px 34px">
        <h1 class="pt">Configuração do projeto</h1>
        <h2 class="pt">1 · Informações do app</h2>
        <div class="field"><div class="input" id="appname" style="width:420px"><span class="lbl">Nome do app *</span><span class="val"></span></div></div>
        <div class="field"><div class="input" id="mail" style="width:420px"><span class="lbl">E-mail para suporte do usuário *</span><span class="val"></span></div></div>
        <span class="btn" id="next1">Próxima (Next)</span></div>
    </div>`,
  actions: [
    { at: 0.4, move: '#srch', fx: 0.2 }, { at: 0.9, click: true },
    { at: 1.0, type: '#srch', text: 'Google Auth Platform', d: 1.2 },
    { at: 2.6, move: '#gs' }, { at: 3.3, click: true }, { at: 3.6, show: '#f1' },
    { at: 4.2, move: '#appname' }, { at: 4.7, click: true }, { at: 4.9, type: '#appname', text: 'Agenda Anna', d: 1.2 },
    { at: 6.6, move: '#mail' }, { at: 7.2, click: true }, { at: 7.4, type: '#mail', text: CONTA, d: 0.3 },
    { at: 8.4, move: '#next1' }, { at: 9.1, click: true },
  ],
  captions: [
    { at: 0, text: 'Na busca, digite <b>Google Auth Platform</b>, abra e clique em <b>Primeiros passos</b> (Get started).' },
    { at: 3.6, text: 'Nome do app: <b>Agenda Anna</b>. E-mail de suporte: o seu. Depois, <b>Próxima</b>.' },
  ],
},
{
  id: 'auth2', kind: 'browser', dur: 12, step: 'Passo 5 de 11', url: 'console.cloud.google.com/auth/overview/create',
  html: top('Agenda Anna', '') + side('Visão geral') + `
    <div class="gc-main" style="padding-top:18px">
      <h2 class="pt">2 · Público-alvo (Audience)</h2>
      <div class="row" style="gap:30px"><div class="opt" id="int"><span class="rd"></span>Interno (Internal)</div><div class="opt" id="ext"><span class="rd"></span>Externo (External)</div>
        <span class="btn o" id="next2" style="margin-left:auto">Próxima</span></div>
      <h2 class="pt" style="margin-top:14px">3 · Dados de contato</h2>
      <div class="row"><div class="input" id="cemail" style="width:420px"><span class="lbl">Endereços de e-mail *</span><span class="val"></span></div><span class="btn o" id="next3" style="margin-left:auto">Próxima</span></div>
      <h2 class="pt" style="margin-top:20px">4 · Concluir</h2>
      <div class="row" style="margin-bottom:16px"><span class="chk" id="agree2"></span><span style="font-size:14px">Concordo com a Política de dados do usuário dos serviços de API do Google</span></div>
      <span class="btn o" id="cont">Continuar</span> <span class="btn" id="createapp" style="margin-left:10px">Criar (Create)</span>
    </div>`,
  actions: [
    { at: 0.6, move: '#ext', fx: 0.15 }, { at: 1.2, click: true }, { at: 1.25, select: '#ext' },
    { at: 1.9, move: '#next2' }, { at: 2.5, click: true },
    { at: 3.1, move: '#cemail' }, { at: 3.6, click: true }, { at: 3.8, type: '#cemail', text: CONTA, d: 1.0 },
    { at: 5.2, move: '#next3' }, { at: 5.8, click: true },
    { at: 6.6, move: '#agree2' }, { at: 7.2, click: true }, { at: 7.25, check: '#agree2' },
    { at: 7.9, move: '#cont' }, { at: 8.5, click: true },
    { at: 9.2, move: '#createapp' }, { at: 9.9, click: true },
  ],
  captions: [
    { at: 0, text: 'Público-alvo: <b>Externo</b> (External). Em dados de contato, coloque o seu e-mail.' },
    { at: 6.2, text: 'Marque que concorda com a política, clique em <b>Continuar</b> e depois em <b>Criar</b>.' },
  ],
},
{
  id: 'publicar', kind: 'browser', dur: 12, step: 'Passo 6 de 11', url: 'console.cloud.google.com/auth/audience',
  html: top('Agenda Anna', '') + side('Público-alvo') + `
    <div class="gc-main"><h1 class="pt">Público-alvo</h1>
      <div class="card" style="width:640px">
        <div class="muted">Status da publicação</div>
        <div style="position:relative;height:34px;margin:6px 0 14px">
          <div id="st1" style="position:absolute;font-size:18px;font-weight:600">Testando (Testing)</div>
          <div class="reveal" id="st2" style="position:absolute;font-size:18px;font-weight:600;color:#1e8e3e;background:#fff;padding-right:20px">Em produção (In production)</div></div>
        <span class="btn" id="pub">Publicar app (Publish app)</span>
        <div class="muted" style="margin-top:14px">Tipo de usuário: Externo</div></div>
      <div class="reveal" id="pm"><div class="modal-bg" style="left:-230px;top:-52px"></div>
        <div class="modal" style="left:120px;top:60px;width:520px"><h2 class="pt">Enviar para produção?</h2>
          <p class="muted" style="margin-bottom:20px">O app ficará disponível para qualquer usuário com uma Conta do Google.</p>
          <span class="btn" id="confirm">Confirmar (Confirm)</span> <span class="btn g">Cancelar</span></div></div>
    </div>`,
  actions: [
    { at: 0.5, move: '#st1' }, { at: 0.8, hl: '#st1', to: 3.6 },
    { at: 3.7, move: '#pub' }, { at: 4.4, click: true }, { at: 4.7, show: '#pm' },
    { at: 5.5, move: '#confirm' }, { at: 6.2, click: true }, { at: 6.5, hide: '#pm' }, { at: 6.6, show: '#st2' },
    { at: 7.0, hl: '#st2' },
  ],
  captions: [
    { at: 0, text: 'O passo mais importante: em <b>Público-alvo</b> (Audience), o app começa em <b>Testando</b>.' },
    { at: 3.6, text: 'Clique em <b>Publicar app</b> e confirme. Sem isso, o acesso expira em <b>7 dias</b> e a Anna para de agendar.' },
    { at: 7.4, text: 'Confira se o status ficou <b>Em produção</b>.' },
  ],
},
{
  id: 'cliente', kind: 'browser', dur: 13, step: 'Passo 7 de 11', url: 'console.cloud.google.com/auth/clients',
  html: top('Agenda Anna', '') + side('Clientes') + `
    <div class="gc-main">
      <div class="row" style="justify-content:space-between"><h1 class="pt" style="margin:0">Clientes OAuth 2.0</h1><span class="btn o" id="cc">+ Criar cliente (Create client)</span></div>
      <div class="muted" style="margin-top:16px">Nenhum cliente para exibir.</div>
      <div class="reveal" id="cf" style="position:absolute;inset:0;background:#fff;padding:22px 34px">
        <h1 class="pt" style="margin-bottom:22px">Criar ID do cliente OAuth</h1>
        <div class="field"><div class="input" id="atype" style="width:460px"><span class="lbl">Tipo de aplicativo *</span><span class="val"></span></div></div>
        <div class="field"><div class="input" id="cname" style="width:460px"><span class="lbl">Nome *</span><span class="val"></span></div></div>
        <h2 class="pt" style="margin-top:6px">URIs de redirecionamento autorizados</h2>
        <div class="reveal" id="urirow" style="margin-bottom:10px"><div class="input" id="uri" style="width:520px"><span class="lbl">URIs 1 *</span><span class="val"></span></div></div>
        <div style="margin-bottom:22px"><span class="btn o" id="adduri">+ Adicionar URI (Add URI)</span></div>
        <span class="btn" id="ccreate">Criar (Create)</span></div>
    </div>`,
  actions: [
    { at: 0.5, move: '#cc' }, { at: 1.1, click: true }, { at: 1.4, show: '#cf' },
    { at: 1.9, move: '#atype' }, { at: 2.4, click: true }, { at: 2.6, type: '#atype', text: 'Aplicativo da Web (Web application)', d: 0.3 },
    { at: 3.3, move: '#cname' }, { at: 3.8, click: true }, { at: 4.0, type: '#cname', text: 'Anna', d: 0.6 },
    { at: 5.0, move: '#adduri' }, { at: 5.6, click: true }, { at: 5.9, show: '#urirow' },
    { at: 6.2, move: '#uri' }, { at: 6.6, type: '#uri', text: 'https://developers.google.com/oauthplayground', d: 2.4 },
    { at: 10.2, move: '#ccreate' }, { at: 10.9, click: true },
  ],
  captions: [
    { at: 0, text: 'Em <b>Clientes</b>, clique em <b>Criar cliente</b>. Tipo: <b>Aplicativo da Web</b>. Nome: <b>Anna</b>.' },
    { at: 5.0, text: 'Em <b>URIs de redirecionamento autorizados</b>, adicione exatamente <b>https://developers.google.com/oauthplayground</b> e clique em <b>Criar</b>.' },
  ],
},
{
  id: 'copiar', kind: 'browser', dur: 11, step: 'Passo 8 de 11', url: 'console.cloud.google.com/auth/clients',
  html: top('Agenda Anna', '') + side('Clientes') + `
    <div class="gc-main"><h1 class="pt">Clientes OAuth 2.0</h1></div>
    <div class="modal-bg"></div>
    <div class="modal" style="left:250px;top:40px;width:700px">
      <h2 class="pt" style="font-size:19px">Cliente OAuth criado</h2>
      <div class="muted" style="margin-bottom:16px">Guarde as credenciais abaixo em um lugar seguro.</div>
      <div class="muted">ID do cliente</div>
      <div class="row" id="cid" style="justify-content:space-between;border:1px solid #dadce0;border-radius:6px;padding:10px 12px;margin:4px 0 14px"><span class="secret">${CID}</span><span class="copy" id="cidcopy"></span></div>
      <div class="muted">Chave secreta do cliente (Client secret)</div>
      <div class="row" id="csec" style="justify-content:space-between;border:1px solid #dadce0;border-radius:6px;padding:10px 12px;margin:4px 0 18px"><span class="secret">${CSEC}</span><span class="copy" id="cseccopy"></span></div>
      <div class="row" style="justify-content:space-between"><span class="btn o" id="dljson">⬇ Fazer download do JSON</span><span class="btn">OK</span></div>
    </div>`,
  actions: [
    { at: 0.3, hl: '#cid', to: 3.6 }, { at: 0.9, move: '#cidcopy' }, { at: 1.6, click: true },
    { at: 3.7, hl: '#csec', to: 7.0 }, { at: 4.2, move: '#cseccopy' }, { at: 4.9, click: true },
    { at: 7.2, move: '#dljson' }, { at: 7.9, click: true },
  ],
  captions: [
    { at: 0, text: 'Copie o <b>ID do cliente</b> e cole num bloco de notas. É o <b>código 1</b>.' },
    { at: 3.7, text: 'Copie também a <b>Chave secreta do cliente</b> (código 2). O Google pode não mostrar essa chave de novo.' },
    { at: 7.1, text: 'Para garantir, clique em <b>Fazer download do JSON</b> e guarde o arquivo.' },
  ],
},
{
  id: 'playground', kind: 'browser', dur: 12, step: 'Passo 9 de 11', url: 'developers.google.com/oauthplayground',
  cursorStart: { x: 700, y: 300 },
  html: `<div class="pg-top">OAuth 2.0 Playground<span class="gear" id="gear">⚙</span></div>
    <div class="pg-body"><div class="pg-left"><div class="pg-step on">Step 1 &nbsp; Select &amp; authorize APIs</div>
      <div class="apilist"><div>▸ AdSense Management API v2</div><div>▸ Analytics API v3</div><div>▸ Blogger API v3</div><div>▸ Calendar API v3</div><div>▸ Drive API v3</div></div></div>
      <div class="pg-right"><div class="pg-step">Step 2 &nbsp; Exchange authorization code for tokens</div><div class="pg-step">Step 3 &nbsp; Configure request to API</div></div></div>
    <div class="reveal menu-pop" id="cfg" style="right:16px;top:58px;width:480px;padding:18px 20px">
      <div style="font-size:14px;margin-bottom:6px"><b>OAuth flow:</b> Server-side</div>
      <div style="font-size:14px;margin-bottom:14px"><b>Access type:</b> Offline</div>
      <div class="row" style="margin-bottom:14px"><span class="chk" id="own"></span><span style="font-size:14px;font-weight:600">Use your own OAuth credentials</span></div>
      <div class="reveal" id="owninputs">
        <div class="field"><div class="input" id="oid" style="width:440px"><span class="lbl">OAuth Client ID</span><span class="val"></span></div></div>
        <div class="field"><div class="input" id="osec" style="width:440px"><span class="lbl">OAuth Client secret</span><span class="val"></span></div></div></div>
      <div style="text-align:right"><span class="btn g" id="close">Close</span></div></div>`,
  actions: [
    { at: 0.6, move: '#gear' }, { at: 1.3, click: true }, { at: 1.5, show: '#cfg' },
    { at: 2.3, move: '#own' }, { at: 3.0, click: true }, { at: 3.05, check: '#own' }, { at: 3.2, show: '#owninputs' },
    { at: 3.8, move: '#oid' }, { at: 4.3, click: true }, { at: 4.5, type: '#oid', text: CID, d: 1.4 },
    { at: 6.3, move: '#osec' }, { at: 6.8, click: true }, { at: 7.0, type: '#osec', text: CSEC, d: 1.0 },
    { at: 9.0, move: '#close' }, { at: 9.7, click: true }, { at: 10.0, hide: '#cfg' },
  ],
  captions: [
    { at: 0, text: 'Abra <b>developers.google.com/oauthplayground</b> e clique na engrenagem, no canto direito.' },
    { at: 2.3, text: 'Marque <b>Use your own OAuth credentials</b> e cole o código 1 (ID) e o código 2 (chave secreta). Depois, <b>Close</b>.' },
  ],
},
{
  id: 'escopo', kind: 'browser', dur: 8, step: 'Passo 10 de 11', url: 'developers.google.com/oauthplayground',
  cursorStart: { x: 900, y: 120 },
  html: `<div class="pg-top">OAuth 2.0 Playground<span class="gear">⚙</span></div>
    <div class="pg-body"><div class="pg-left"><div class="pg-step on">Step 1 &nbsp; Select &amp; authorize APIs</div>
      <div class="apilist"><div>▸ AdSense Management API v2</div><div>▸ Analytics API v3</div><div>▸ Blogger API v3</div><div>▸ Calendar API v3</div><div>▸ Drive API v3</div></div>
      <div style="margin-top:120px"><div class="input" id="scope" style="min-width:0;width:100%;margin-bottom:12px"><span class="val"></span></div><div style="text-align:right"><span class="btn" id="auth">Authorize APIs</span></div></div></div>
      <div class="pg-right"><div class="pg-step">Step 2 &nbsp; Exchange authorization code for tokens</div><div class="pg-step">Step 3 &nbsp; Configure request to API</div></div></div>`,
  actions: [
    { at: 0.4, move: '#scope' }, { at: 1.0, click: true },
    { at: 1.2, type: '#scope', text: 'https://www.googleapis.com/auth/calendar', d: 2.2, ph: 'Input your own scopes' },
    { at: 4.6, move: '#auth' }, { at: 5.3, click: true },
  ],
  captions: [
    { at: 0, text: 'Em <b>Step 1</b>, no campo <b>Input your own scopes</b>, digite <b>https://www.googleapis.com/auth/calendar</b>' },
    { at: 4.5, text: 'Clique em <b>Authorize APIs</b>.' },
  ],
},
{
  id: 'consent', kind: 'browser', dur: 12, step: 'Passo 10 de 11', url: 'accounts.google.com',
  cursorStart: { x: 760, y: 420 },
  html: `<div class="gacc">
      <div class="box" id="ga" style="position:absolute"><h3>Escolha uma conta</h3><div class="muted" style="margin-bottom:12px">para prosseguir para Agenda Anna</div>
        <div class="acc" id="acc1"><div class="avatar">C</div><div><div style="font-weight:600">Carolina Calvo</div><div class="muted">${CONTA}</div></div></div>
        <div class="acc"><div class="avatar" style="background:#9aa0a6">+</div>Usar outra conta</div></div>
      <div class="box reveal" id="gb" style="position:absolute"><h3 id="gbwarn">O Google não verificou este app</h3>
        <p class="muted" style="font-size:14px;margin:10px 0 18px">O app está solicitando acesso a informações confidenciais na sua Conta do Google. Não use este app até que o desenvolvedor (${CONTA}) faça a verificação dele com o Google.</p>
        <div class="row" style="justify-content:space-between"><span class="link" id="adv">Avançado (Advanced)</span><span class="btn">Voltar para a segurança</span></div>
        <div class="reveal" id="gb2" style="margin-top:18px;font-size:14px"><span class="link" id="go">Acessar Agenda Anna (não seguro)</span></div></div>
      <div class="box reveal" id="gc" style="position:absolute"><h3>Agenda Anna quer acessar sua Conta do Google</h3>
        <div class="muted" style="margin:8px 0 16px">${CONTA}</div>
        <div class="row" style="align-items:flex-start;margin-bottom:22px"><span class="chk" id="perm"></span><span style="font-size:14px;line-height:1.4">Ver, editar, compartilhar e excluir permanentemente todas as agendas que você pode acessar usando o Google Agenda</span></div>
        <div style="text-align:right"><span class="btn g">Cancelar</span> <span class="btn" id="cont2">Continuar</span></div></div>
    </div>`,
  actions: [
    { at: 0.5, move: '#acc1' }, { at: 1.2, click: true }, { at: 1.5, show: '#gb' },
    { at: 2.0, hl: '#gbwarn', to: 4.6 },
    { at: 4.7, move: '#adv' }, { at: 5.3, click: true }, { at: 5.5, show: '#gb2' },
    { at: 6.0, move: '#go' }, { at: 6.7, click: true }, { at: 7.0, show: '#gc' },
    { at: 7.7, move: '#perm' }, { at: 8.3, click: true }, { at: 8.35, check: '#perm' },
    { at: 9.1, move: '#cont2' }, { at: 9.8, click: true },
  ],
  captions: [
    { at: 0, text: 'Escolha a conta Google da agenda.' },
    { at: 1.8, text: 'Vai aparecer <b>O Google não verificou este app</b>. É normal: o app é seu e só você usa.' },
    { at: 4.7, text: 'Clique em <b>Avançado</b> e depois em <b>Acessar Agenda Anna (não seguro)</b>.' },
    { at: 7.3, text: 'Marque a permissão do Google Agenda e clique em <b>Continuar</b>.' },
  ],
},
{
  id: 'token', kind: 'browser', dur: 11, step: 'Passo 11 de 11', url: 'developers.google.com/oauthplayground',
  cursorStart: { x: 500, y: 300 },
  html: `<div class="pg-top">OAuth 2.0 Playground<span class="gear">⚙</span></div>
    <div class="pg-body"><div class="pg-left"><div class="pg-step">Step 1 &nbsp; Select &amp; authorize APIs</div>
      <div class="pg-step on">Step 2 &nbsp; Exchange authorization code for tokens</div>
      <div class="field" style="margin-top:20px"><div class="input" style="min-width:0"><span class="lbl">Authorization code</span><span class="val secret">4/0Ab••••••••••••••••</span></div></div>
      <span class="btn" id="exch">Exchange authorization code for tokens</span>
      <div class="reveal" id="tokens" style="margin-top:22px">
        <div class="field"><div class="row input" id="rtrow" style="min-width:0;justify-content:space-between"><span class="lbl">Refresh token</span><span class="val secret">1//0g••••••••••••••••••••••</span><span class="copy" id="rtcopy"></span></div></div>
        <div class="field"><div class="input" style="min-width:0"><span class="lbl">Access token</span><span class="val secret">ya29.••••••••••••••••</span></div></div></div></div>
      <div class="pg-right"><div class="pg-step">Step 3 &nbsp; Configure request to API</div><div class="muted" style="margin-top:12px">Request / Response</div></div></div>`,
  actions: [
    { at: 0.5, move: '#exch' }, { at: 1.2, click: true }, { at: 1.6, show: '#tokens' },
    { at: 2.0, hl: '#rtrow' }, { at: 3.6, move: '#rtcopy' }, { at: 4.3, click: true },
  ],
  captions: [
    { at: 0, text: 'Em <b>Step 2</b>, clique em <b>Exchange authorization code for tokens</b>.' },
    { at: 2.0, text: 'Copie o <b>Refresh token</b> (começa com <b>1//</b>). É o <b>código 3</b>. O Access token não precisa.' },
  ],
},
{
  id: 'fim', kind: 'card', dur: 14, compact: true,
  html: `<img class="logo" src="logo.png">
    <div class="kicker">Pronto. Agora é só enviar</div>
    <h1>Mande ao Guilherme, em mensagem privada:</h1>
    <ul><li data-n="1">ID do cliente</li><li data-n="2">Chave secreta do cliente</li><li data-n="3">Refresh token</li><li data-n="4">O e-mail da agenda das reuniões</li></ul>
    <div class="warn">Não envie no grupo nem no ClickUp. Esses códigos dão acesso à sua agenda.</div>
    <p style="margin-top:16px;font-size:18px">Para bloquear um horário depois, basta criar um evento na própria agenda (por exemplo, "Bloqueado"). A Anna não oferece horário ocupado.</p>`,
  captions: [{ at: 0, text: 'Travou em algum passo? Pause o vídeo e chame o Guilherme.' }],
},
]};
})();
