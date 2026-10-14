# Prompt para o Cowork: bots dos modelos aprovados, modelos de cobrança e Google Agenda

> Situação em 14/10/2026: os 4 modelos da Anna foram recriados pela tela e a Meta aprovou todos. São eles 51744 (Primeiro contato), 51746 (Lembrete 24h), 51748 (Lembrete 1h) e 51750 (Lembrete 15min). Faltam 3 coisas, todas no Chrome do Guilherme:
> 1. escolher esses modelos nos 4 bots que ficaram vazios;
> 2. enviar para aprovação os 8 modelos de cobrança, que continuam como rascunho sem número;
> 3. gerar as credenciais do Google Agenda na conta da Dra.
>
> O prompt não leva nenhum segredo. As 3 credenciais do Google o Guilherme copia e cola na sessão do Claude Code. O Claude Code grava na Vercel e testa a agenda.

```text
Continuação da implantação da Anna (Carolina Calvo Advogados). Faça pelo meu Chrome, nesta ordem, e no fim me devolva um relatório único.

AUTORIZAÇÃO
Eu, Guilherme (Control Gestão, responsável técnico), autorizo você a fazer sem nova confirmação:
- No Kommo: abrir os 4 Salesbots da Anna listados abaixo, escolher o modelo no bloco "Enviar mensagem" e salvar.
- No Kommo: criar 8 modelos novos de WhatsApp e enviá-los para revisão da Meta.
- No Google Cloud, na conta da Dra. Carolina: criar projeto, ativar a Google Calendar API, configurar e publicar a tela de consentimento e criar o cliente OAuth.
- No OAuth Playground: autorizar o acesso à agenda e gerar o refresh token.

LIMITES
- Não exclua, não desative e não edite nada além do que está descrito. Os rascunhos antigos (51584 a 51606) ficam como estão.
- Senhas, códigos de verificação e chaves são comigo. Quando chegar nesses pontos, me chame e espere.
- Se um passo travar, anote o que a tela mostrou, pule só aquele item e siga.

Conta Kommo: https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme que está nela antes de começar.

==================================================
PARTE 1 · KOMMO: ESCOLHER O MODELO NOS 4 BOTS
==================================================
São os 4 bots que ficaram vazios na rodada anterior, porque os modelos ainda não estavam aprovados. Agora estão.

| Bot | Nome do bot                                      | Modelo a escolher                       |
| 54154 | Anna · Modelo · Anna - Primeiro contato         | Anna - Primeiro contato (ID 51744)       |
| 54156 | Anna · Modelo · Anna - Lembrete reunião 24h     | Anna - Lembrete reunião 24h (ID 51746)   |
| 54158 | Anna · Modelo · Anna - Lembrete reunião 1h      | Anna - Lembrete reunião 1h (ID 51748)    |
| 54160 | Anna · Modelo · Anna - Lembrete reunião 15min   | Anna - Lembrete reunião 15min (ID 51750) |

Em cada bot:
a. Abra o bot para edição.
b. No bloco "Enviar mensagem", clique em modelo e escolha o modelo da tabela. Atenção: existem dois modelos com cada nome. O certo é o APROVADO; o rascunho antigo não aparece na lista ou aparece sem o selo de aprovado.
c. Não acrescente bloco, condição, espera, tag nem mudança de etapa.
d. Salve sem gatilho, como na rodada anterior: quando abrir "Condição de execução", clique em Cancelar e depois em "Sair sem salvar" só nesse modal. Confira que o modelo ficou salvo reabrindo o bot.
e. Anote: bot, modelo escolhido e se salvou.

==================================================
PARTE 2 · KOMMO: 8 MODELOS DE COBRANÇA PARA A META
==================================================
Faça igual aos modelos da Anna que a Meta aprovou: em /chats/tools/templates, clique em Novo modelo > Modelo de WhatsApp.

Em todos os 8:
- Conta WABA: "Carolina Calvo Advocacia" (ID 2343930862777873).
- Número: +55 61 3246-7013.
- Idioma: Português (Brasil).
- Categoria: Utilidade.
- Sem cabeçalho, rodapé, botão ou anexo.
- Nome: o indicado. Se a tela recusar o nome repetido, acrescente " (WABA)" e anote.
- Texto: exatamente o indicado, com as mesmas quebras de linha e os asteriscos.
- Variáveis: os códigos entre chaves duplas são campos do lead. Insira pelo seletor de campos, ou digite o código como está, como você fez nos modelos da Anna:
  - {{lead.cf.805158}} = IA - Primeiro nome
  - {{lead.cf.805164}} = Cobrança - Link de pagamento
  - {{lead.cf.805166}} = Cobrança - Vencimento
  - {{lead.cf.805168}} = Cobrança - Dias de atraso
  - {{lead.cf.805170}} = Cobrança - Prazo limite
- Exemplos, se a tela pedir:
  - IA - Primeiro nome = Maria
  - Cobrança - Link de pagamento = https://www.asaas.com/i/abc123xyz
  - Cobrança - Vencimento = 07/11/2026
  - Cobrança - Dias de atraso = 10
  - Cobrança - Prazo limite = 20/11/2026
- Salve, envie para revisão e anote o ID novo e o status.
- Se a Meta sugerir Marketing, recuse e anote.

MODELO C1 · Cobrança - Antes do vencimento
Olá, {{lead.cf.805158}}. Bom dia.

Segue o link de pagamento da sua parcela de honorários com vencimento em {{lead.cf.805166}}:

{{lead.cf.805164}}

Caso o pagamento já tenha sido efetuado, peço a gentileza de me encaminhar o comprovante.

Desde já, agradeço.

MODELO C2 · Cobrança - Dia do vencimento
Bom dia.

Segue o boleto referente à sua ação.

Data de vencimento no dia de HOJE.

Link para pagamento: {{lead.cf.805164}}

Caso o pagamento já tenha sido efetuado, peço a gentileza de me encaminhar o comprovante.

Desde já, agradeço.

MODELO C3 · Cobrança - Vencimento 17h
Até o momento, *não localizamos em nosso sistema o pagamento da sua parcela de honorários com vencimento na data de hoje*.

Atenção para *não pagar juros ou encargos por atraso*.

Lembramos que, conforme a *Cláusula 7ª (Subcláusulas 1ª e 5ª)* do seu contrato, o vencimento da parcela de honorários *não está atrelado ou condicionado ao envio de atualizações ou andamentos processuais*.

MODELO C4 · Cobrança - 1 dia de atraso
Passando por aqui para lembrar que a sua parcela com vencimento ontem ainda não consta com baixa em nosso sistema financeiro.

Para facilitar a sua regularização ainda hoje e mantermos o seu contrato 100% em dia, segue O LINK DE PAGAMENTO: {{lead.cf.805164}}

Por favor, me envie o comprovante por aqui. Se já tiver efetuado o pagamento, por favor desconsidere esta mensagem.

MODELO C5 · Cobrança - 5 dias de atraso
Olá, tudo bem?

Constatamos em nosso sistema financeiro que a sua parcela com vencimento em {{lead.cf.805166}} permanece pendente de quitação, completando hoje 5 dias de atraso.

Para mantermos a regularidade do seu contrato e evitarmos o encaminhamento do seu débito para as medidas administrativas previstas, disponibilizo abaixo o link de pagamento:

{{lead.cf.805164}}

Por gentileza, realize o pagamento e nos envie o comprovante por aqui até às 17:00 de hoje para darmos a baixa imediata no sistema.

Caso tenha ocorrido algum imprevisto financeiro atípico neste mês, me avise por este canal para que possamos avaliar a melhor alternativa para a sua situação.

Ficamos no aguardo da sua confirmação!

MODELO C6 · Cobrança - 10 dias de atraso
Olá, {{lead.cf.805158}}, como vai?

Constatamos em nosso sistema financeiro que a sua parcela com vencimento em {{lead.cf.805166}} continua pendente de quitação, completando hoje {{lead.cf.805168}} dias de atraso.

Sobre a condução do seu caso:

1) Acompanhamento Processual Mantido: o nosso setor jurídico continua acompanhando o seu processo na Justiça, garantindo os seus prazos e a defesa dos seus direitos.

2) Pausa no Repasse de Informações e Suporte: enquanto durar a pendência financeira, as atualizações processuais, os relatórios de andamento, os agendamentos de reuniões e o suporte por este canal de WhatsApp ficam paralisados até a baixa do pagamento.

Para regularizar a sua situação hoje e reativar o seu atendimento, segue o link de pagamento:

{{lead.cf.805164}}

Por gentileza, realize o pagamento e nos envie o comprovante por aqui até às 17:00 de hoje para darmos a baixa imediata no sistema.

Ficamos no aguardo da sua confirmação!

MODELO C7 · Cobrança - 18 dias de atraso
Prezado(a) {{lead.cf.805158}},

Verificamos em nosso sistema financeiro que a sua parcela com *vencimento em {{lead.cf.805166}}* permanece pendente de quitação, *completando hoje {{lead.cf.805168}} dias de atraso*.

Como *não tivemos o seu retorno* às nossas tentativas de contato anteriores, reforçamos os termos da condução da sua pasta:

*1) Acompanhamento Processual Mantido:* O nosso setor jurídico continua monitorando e resguardando a sua ação na Justiça, garantindo a defesa dos seus direitos.

*2) Atendimento e Atualizações Paralisados:* No entanto, o repasse de informações do processo e o suporte ativo por este canal de WhatsApp seguem oficialmente *paralisados até a regularização do débito*.

Para evitarmos o encerramento do seu plano facilitado e o encaminhamento do débito para notificação extrajudicial com aplicação das multas contratuais, estipulamos o *prazo limite até {{lead.cf.805170}}, às 17:00*, para a quitação da parcela.

Link para pagamento: {{lead.cf.805164}}

Ficamos no aguardo.

MODELO C8 · Cobrança - Pagamento confirmado
Olá, {{lead.cf.805158}}. Confirmamos o recebimento do pagamento da sua parcela de honorários com vencimento em {{lead.cf.805166}}.

Agradecemos. O seu contrato segue em dia.

==================================================
PARTE 3 · GOOGLE: CREDENCIAIS DA AGENDA DA DRA.
==================================================
Antes de começar, me escreva "ENTRE NA CONTA GOOGLE DA DRA." e espere. Vou entrar neste Chrome com a conta Google dona da agenda da Dra. Carolina, a mesma em que as reuniões devem aparecer. Depois que eu disser "pronto", confira no canto superior direito que a conta ativa é a dela. Se não for, me avise.

a. Em https://console.cloud.google.com, crie o projeto "Agenda Anna". Se aparecerem os termos de primeiro acesso, aceite. Deixe o projeto selecionado no topo.
b. Ative a "Google Calendar API": busca > abrir > Ativar.
c. Em "Google Auth Platform", clique em Primeiros passos:
   - nome do app: Agenda Anna;
   - e-mail de suporte e de contato: o da conta;
   - público: Externo;
   - aceite a política e crie.
d. Em Público-alvo (Audience), clique em "Publicar app" e confirme. O status precisa ficar "Em produção". Isso é obrigatório: em "Testando", o acesso expira em 7 dias e a Anna para de agendar.
e. Em Clientes, crie um cliente:
   - tipo: Aplicativo da Web;
   - nome: Anna;
   - em "URIs de redirecionamento autorizados", adicione exatamente https://developers.google.com/oauthplayground ;
   - clique em Criar.
f. Quando aparecerem o ID do cliente e a chave secreta, me escreva "COPIE O ID E A CHAVE" e espere. Eu copio os dois e baixo o JSON. Não feche essa janela antes de eu dizer "pronto".
g. Abra https://developers.google.com/oauthplayground e clique na engrenagem.
   - Marque "Use your own OAuth credentials".
   - Me escreva "COLE O ID E A CHAVE NO PLAYGROUND" e espere eu colar.
   - Depois clique em Close.
h. Em Step 1, no campo "Input your own scopes", digite https://www.googleapis.com/auth/calendar e clique em Authorize APIs.
   - Escolha a conta da Dra.
   - No aviso "O Google não verificou este app", clique em Avançado > "Acessar Agenda Anna (não seguro)".
   - Marque a permissão do Google Agenda e clique em Continuar.
i. Em Step 2, clique em "Exchange authorization code for tokens".
   - Me escreva "COPIE O REFRESH TOKEN" e espere: o refresh token começa com 1// e eu copio.
   - Não copie nem anote o token.

==================================================
RELATÓRIO FINAL (me devolva neste formato)
==================================================
1. Parte 1: tabela com bot | modelo escolhido | salvou (sim/não) | observação.
2. Parte 2: tabela com modelo | ID novo | categoria | status (Em revisão, Aprovado ou Rejeitado, com o motivo).
3. Parte 3:
   - e-mail da conta da agenda;
   - nome do projeto;
   - status do app (precisa ser "Em produção");
   - se o refresh token foi gerado.
   Sem nenhuma chave no relatório.
4. Tudo o que travou ou foi pulado, com o que a tela mostrou.
```

## Depois do Cowork (na sessão do Claude Code)

1. Cole o relatório e as 3 credenciais do Google: ID do cliente, chave secreta e refresh token.
2. O Claude Code faz o resto:
   - preenche os `botId` 54154 a 54160 em `agente/lib/crm-map.ts`;
   - grava as variáveis `GOOGLE_*` na Vercel e republica;
   - testa a agenda (horários livres e criação de evento com Meet, apagado em seguida);
   - roda o `/api/validate` até `prontoParaLeadReal: true`.
