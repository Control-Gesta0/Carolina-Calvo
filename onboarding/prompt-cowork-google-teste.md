# Prompt para o Cowork: agenda Google da Control Gestão para os testes da Anna

> Enquanto as credenciais da agenda da Dra. não saem, a Anna usa uma agenda da Control Gestão para testar o agendamento completo: oferta de horário, confirmação com link do Meet e card em Reunião agendada.
> A Anna usa a agenda principal da conta que autorizar o acesso (`GOOGLE_CALENDAR_ID=primary`). As reuniões de teste aparecem nessa agenda.
> Na virada para a Dra., basta gerar as credenciais na conta dela (`prompt-cowork-modelos-google.md`, parte 3) e trocar as três variáveis na Vercel.
>
> **Atalho:** se a Control Gestão já tem um cliente OAuth do Google (de outro agente), pule os passos a até e. Use o ID e a chave dele no passo g, só confira que o URI https://developers.google.com/oauthplayground está autorizado nesse cliente.
>
> O prompt não leva nenhum segredo. Os três valores você cola na sessão do Claude Code, que grava na Vercel e testa a agenda.

```text
Tarefa no meu Chrome: gerar as credenciais da agenda Google da Control Gestão para os testes da Anna. No fim, me devolva um relatório.

AUTORIZAÇÃO
Autorizo você a, na conta Google da Control Gestão que está logada neste Chrome: criar um projeto no Google Cloud, ativar a Google Calendar API, configurar e publicar a tela de consentimento, criar um cliente OAuth e gerar um refresh token no OAuth Playground.

LIMITES
- Não mexa em nenhum outro projeto, cliente OAuth ou configuração que já existe.
- Senhas, códigos de verificação, o ID do cliente, a chave secreta e o refresh token são comigo. Nos pontos marcados, me chame e espere. Não copie, não anote e não repita esses valores no relatório.
- Se um passo travar, anote o que a tela mostrou e me avise.

Antes de começar, confira no canto superior direito qual conta Google está ativa e me diga. Se não for uma conta da Control Gestão, pare e espere eu trocar.

a. Em https://console.cloud.google.com, crie o projeto "Agenda Anna Testes". Se aparecerem os termos de primeiro acesso, aceite. Deixe o projeto selecionado no topo.
b. Ative a "Google Calendar API": busca > abrir > Ativar.
c. Em "Google Auth Platform", clique em Primeiros passos:
   - nome do app: Agenda Anna Testes;
   - e-mail de suporte e de contato: o da conta;
   - público: Externo;
   - aceite a política e crie.
d. Em Público-alvo (Audience), clique em "Publicar app" e confirme. O status precisa ficar "Em produção": em "Testando", o acesso expira em 7 dias.
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
   - Escolha a mesma conta da Control Gestão.
   - No aviso "O Google não verificou este app", clique em Avançado > "Acessar Agenda Anna Testes (não seguro)".
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
