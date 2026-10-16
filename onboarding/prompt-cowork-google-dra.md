# Prompt para o Cowork: agenda Google da Dra. Carolina para a Anna

> Este prompt é para fazer junto com a Dra. ou com quem tiver a senha da conta Google onde as reuniões dela ficam. Leva cerca de 10 minutos.
> A Anna usa a agenda principal dessa conta para três coisas:
> - ler os horários ocupados (qualquer compromisso ali bloqueia o horário);
> - criar a reunião com o link do Meet;
> - mandar o convite para a agenda.
>
> A agenda do Kommo não serve para isso: a Anna não lê essa agenda, e ela não gera link do Meet.
> O prompt não leva nenhum segredo. Os três valores do fim você cola na sessão do Claude Code, que grava na Vercel e testa a agenda. O evento de teste é apagado logo depois.

```text
Tarefa no meu Chrome: gerar as credenciais da agenda Google da Dra. Carolina Calvo para a Anna, a assistente do escritório. No fim, me devolva um relatório.

AUTORIZAÇÃO
Autorizo você a, na conta Google da Dra. Carolina que está logada neste Chrome: criar um projeto no Google Cloud, ativar a Google Calendar API, configurar e publicar a tela de consentimento, criar um cliente OAuth e gerar um refresh token no OAuth Playground.

LIMITES
- Não mexa em nenhum outro projeto, cliente OAuth, e-mail, agenda ou configuração que já existe.
- Senhas, códigos de verificação, o ID do cliente, a chave secreta e o refresh token são comigo. Nos pontos marcados, me chame e espere. Não copie, não anote e não repita esses valores no relatório.
- Se um passo travar, anote o que a tela mostrou e me avise.

Antes de começar, me escreva "ENTRE NA CONTA GOOGLE DA DRA." e espere. Depois que eu disser "pronto", confira no canto superior direito qual conta está ativa e me diga o e-mail. Precisa ser a conta onde ficam as reuniões da Dra.

a. Em https://console.cloud.google.com, crie o projeto "Agenda Anna". Se aparecerem os termos de primeiro acesso, aceite. Deixe o projeto selecionado no topo.
b. Ative a "Google Calendar API": busca > abrir > Ativar.
c. Em "Google Auth Platform", clique em Primeiros passos:
   - nome do app: Agenda Anna;
   - e-mail de suporte e de contato: o da conta;
   - público: Externo;
   - aceite a política e crie.
d. Em Público-alvo (Audience), clique em "Publicar app" e confirme. O status precisa ficar "Em produção". Em "Testando", o acesso expira em 7 dias e a Anna para de agendar.
e. Em Clientes, crie um cliente:
   - tipo: Aplicativo da Web;
   - nome: Anna;
   - em "URIs de redirecionamento autorizados", adicione exatamente https://developers.google.com/oauthplayground ;
   - clique em Criar.
f. Quando aparecerem o ID do cliente e a chave secreta, me escreva "COPIE O ID E A CHAVE" e espere. Não feche essa janela antes de eu dizer "pronto".
g. Abra https://developers.google.com/oauthplayground e clique na engrenagem.
   - Marque "Use your own OAuth credentials".
   - Me escreva "COLE O ID E A CHAVE NO PLAYGROUND" e espere eu colar.
   - Depois clique em Close.
h. Em Step 1, no campo "Input your own scopes", digite https://www.googleapis.com/auth/calendar e clique em Authorize APIs.
   - Escolha a conta da Dra.
   - No aviso "O Google não verificou este app", clique em Avançado > "Acessar Agenda Anna (não seguro)". O app é o que acabamos de criar.
   - Marque a permissão do Google Agenda e clique em Continuar.
i. Em Step 2, clique em "Exchange authorization code for tokens".
   - Me escreva "COPIE O REFRESH TOKEN" e espere. O refresh token começa com 1//.

RELATÓRIO
- Conta Google usada (só o e-mail).
- Nome do projeto e status da tela de consentimento (Em produção ou Testando).
- Se o URI do OAuth Playground ficou autorizado no cliente.
- Qualquer aviso ou erro que a tela mostrou.
```

Depois, cole na sessão do Claude Code o ID do cliente, a chave secreta e o refresh token. Eles vão direto para a Vercel e não entram no repositório.
