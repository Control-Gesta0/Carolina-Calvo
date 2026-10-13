# Prompt para o Cowork: tudo o que falta para a Anna ir ao ar (no Chrome do Guilherme)

> Cole o bloco abaixo numa sessão do Cowork com o **Claude in Chrome** ligado ao Chrome do Guilherme, já logado em:
> - Kommo do escritório (usuário administrador);
> - Vercel (time da Control Gestão);
> - GitHub (org Control-Gesta0);
> - Google Cloud com a conta Google **dona da agenda da Dra. Carolina**.
>
> O prompt não leva nenhum segredo. Na Parte 4 o Cowork para e o Guilherme cola na Vercel os valores de token e chaves.
>
> Depois que o Cowork devolver o relatório, cole-o na sessão do Claude Code. Lá ficam o relógio (QStash), os webhooks, os IDs dos bots no código, a validação e o teste ponta a ponta.

```text
Você vai deixar pronta a Anna, IA de atendimento do escritório Carolina Calvo Advogados, fazendo tudo pelo meu Chrome. São 5 partes, nesta ordem. No fim, me devolva um relatório único.

AUTORIZAÇÃO
Eu, Guilherme (Control Gestão, responsável técnico por esta implantação), autorizo você a fazer sem me perguntar de novo todas as ações descritas abaixo:
- No Kommo: enviar modelos para aprovação, criar Salesbots e copiar os IDs deles.
- No Google Cloud: criar projeto, ativar API, configurar e publicar a tela de consentimento, criar cliente OAuth e gerar o refresh token no OAuth Playground.
- Na Vercel: importar o repositório, configurar as variáveis de ambiente, fazer o deploy e desligar a proteção de acesso deste projeto.
- No GitHub: dar acesso da Vercel ao repositório Control-Gesta0/Carolina-Calvo.
Não precisa pedir confirmação a cada clique. Siga até o fim de cada parte.

LIMITES (valem para tudo)
- Não exclua, não desative e não edite nada que já existe: modelos, bots, funis, leads, outros projetos da Vercel, outros projetos do Google Cloud. Só crie o que está descrito aqui.
- Senha e código de verificação são comigo. Se uma tela pedir login, me avise, espere eu entrar e continue sozinho.
- Se um passo não sair como descrito, tente o caminho equivalente da tela. Se mesmo assim travar, anote o que a tela mostrou, pule só aquele item e siga para o próximo. Não pare a tarefa inteira.

==================================================
PARTE 1 · KOMMO: ENVIAR 4 MODELOS PARA APROVAÇÃO
==================================================
Conta: https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme que está nela antes de começar.

Os 4 modelos abaixo já existem como RASCUNHO:
1. Anna - Primeiro contato (ID 51584, Marketing)
2. Anna - Lembrete reunião 24h (ID 51586, Utilidade)
3. Anna - Lembrete reunião 1h (ID 51588, Utilidade)
4. Anna - Lembrete reunião 15min (ID 51590, Utilidade)

a. Abra a área de modelos de mensagem do WhatsApp (Configurações > modelos/templates de chat).
b. Abra o modelo já aprovado "Lembrete Reunião" e veja qual número de WhatsApp está selecionado nele. Só olhe, não salve nada.
c. Em cada um dos 4 modelos:
   - selecione esse mesmo número;
   - confira a categoria e o idioma Português (Brasil) sem mudar;
   - salve e envie para revisão.
d. Se pedir exemplos das variáveis, use:
   - IA - Primeiro nome = Maria
   - IA - Horário da reunião = quinta-feira, 09/10, às 15:00
   - IA - Link do Meet = https://meet.google.com/abc-defg-hij
e. Não mude o texto, o nome nem a categoria. Se a Meta sugerir outra categoria, recuse e anote.
f. Anote o status final de cada um (Em revisão, Aprovado ou Rejeitado, com o motivo).

==================================================
PARTE 2 · KOMMO: CRIAR 13 SALESBOTS
==================================================
Os bots só serão disparados pela nossa API.

Como montar cada bot:
- Um bloco só, "Enviar mensagem". Nada de condição, espera, tag ou mudança de etapa.
- Não ligue nenhum bot a etapa do funil, Digital Pipeline, gatilho ou comando "/". Se o Kommo exigir um gatilho para salvar, escolha execução manual e anote.

BOT 1
- Nome: "Anna · Texto livre"
- Bloco "Enviar mensagem": o conteúdo é só o campo do lead "IA - Resposta (Anna)", campo 805202, que aparece como {{lead.cf.805202}}. Insira pelo seletor de campos do Kommo e não escreva nenhum outro texto.

BOTS 2 a 13
- Um bloco "Enviar mensagem" usando o MODELO do WhatsApp oficial indicado (opção de modelo/template, não texto livre).
- Nome do bot = "Anna · Modelo · " + nome do modelo.
- Os modelos:
  2. Anna - Primeiro contato
  3. Anna - Lembrete reunião 24h
  4. Anna - Lembrete reunião 1h
  5. Anna - Lembrete reunião 15min
  6. Follow 1
  7. Follow 2
  8. Follow up 3
  9. Follow up 4
  10. FUP horário reunião
  11. SE 5 24h
  12. FUP encerramento 48h
  13. Pergunta reunião
- Os modelos 2 a 5 só aparecem depois que a Meta aprova a Parte 1. Se ainda não aparecerem:
  - crie o bot só com o nome e salve sem modelo;
  - marque "aguardando aprovação";
  - siga para as próximas partes e volte nesses bots no fim. Se continuarem indisponíveis, deixe assim.
- O ID de cada bot é o número na URL do bot aberto para edição (ou na lista de bots). Anote o ID de todos os 13.

==================================================
PARTE 3 · GOOGLE: CREDENCIAIS DA AGENDA
==================================================
Use a conta Google DONA da agenda da Dra. Carolina, a mesma em que as reuniões devem aparecer.
- Confira no canto superior direito qual conta está ativa.
- Se não for a conta da agenda da Dra., me avise e espere eu trocar.

a. Em https://console.cloud.google.com, crie o projeto "Agenda Anna". Se aparecerem os termos de primeiro acesso, aceite. Deixe o projeto selecionado no topo.
b. Ative a "Google Calendar API" (busca > abrir > Ativar).
c. Em "Google Auth Platform", clique em Primeiros passos:
   - nome do app: Agenda Anna;
   - e-mail de suporte e de contato: o da conta;
   - público: Externo;
   - aceite a política e crie.
d. Em Público-alvo (Audience), clique em "Publicar app" e confirme. O status precisa ficar "Em produção". Isso é obrigatório: em "Testando", o acesso expira em 7 dias.
e. Em Clientes, crie um cliente:
   - tipo: Aplicativo da Web;
   - nome: Anna;
   - em "URIs de redirecionamento autorizados", adicione exatamente https://developers.google.com/oauthplayground ;
   - clique em Criar.
   Copie na hora o ID do cliente e a Chave secreta, porque o Google pode não mostrar a chave de novo.
f. Abra https://developers.google.com/oauthplayground
   - Engrenagem > marque "Use your own OAuth credentials" e cole o ID e a chave > Close.
   - Step 1: em "Input your own scopes", digite https://www.googleapis.com/auth/calendar e clique em Authorize APIs.
   - Escolha a conta da agenda da Dra.
   - No aviso "O Google não verificou este app", clique em Avançado > "Acessar Agenda Anna (não seguro)".
   - Marque a permissão do Google Agenda e clique em Continuar.
   - Step 2: clique em "Exchange authorization code for tokens".
   - Copie o Refresh token (começa com 1//).
g. Anote: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN e o e-mail da conta usada.

==================================================
PARTE 4 · VERCEL: PUBLICAR A ANNA
==================================================
a. Em https://vercel.com, entre no time da Control Gestão (o mesmo dos projetos control-gestao-ia e agente-ia-filipe-oliveira). Clique em Add New > Project.
b. Importe o repositório GitHub Control-Gesta0/Carolina-Calvo. Se ele não aparecer, use "Configure GitHub App" / "Adjust GitHub App Permissions" e dê acesso só a esse repositório.
c. Configuração do projeto:
   - Project Name: anna-carolina-calvo
   - Framework Preset: Other
   - Root Directory: agente
   - Build / Output / Install: deixe o padrão, sem override.
d. Em Environment Variables (marque Production e Preview), cadastre estas variáveis:

   Você mesmo preenche:
   KOMMO_DOMAIN=https://advogadacarolinacalvo.kommo.com
   KOMMO_ACCOUNT_ID=33595135
   REDIS_PREFIX=anna-cc:
   GOOGLE_CALENDAR_ID=primary
   KOMMO_BOT_ID=<ID do BOT 1 da Parte 2>
   GOOGLE_CLIENT_ID=<da Parte 3>
   GOOGLE_CLIENT_SECRET=<da Parte 3>
   GOOGLE_REFRESH_TOKEN=<da Parte 3>
   (Se o bot ou o Google travou, não cadastre essas linhas e anote.)

   Eu colo, porque são segredos que você não recebe:
   KOMMO_TOKEN, OPENAI_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, WEBHOOK_SECRET, CRON_SECRET
   Quando chegar nelas:
   - deixe a tela de variáveis aberta;
   - me escreva "COLE AS 6 VARIÁVEIS";
   - espere eu dizer "pronto";
   - confira que as 6 chaves aparecem na lista, sem abrir os valores, e continue.

e. Clique em Deploy e espere terminar. Se o build falhar, copie as últimas 40 linhas do log para o relatório.
f. Anote a URL de produção (algo como https://anna-carolina-calvo.vercel.app).
g. Teste 1: abra URL/api/tick no navegador.
   - O certo é ver o texto {"error":"unauthorized"}.
   - Se aparecer uma tela de login da Vercel, vá em Settings > Deployment Protection, desligue "Vercel Authentication" deste projeto, salve e teste de novo.

==================================================
PARTE 5 · KOMMO: LER AS AUTOMAÇÕES ANTIGAS (SÓ LEITURA)
==================================================
Não salve, não ative, não desative nada. Se abrir um modal de edição, feche sem salvar.

Procure nestes lugares:
- lista de Salesbots;
- Digital Pipeline dos funis SDR, Closer, Financeiro e Gestão operacional;
- comandos "/" do chat.

Para cada automação que envia mensagem a lead, coloca as tags FOLLOW 1 a FOLLOW 4 ou move lead de etapa, anote:
- nome;
- onde está ligada;
- gatilho;
- blocos em ordem: esperas com o tempo, modelos enviados, tags, mudanças de etapa e condições;
- se está ativa.

Procure em especial:
1. O bot do "/follow up" (FOLLOW 1 a 4).
2. A mensagem automática 24h depois que o lead entra em Closer > Cliente decisão.
3. A regra que move o lead para SDR > 5 A 10 MIL quando ele manda mensagem estando em Reunião agendada ou Cliente decisão.

==================================================
RELATÓRIO FINAL (me devolva neste formato)
==================================================
1. Parte 1: tabela com modelo | número de WhatsApp | status | observação.
2. Parte 2: tabela com nº | nome do bot | ID | modelo (ou "campo 805202") | pronto ou aguardando aprovação.
3. Parte 3:
   - GOOGLE_CLIENT_ID=...
   - GOOGLE_CLIENT_SECRET=...
   - GOOGLE_REFRESH_TOKEN=...
   - e-mail da conta da agenda
   - status do app (precisa ser "Em produção")
4. Parte 4:
   - URL de produção;
   - resultado do teste;
   - variáveis que ficaram de fora.
5. Parte 5: as automações encontradas, bloco a bloco.
6. Tudo o que travou ou foi pulado, com o que a tela mostrou.
```
