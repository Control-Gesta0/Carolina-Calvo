# Acessos e testes para concluir a implantação (23/10/2026)

A Anna continua **pausada**: ela não fala com nenhum lead real. Tudo abaixo é feito e testado só em cards de teste, até a aprovação expressa da Dra.

## Situação dos 7 itens

| # | Item | O que foi feito | O que falta |
|---|---|---|---|
| 1 | Primeira mensagem para lead novo | **Causa:** o robô do Kommo só envia numa conversa que já existe. Antes da Anna era igual: em 13 a 17/10, a 1ª mensagem de todo lead de formulário saiu à mão, pelo usuário da Dra.<br>**Correção:** quando o contato nunca falou com o escritório, o modelo aprovado sai direto pela API oficial do WhatsApp (Meta), do mesmo número. Quando o lead responde, a conversa abre no Kommo e o resto segue pelo Kommo. | Token da Meta (A) e teste com um número que nunca falou com o escritório (C) |
| 2 | Follow-ups de qualificação | Usam o mesmo envio. Saíam só para quem já tinha conversa; agora também saem para quem não tem. Nenhum envio é registrado como "enviado" sem prova. | Os mesmos de cima |
| 3 | Google Agenda | A Dra. conecta a agenda **por um link**: abre, entra na conta Google e clica em "Permitir". Não copia código nenhum. | App da agenda (B) e o clique da Dra. |
| 4 | Memória dos atendimentos | Consulta os cards do mesmo telefone.<br>- Quem já informou renda e descontos ouve só o que está registrado e responde se a situação **melhorou, piorou ou continua igual**. "Igual" aproveita os valores.<br>- Quem já fez reunião ou é cliente não é qualificado de novo: a equipe recebe tarefa, e nenhuma mensagem sai. | Texto da confirmação para a Dra. aprovar e teste (D) |
| 5 | Follow-up 23h depois da reunião | O modelo "Pergunta reunião" sai 23 horas depois do horário da reunião, para qualquer reunião. Se o cliente responder depois da reunião, o card vai para **Closer › Retorno imediato** com tarefa prioritária, sem mensagem para ele.<br>**Testado em 23/10:**<br>- 15h05: a mensagem saiu, com envio confirmado no WhatsApp;<br>- 15h07: o Eduardo respondeu e o card foi para Retorno imediato com a tarefa "Lead respondeu depois da reunião — retorno imediato", sem mensagem;<br>- 1 segundo depois, o robô antigo levou o card para o SDR, e a proteção do Closer o devolveu às 15h10.<br>**Achado:** o robô antigo "Follow Cliente decisão" (52156) manda a mesma mensagem 24h depois da entrada em Cliente decisão, **mesmo se o card já saiu da etapa**. No card de teste foi às 15h19, e com a Erika em 22/10, às 18h11. | Desligar o robô 52156 junto com a ativação, para o cliente não receber a mensagem duas vezes |
| 6 | Envio real das cobranças (Asaas) | A cobrança usa o mesmo envio corrigido. A chave e o webhook do Asaas já estavam prontos.<br>Os 28 clientes que a régua simulou desde 14/10 já têm conversa de WhatsApp no Kommo, então o robô entrega para eles.<br>**Teste de R$ 5 em 23/10, aprovado:**<br>- 15h45: aviso "antes do vencimento" com o link, envio confirmado no WhatsApp; o cliente real da rodada ficou de fora do teste;<br>- 15h48: PIX pago, o Asaas avisou no mesmo segundo e saiu "Pagamento confirmado", também confirmado no WhatsApp.<br>Depois do teste, o envio real foi desligado de novo. | Corrigir os 9 cadastros sem card (telefone do Asaas diferente do Kommo); escolher o modelo no robô "Cobrança · 5 dias de atraso" (54192); decisões do escritório e a aprovação da Dra. |
| 7 | Treino com as conversas de setembro e outubro | Amostra de 91 conversas reais escolhida e roteiro de exportação pronto (`prompt-cowork-conversas-set-out.md`). O relatório de objeções e perguntas sai num comando e passa pela Dra. antes de entrar na Anna. | Rodar a exportação no Cowork |

## A. Token do WhatsApp (Meta): quem é administrador do portfólio da Dra. no Meta

A conta do WhatsApp conectada ao Kommo é a de ID **2343930862777873**.

1. Abra business.facebook.com/settings, no portfólio da Dra. Confira em **Contas › Contas do WhatsApp** se a conta 2343930862777873 aparece.
2. Em **Contas › Apps**, veja se existe um app. Se não existir:
   - em developers.facebook.com/apps, clique em **Criar app**;
   - escolha **Outro** e depois o tipo **Empresa**;
   - nome "Anna Carolina Calvo", portfólio da Dra.
3. Em **Usuários › Usuários do sistema**, clique em **Adicionar**: nome "Anna", função **Administrador**.
4. Nesse usuário, clique em **Atribuir ativos**:
   - **Apps** › o app › **Controle total**;
   - **Contas do WhatsApp** › a conta › **Controle total**.
5. Clique em **Gerar novo token**:
   - escolha o app;
   - expiração **Nunca**;
   - marque **whatsapp_business_messaging** e **whatsapp_business_management**;
   - gere e copie.
6. Cole o token **só** na sessão do Claude Code, nunca em grupo de WhatsApp. O Claude grava o token na Vercel e não no repositório.

Se a conta 2343930862777873 não aparecer no portfólio da Dra., é porque ela está no portfólio do Kommo. Nesse caso, avise: o caminho muda.

## B. App da agenda Google: Eduardo ou Guilherme, uma vez, na conta Google da Control Gestão

1. Em console.cloud.google.com, crie o projeto "Anna Agenda".
2. Em **APIs e serviços › Biblioteca**, ative a **Google Calendar API**.
3. Em **Google Auth Platform**, configure:
   - **Branding:** nome "Anna · Carolina Calvo Advogados" e e-mail de suporte;
   - **Público:** Externo e **Publicar app** (status "Em produção"). Sem isso o acesso vence em 7 dias.
   - **Acesso a dados:** escopos `calendar.events` e `calendar.freebusy`.
4. Em **Clientes › Criar cliente**:
   - tipo **Aplicativo da Web**;
   - URI de redirecionamento autorizado: `https://anna-carolina-calvo.vercel.app/api/google`.
5. Cole o **ID do cliente** e a **chave secreta** na sessão do Claude Code.

Com isso, o Claude gera o link de convite para a Dra. (`scripts/convite-google.ts`, vale 7 dias e uma vez só). Ela abre o link e entra na conta Google da agenda.
- Se aparecer "O Google não verificou este app", ela clica em **Avançado › Acessar**, marca as duas caixas da agenda e clica em **Continuar**.
- A página mostra "Agenda conectada ✅".

## C. Teste da 1ª mensagem com um número que nunca falou com o escritório

1. Separe um celular com WhatsApp que **nunca** tenha conversado com o número do escritório.
2. O Claude cria um card de teste no SDR, como se fosse um lead de formulário, só para esse número.
3. A Anna manda o 1º contato pela Meta. Confira se chegou.
4. Responda "1". O Claude confere em qual card o Kommo abriu a conversa e se a Anna seguiu o roteiro.
5. Ainda sem responder mais nada, os follow-ups saem nos horários da régua. Em teste, os intervalos podem ser encurtados.

## D. Memória: texto para a Dra. aprovar

> Ótimo! Vi aqui que você já falou com a gente em {mês} e, naquela ocasião, informou {valores}.
>
> De lá para cá, a sua situação *melhorou, piorou ou continua igual*?

Ele só aparece para quem já informou os valores à Anna antes. Os valores do formulário são faixas e não entram.

## E. Cobrança: teste de R$ 5 (feito em 23/10, aprovado)

Autorizado pelo Eduardo. O cadastro de teste no Asaas é "TESTE ANNA - Eduardo do Vale (Control Gestão)" (cus_000208744992, CNPJ da Control Gestão, avisos do próprio Asaas desligados). A cobrança é pay_oeyvtoac9aef3yf1. Como foi feito:
1. O Claude cria uma cobrança de R$ 5 no Asaas da Dra. para o cadastro de teste do Eduardo.
2. A régua manda o link pelo WhatsApp só para o card de teste.
3. O Eduardo paga e confere a mensagem de pagamento confirmado.

Antes de ligar para os clientes, o escritório decide sobre os avisos do próprio Asaas e sobre os 112 clientes sem telefone ou com telefone diferente do Kommo.

## Chaves na Vercel (todas desligadas para leads reais)

| Chave | Hoje | Liga com |
|---|---|---|
| `GATE_TAG` | `anna-desligada` (ninguém) | tag de teste nos testes; `ia` só com a aprovação da Dra. |
| `WHATSAPP_TOKEN` | — | token do passo A |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | passo B |
| `MEMORIA` | — | `teste`, depois `true` |
| `POS_REUNIAO` | `teste` (só card de teste) | `true` com a aprovação da Dra.; depois disso, desligar o robô "Follow Cliente decisão" (52156) |
| `PROTEGE_CLOSER` | `teste` | `true` |
| `COBRANCA_ATIVA` | — | depois do teste de R$ 5 e das decisões |
