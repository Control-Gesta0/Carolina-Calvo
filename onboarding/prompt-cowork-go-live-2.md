# Prompt para o Cowork: segunda rodada do go-live da Anna (no Chrome do Guilherme)

> Continuação de `prompt-cowork-go-live.md`, a partir do relatório de 13/10/2026 17:20. Só ficou aqui o que precisa da tela do Kommo ou da conta Google da Dra.
> A Vercel, o relógio e os webhooks são feitos pelo Claude Code, pela API. O prompt não leva nenhum segredo.

```text
Continuação da implantação da Anna (Carolina Calvo Advogados). Faça pelo meu Chrome, nesta ordem, e no fim me devolva um relatório único.

AUTORIZAÇÃO
Eu, Guilherme (Control Gestão, responsável técnico), autorizo você a fazer sem nova confirmação:
- No Kommo: criar 4 modelos novos de WhatsApp e enviá-los para revisão da Meta.
- No Kommo: abrir bots e gatilhos só para ler.
- No Google Cloud: criar as credenciais da agenda, quando eu entrar na conta da Dra.
A Vercel não é mais com você: se a tela "New Project" da rodada anterior ainda estiver aberta, feche sem clicar em Deploy. O projeto será criado pela API.

LIMITES
- Não exclua, não desative e não edite nada que já existe. Os 4 rascunhos antigos (51584, 51586, 51588 e 51590) ficam como estão.
- Senhas, códigos e chaves são comigo. Quando chegar nesses pontos, me chame e espere.
- Se um passo travar, anote o que a tela mostrou, pule só aquele item e siga.

==================================================
PARTE 1 · KOMMO: 4 MODELOS NOVOS PARA A META
==================================================
Os rascunhos antigos não têm o campo de número, por isso vamos criar modelos novos pelo fluxo completo.

Conta: https://advogadacarolinacalvo.kommo.com. Em /chats/tools/templates, clique em Novo modelo > Modelo de WhatsApp.

Em todos os 4 modelos:
- Conta WABA: "Carolina Calvo Advocacia" (ID 2343930862777873).
- Número: +55 61 3246-7013.
- Idioma: Português (Brasil).
- Sem cabeçalho, rodapé, botão ou anexo.
- Nome: o indicado. Se a tela recusar o nome repetido, acrescente " (WABA)" e anote.
- Texto: exatamente o indicado, com as mesmas quebras de linha.
- Campos: onde está [campo], insira o campo do lead pelo seletor de campos/variáveis. Se o seletor não aparecer, digite o código entre chaves duplas, por exemplo {{lead.cf.805158}}.
  - [IA - Primeiro nome] = {{lead.cf.805158}}
  - [IA - Horário da reunião] = {{lead.cf.805160}}
  - [IA - Link do Meet] = {{lead.cf.805162}}
- Exemplos, se a tela pedir:
  - IA - Primeiro nome = Maria
  - IA - Horário da reunião = quinta-feira, 09/10, às 15:00
  - IA - Link do Meet = https://meet.google.com/abc-defg-hij
- Salve, envie para revisão e anote o ID novo (número na URL ou na lista) e o status.
- Se a Meta sugerir outra categoria, recuse e anote.

MODELO A
- Nome: Anna - Primeiro contato
- Categoria: Marketing
- Texto:
Olá, [IA - Primeiro nome]. Aqui é a Anna, da equipe da Dra. Carolina Calvo. Recebemos o seu contato sobre os descontos bancários.

Você quer saber se, no seu caso, é possível:

1) suspender os descontos bancários e pagamento das dívidas por até 6 meses?
2) reestruturar o pagamento das dívidas em condições mais favoráveis e com juros revisados?
3) as duas opções acima.

É só me responder com o número.

MODELO B
- Nome: Anna - Lembrete reunião 24h
- Categoria: Utilidade
- Texto:
Olá, [IA - Primeiro nome]. Passando para lembrar da sua reunião on-line com a Dra. Carolina Calvo amanhã, [IA - Horário da reunião].

O link de acesso pelo Google Meet é este: [IA - Link do Meet]

Se precisar remarcar, é só responder esta mensagem.

MODELO C
- Nome: Anna - Lembrete reunião 1h
- Categoria: Utilidade
- Texto:
Olá, [IA - Primeiro nome]. A sua reunião on-line com a Dra. Carolina Calvo começa em 1 hora.

Link de acesso pelo Google Meet: [IA - Link do Meet]

Se tiver algum imprevisto, me avise por aqui.

MODELO D
- Nome: Anna - Lembrete reunião 15min
- Categoria: Utilidade
- Texto:
Olá, [IA - Primeiro nome]. Faltam 15 minutos para a sua reunião on-line com a Dra. Carolina Calvo.

Para entrar, use este link do Google Meet: [IA - Link do Meet]

Até já.

Se algum já sair aprovado na hora, abra o bot correspondente e escolha esse modelo no bloco "Enviar mensagem". Salve sem gatilho, como na rodada anterior.
- A → bot 54154
- B → bot 54156
- C → bot 54158
- D → bot 54160

==================================================
PARTE 2 · KOMMO: LER O QUE FALTOU (SÓ LEITURA)
==================================================
Abra cada item, anote e feche sem salvar. Use o "</>" para ver o JSON, se ajudar.
1. O robô "Campanha", ligado ao entrar em SDR › CONTATO INICIAL.
   - Ele envia mensagem ao lead? Qual modelo ou texto, depois de quanto tempo e com que condições?
2. Os bots "Reunião agendada - 2h", "Reunião agendada - 1h" e "Reunião agendada - 15 minutos" do Closer.
   - Que modelo ou texto cada um envia?
   - Mandam o link da reunião? De qual campo?
3. O robô "Fluxo Superendividamento - Vídeo": o que envia.
4. "Ativar follow 2", "Ativar follow 3" e "Ativar follow 4" (52910, 52908 e 52906): fluxo bloco a bloco.
5. No gatilho do Digital Pipeline que liga o "SDR RETORNO IMEDIATO" ao Closer, abra o modal e veja, sem salvar:
   - se dá para pôr condição por tag, como "só para leads sem a tag ia";
   - quais condições a tela oferece.

==================================================
PARTE 3 · GOOGLE: CREDENCIAIS DA AGENDA (QUANDO EU ENTRAR NA CONTA DA DRA.)
==================================================
Me pergunte se a conta Google da Dra. Carolina já está no Chrome. Se ela não estiver, pule esta parte.
Se estiver, siga o plano da seção 3 do relatório anterior:
- projeto "Agenda Anna" e Google Calendar API;
- Google Auth Platform com o app publicado "Em produção";
- cliente Web "Anna" com o redirecionamento https://developers.google.com/oauthplayground;
- Playground com o escopo https://www.googleapis.com/auth/calendar.
Quando o ID e a chave do cliente aparecerem, me chame para eu copiar e colar no Playground. O refresh token eu levo para o Claude Code.

==================================================
RELATÓRIO FINAL
==================================================
1. Modelos: tabela com modelo | ID novo | categoria | status | bot preenchido (sim/não).
2. Leituras da Parte 2, item a item.
3. Google: feito, ou pulado e por quê.
4. Tudo o que foi pulado, com o que a tela mostrou.
```
