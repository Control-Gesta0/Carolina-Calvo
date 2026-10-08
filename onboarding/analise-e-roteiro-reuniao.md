# Carolina Calvo Advogados · análise do Kommo e roteiro do onboarding (Agente de IA)

> **Retrato tirado em 08/10/2026** pela API do Kommo, só leitura (nada foi alterado na conta).
> **Estado do projeto:** `DIAGNOSTICANDO`. A reunião de onboarding fecha o diagnóstico; sem ela não se copia template.
> **Escopo contratado:** somente o Agente de IA (sem reestruturação do CRM).
> IDs técnicos abaixo são referência desta data. Na construção eles são relidos ao vivo, porque a conta muda.

---

## 1 · Resumo em um minuto

1. **O negócio:** escritório em Brasília focado em **superendividamento de servidor público e militar** (consignado e desconto em conta). Também aparecem BRB/bloqueio judicial, ICMS/GDF, blindagem salarial, planejamento previdenciário e conta bloqueada em plataforma.
2. **Volume:** cerca de **300 leads novos por mês** (346 nos últimos 30 dias). **83% vêm de formulário do Facebook** (Lead Ads), já com vínculo, salário e % de desconto respondidos.
3. **Dois WhatsApps na conta:** o **oficial (API/WABA)** concentra o comercial (funis SDR e Closer); o **WhatsApp Lite** concentra os clientes ativos (funil Gestão operacional, tag `Cliente`). A IA deve viver só no oficial.
4. **Já existe robô conversando:** em 3 dias saíram **433 mensagens automáticas** pelo oficial, mais a cadência `FOLLOW 1 → 4` e o "Follow-up Cliente Decisão". Não existe webhook, n8n nem IA plugada hoje.
5. **Uma automação atrapalha a IA:** quando um lead em **Reunião agendada** ou **Cliente decisão** manda mensagem, ele é jogado de volta para **SDR › 5 A 10 MIL** (39 vezes em 3 dias). Se não for corrigida, ela desfaz o que a IA fizer.
6. **Resultado não está no CRM:** só 6 ganhos marcados em 9.703 leads, 36 leads com valor e 92% das perdas sem motivo. Hoje dá para contar reuniões, mas não dá para provar receita.
7. **O link que você mandou é do funil Closer** (pós-reunião). Primeira coisa a fechar na reunião: a IA atende o **primeiro contato (SDR)**, o **pós-reunião (Closer)** ou os dois em fases.

---

## 2 · Raio-X da conta

### 2.1 Funis (quantidade de leads hoje)

| Funil | Etapas (leads parados em cada uma) |
|---|---|
| **SDR** (principal, 8.390) | Contato inicial 75 · **ATÉ 5 MIL 5.068** · 5 A 10 MIL 233 · 10 A 15 MIL 175 · ICMS 2 · ACIMA DE 15 MIL 104 · AGENDAR REUNIÃO 42 · Não quer continuar 245 · Outros assuntos 311 · Desqualificado 1.216 · Perdido 919 |
| **Closer** (879) | Reunião agendada 4 · **Cliente decisão 569** · **Não compareceu 73** · Fez reunião está indeciso 8 · Decidiu não ajuizar 43 · Desqualificado 43 · reunião teste 1 · Ganho 2 · Perdido 136 |
| **Gestão operacional** (428) | Contato inicial 7 · Retorno imediato 45 · Resposta Dra. Carolina 37 · Fazer e enviar contrato 18 · Fazer boletos 3 · Documentos/Senha Gov 16 · Consumidor.gov 15 · PROCESSO PARA AJUIZAR 34 · PROCESSO AJUIZADO 110 · Processo encerrado 134 · Ganho 4 · Perdido 5 |
| **Financeiro** (6) | praticamente sem uso |

Leitura: as etapas do SDR (ATÉ 5 MIL, 5 A 10, 10 A 15, ACIMA DE 15) parecem **faixa de salário**, e hoje a Dra. move à mão (43 movimentos manuais de "Contato inicial" para uma faixa em 3 dias). O formulário já traz a faixa, então isso pode virar regra automática.

### 2.2 De onde vêm os leads (últimos 90 dias, 925 leads)

| Origem | Leads |
|---|---|
| Formulário Remarketing (14/07/2026) | 682 |
| Página/canal "Carolina Calvo Advocacia" | 106 |
| Formulário Remarketing (01/09/2026) | 64 |
| WhatsApp (61) 3142-4636 | 47 |
| Formulário Remarketing (30/06/2026) | 18 |
| Formulários BRB e ICMS/GDF | 8 |

Os UTMs estão vazios em 100% dos leads. A origem existe pelo nome do formulário e pelas tags `NOVA - SE`, `REMARKETING SE` e `fb<id do formulário>`.

### 2.3 O que o formulário já entrega (amostra dos 104 leads mais recentes)

| Pergunta do formulário | Respostas |
|---|---|
| Você é | servidor público 84% · militar 16% |
| Salário bruto | 10 a 15 mil 45% · acima de 15 mil 34% · 5 a 10 mil 18% · até 5 mil 3% |
| Descontos do banco | 35% a 50% 47% · "leva quase tudo" 27% · mais de 50% 20% · menos de 35% 6% |

A IA não deve repetir essas perguntas. Ela lê o formulário e aprofunda.

### 2.4 Canais e automações (janela de 05/10 15h a 08/10 17h, cerca de 3 dias)

| Canal | Recebidas | Enviadas por robô/sem usuário | Enviadas pela Dra. no Kommo | Quem conversa ali |
|---|---|---|---|---|
| WhatsApp **oficial (WABA)** | 444 | **433** | 102 | leads de formulário, SDR e Closer |
| **WhatsApp Lite** | 753 | 477 (provavelmente respondidas pelo celular) | 2 | clientes ativos, Gestão operacional |

Automações detectadas pelos eventos:

- **Cadência FOLLOW 1 → 4:** o robô põe e tira as tags. Ao fim do FOLLOW 4, o lead vai para **"Venda perdida" do funil Gestão operacional** (71 leads em 30 dias), e não para o Perdido do SDR.
- **"Follow-up Cliente Decisão Enviado":** cutucada automática no funil Closer.
- **Volta para "5 A 10 MIL" ao receber mensagem:** 25 leads saíram de Cliente decisão, 13 de Reunião agendada e 1 de Não compareceu, sempre logo após uma mensagem do lead.
- **Agendador nativo do Kommo:** o campo "Próxima consulta" é preenchido pelo robô, sinal de que há link de agendamento em uso. Existem ainda dois campos de data manuais, "Agendamento" e "Reunião".
- **Webhooks:** nenhum. Sem n8n e sem IA externa.

### 2.5 Agenda observada

95 tarefas "Reunião" concluídas entre 01/09 e 08/10 (cerca de 17 por semana). Os horários se concentram de **segunda a sexta, 15h às 17h30, em blocos de 30 min**, com alguns encaixes na sexta às 11h.

### 2.6 Foto do Antes (rascunho para validar na reunião)

Período: 08/09 a 08/10/2026. Fonte: CRM. Confiança: média, porque "venda" não é marcada como ganho.

| Indicador | Número | Observação |
|---|---|---|
| Leads novos | 346 | 307 no SDR |
| Entraram em "AGENDAR REUNIÃO" | 43 | leads distintos |
| Entraram em "Reunião agendada" | 67 | cerca de 19% dos leads do período |
| Não compareceu | 8 | |
| Entraram em "Fazer e enviar contrato" | 16 | melhor sinal de fechamento hoje |
| Valor vendido (R$) | **NÃO SEI** | campo valor quase não é usado |
| Ticket médio, ciclo de venda, investimento em anúncio | **NÃO SEI** | perguntar |

Atenção: são entradas em etapa no período, e não uma coorte. Servem de ordem de grandeza, e a Dra. precisa confirmar.

### 2.7 Pessoas

Só dois usuários no Kommo: o login da Dra. Carolina e o admin da Control Gestão. Toda tarefa e movimento manual sai do login dela. Se outra pessoa atende usando esse login, isso muda o handoff e os alertas.

---

## 3 · Desenho que vou propor (validar na reunião, nada fechado)

| Decisão | Proposta | Por quê / trade-off |
|---|---|---|
| Canal | IA **só no WhatsApp oficial**, Desenho A (resposta enviada pelo Salesbot do Kommo) | É onde estão os leads. Custo: sem resposta em áudio, uma mensagem por resposta, e depois de 24h sem resposta do lead só sai mensagem com **template aprovado pela Meta** (custo por envio) |
| Quem a IA atende | Leads novos de formulário no SDR, com **tag de liberação** (gate) | Nunca clientes (tag `Cliente`, funis Gestão operacional e Financeiro, WhatsApp Lite). Rampagem: 1 contato nosso → 10 leads → todos |
| Assunto no lançamento | **Superendividamento** (servidor e militar) | É quase todo o volume. BRB, ICMS, previdenciário e o resto vão para a Dra. com resumo, até ganharem roteiro próprio |
| Qualificação | Lê o formulário, move para a faixa de salário por regra, aprofunda o que falta (bancos, parcelas, ação em andamento, advogado) | O que é determinístico vira código; a IA conversa |
| Alçada | Até **Reunião agendada** (ou AGENDAR REUNIÃO, se a Dra. preferir marcar) | Reunião, proposta e honorários ficam com a Dra. |
| Agenda | Enviar o **link do agendador do Kommo** ou oferecer a janela combinada e criar a tarefa | O Kommo não tem API de agenda; o link é o caminho mais simples se já está em uso |
| Follow-up | Decidir entre manter o FOLLOW 1–4 atual ou a IA assumir com templates | Dois robôs no mesmo lead = mensagem dupla |
| Pré-requisito | Corrigir a regra que devolve lead para "5 A 10 MIL" | Senão ela desfaz o agendamento feito pela IA |

---

## 4 · Roteiro da reunião (45 a 60 min)

Legenda: 🔴 precisa sair respondida na reunião · 🟡 pode vir depois por escrito.
Grave a reunião: as palavras da Dra. viram o prompt quase literalmente.
Uma pergunta por vez. Quando a resposta for vaga, pergunte "por quê?" duas vezes.

### Bloco A · Escopo e objetivo (5 min)

| # | Pergunta | O que a resposta decide |
|---|---|---|
| A1 🔴 | "Daqui a 60 dias, o que a IA precisa ter feito para você dizer que valeu?" | Métrica norte (reuniões agendadas, tempo de resposta, comparecimento, contratos) |
| A2 🔴 | "A IA vai atender o primeiro contato de quem preencheu o formulário, os leads que já fizeram reunião e estão decidindo, ou os dois em fases?" (o link enviado foi do funil Closer) | Escopo, funil e alçada |
| A3 🔴 | "Hoje quem responde o WhatsApp comercial, e em que horários?" | Handoff, quem recebe alerta, horário da IA |
| A4 🟡 | "O que não pode parar ou mudar durante a implantação?" | Riscos da virada |

### Bloco B · Oferta (10 min)

| # | Pergunta | O que decide |
|---|---|---|
| B1 🔴 | "Me explica o superendividamento como se eu fosse o servidor que acabou de preencher o formulário: o que você faz por ele e o que ele ganha?" | Apresentação da oferta no prompt |
| B2 🔴 | "Dos assuntos que aparecem no CRM (superendividamento, BRB, ICMS/GDF, blindagem salarial, previdenciário, conta bloqueada em plataforma, militar), quais a IA atende no começo?" | Portas ativas; o resto vai para a Dra. |
| B3 🔴 | "A IA pode falar de honorários? Se pode, qual valor e forma de pagamento. Se não pode, qual é a frase oficial?" | A regra anti-invenção mais importante. Lembrar as regras da OAB sobre valores e publicidade |
| B4 🔴 | "A primeira reunião é gratuita ou paga? Online ou presencial? Quanto tempo dura?" | Convite final (CTA) e objeção de custo |
| B5 🟡 | "Quais são as 10 a 15 perguntas que os leads mais fazem, e o que você responde?" | FAQ do prompt |
| B6 🟡 | "Quais objeções você mais ouve? Exemplos: já tentei com o banco, medo de sujar o nome, não tenho dinheiro para advogado, vou perder o consignado. Como responde cada uma?" | Glossário de objeções |
| B7 🟡 | "Existe número ou caso que a IA pode citar como prova? E algo que ela nunca pode citar?" | Prova social dentro da regra da OAB |

### Bloco C · Qualificação (8 min)

| # | Pergunta | O que decide |
|---|---|---|
| C1 🔴 | "O formulário já traz vínculo, salário e desconto. Quem é um lead bom para reunião?" | Regra de qualificado (vira instrução literal) |
| C2 🔴 | "E o que a IA faz com quem ganha até 5 mil, tem desconto abaixo de 35%, é aposentado do INSS, CLT ou autônomo?" | Regra de descarte e mensagem de saída educada |
| C3 🔴 | "Antes da reunião, o que você precisa saber que o formulário não pergunta? Exemplos: quais bancos, valor das parcelas, se já tem ação, se tem advogado" | Roteiro de perguntas da IA e campos no card |
| C4 🟡 | "A IA deve pedir contracheque ou extrato antes da reunião? Se o lead mandar foto ou PDF, o que ela tira dali?" | Leitura de imagem/PDF (sem interpretar juridicamente) |
| C5 🟡 | "Lead que já tem advogado no caso: a IA para e te passa, ou segue?" | Alerta e encerramento (tag "Possui advogado" já existe) |

### Bloco D · Funil e alçada (8 min)

| # | Pergunta | O que decide |
|---|---|---|
| D1 🔴 | "As etapas ATÉ 5 MIL, 5 A 10, 10 A 15 e ACIMA DE 15 são só a faixa de salário? Posso mover automaticamente pelo que o lead respondeu no formulário?" | Regra em código, menos trabalho manual |
| D2 🔴 | "O que precisa acontecer na conversa para o lead ir para AGENDAR REUNIÃO? E para Reunião agendada?" | O "quando" de cada etapa (pergunta mais valiosa do diagnóstico) |
| D3 🔴 | "A IA pode ir até Reunião agendada e parar ali? Daí em diante é com você?" | Alçada fail-closed |
| D4 🔴 | "Quando um lead de Reunião agendada ou Cliente decisão manda mensagem, uma automação devolve ele para 5 A 10 MIL. Isso é de propósito? Posso ajustar ou desligar?" | **Bloqueante**: sem isso a IA trabalha contra o funil |
| D5 🔴 | "Quem some depois do FOLLOW 4 vai para Venda perdida do funil Gestão operacional. É esse o lugar? Qual motivo de perda registrar?" | Medição de perda e de recuperação |
| D6 🟡 | "O que separa Outros assuntos, Desqualificado e Não quer continuar?" | Destino de cada encerramento da IA |
| D7 🟡 | "Alguém cria ou renomeia etapa e campo sem avisar?" | Validação diária do mapa |

### Bloco E · Agenda (5 min)

| # | Pergunta | O que decide |
|---|---|---|
| E1 🔴 | "Como a reunião é marcada hoje: link de agendamento do Kommo, você oferece horários, ou Google Agenda?" | Como a IA agenda (link × janela + tarefa × passa para humano) |
| E2 🔴 | "Vi reuniões de segunda a sexta, das 15h às 17h30, em blocos de 30 minutos. É essa a janela que a IA pode oferecer? Qual antecedência mínima?" | Janela de agenda no mapa |
| E3 🟡 | "Dos campos Agendamento, Reunião e Próxima consulta, qual vale como data oficial?" | Campo que a IA grava |
| E4 🟡 | "Quem lembra o lead da reunião? A IA pode remarcar quem faltou?" (73 em Não compareceu) | Lembrete e recuperação de falta (fase 2) |

### Bloco F · Canal, mídia e robô atual (7 min)

| # | Pergunta | O que decide |
|---|---|---|
| F1 🔴 | "Confirma: o número oficial é o comercial, e os números (61) 3142-4636 e (61) 3020-9930 no WhatsApp Lite são do atendimento a clientes?" | A IA fica só no oficial; clientes nunca falam com ela |
| F2 🔴 | "Quem montou o robô que manda a mensagem automática para os leads do formulário e o FOLLOW 1 a 4? O que ele faz e você está satisfeita?" | IA substitui o robô ou convive com tags separadas |
| F3 🔴 | "O número oficial está ligado em algum outro sistema, bot ou celular?" | Risco de resposta dupla (um número, um agente) |
| F4 🟡 | "Os leads mandam muito áudio? Responder em áudio é importante para você?" | No oficial pelo Kommo não há resposta em áudio; a IA entende áudio, mas responde em texto |
| F5 🟡 | "A IA pode mandar link (agenda, site, vídeo) ou PDF? Quais?" | Materiais permitidos |
| F6 🟡 | "Quem administra o Business Manager da Meta e os templates aprovados? Quem paga a Meta?" | Follow-up depois de 24h e custo por envio |

### Bloco G · Follow-up e recuperação (5 min)

| # | Pergunta | O que decide |
|---|---|---|
| G1 🔴 | "Lead que não responde: quantas mensagens, em quanto tempo, e quando desistir? Mantemos o FOLLOW 1 a 4 de hoje ou a IA assume?" | Cadência e quem é dono dela |
| G2 🔴 | "O que conta como 'voltou a conversar' e o que conta como 'deu certo' (reunião marcada, contrato enviado)?" | As duas conversões que provam a recuperação |
| G3 🟡 | "Os 569 leads em Cliente decisão e os 73 de Não compareceu: quer que a IA trabalhe essa base numa segunda fase?" | Fase 2 com valor rápido |

### Bloco H · Limites, OAB, LGPD e passagem para a Dra. (7 min)

| # | Pergunta | O que decide |
|---|---|---|
| H1 🔴 | "O que a IA nunca pode dizer ou prometer? Exemplos: resultado, prazo, percentual de redução, opinião sobre o caso" | Seção Limites do prompt. Consultoria jurídica é ato privativo de advogado |
| H2 🔴 | "Em quais situações a IA para na hora e te chama? Exemplos: pede para falar com a Dra., já é cliente, salário zerado ou conta bloqueada hoje, audiência marcada, reclamação" | Regras de passagem e urgência |
| H3 🔴 | "Quando a IA te passar um lead, como você quer saber: tarefa no Kommo, tag, mensagem no seu WhatsApp?" | Evita a IA prometer "vou encaminhar" sem ninguém ser avisado |
| H4 🟡 | "Dados que a IA nunca pode pedir: senha gov.br, senha de banco, CPF completo. Mais algum?" | Campos proibidos (existe a etapa Documentos/Senha Gov) |
| H5 🟡 | "A IA se apresenta como assistente do escritório? Qual nome? Se perguntarem se é robô, ela confirma?" | Identidade e transparência |

### Bloco I · Tom (3 min)

| # | Pergunta | O que decide |
|---|---|---|
| I1 🔴 | "Como você fala com o lead: senhor e senhora ou mais próximo? Usa emoji?" | Tom do prompt |
| I2 🔴 | "Pode me mandar de 5 a 10 conversas reais suas que terminaram em reunião marcada?" | Exemplos de tom (vale mais que qualquer adjetivo no prompt) |

### Bloco J · Resultado e aceite (5 min)

| # | Pergunta | O que decide |
|---|---|---|
| J1 🔴 | "Qual o valor médio de um contrato e quanto entra por mês hoje?" | R$ da Foto do Antes (o CRM não tem) |
| J2 🔴 | "Nos últimos 30 dias vi 346 leads, 67 reuniões agendadas e 16 contratos enviados. Bate com o que você sente?" | Validação da Foto do Antes |
| J3 🔴 | "Qual etapa prova que fechou: Fazer e enviar contrato? Você topa marcar ganho ou valor quando fechar?" | Sem isso não dá para provar resultado da IA |
| J4 🟡 | "Quanto investe por mês em anúncio?" | Custo por reunião, antes e depois |
| J5 🔴 | "Me dá exemplos de: uma conversa típica, uma objeção difícil, um caso para recusar, um caso que tem que ir para você e uma pergunta de preço." | Cenários do exame (a IA só sobe com 10/10) |
| J6 🟡 | "Quem aprova o texto da IA e quem testa no WhatsApp antes de ligar para os leads?" | Aceite e rampagem |
| J7 🟡 | "Quem recebe alerta de erro e o relatório semanal?" | Grupo de alertas e relatórios |

---

## 5 · O que pedir depois da reunião (por escrito)

- 5 a 10 conversas boas (print ou exportação), FAQ e objeções com as respostas dela.
- Texto atual do robô e da cadência FOLLOW, e a lista de templates aprovados na Meta.
- Política de honorários por escrito (ou a frase oficial de "não informamos valor por aqui").
- Materiais que a IA pode enviar: link de agenda, site, vídeos, PDF.
- Um número de WhatsApp para teste e a confirmação de quem assina o teste.
- **Credenciais:** o token do Kommo já está com a Control Gestão (escopo CRM). Falta definir quem fornece a chave comercial da LLM e se haverá acesso ao Business Manager. Nenhuma senha ou token entra no ClickUp.

## 6 · O que não perguntar (a Control Gestão descobre sozinha)

IDs de funil, etapa e campo, opções dos selects, webhooks, canais, volume, horários de reunião e campos do formulário: já estão neste retrato e serão relidos ao vivo na construção. Os Salesbots e templates a gente abre na interface com o usuário admin da Control Gestão. Na reunião só se pergunta a **intenção** por trás deles.

## 7 · Pontos para falar na reunião (antes de assinar escopo)

| Sinal | O que dizer |
|---|---|
| Pedido para a IA falar de honorários ou fechar contrato | "A IA leva até a reunião marcada. Honorário e fechamento ficam com você, inclusive pela regra da OAB." |
| Automação que devolve lead para 5 A 10 MIL | "Preciso ajustar essa regra antes de ligar a IA, senão o lead agendado volta para o começo." |
| Robô atual + IA no mesmo lead | "Um lead, um robô. Ou a IA substitui o fluxo atual, ou cada um fica com sua tag." |
| Follow-up depois de 24h | "No WhatsApp oficial, depois de 24h sem resposta do lead, só sai mensagem com template aprovado, e a Meta cobra por envio." |
| Resposta em áudio | "No número oficial pelo Kommo a IA entende áudio, mas responde em texto." |
| "Liga para todo mundo já" | "Primeiro um contato nosso, depois 10 leads, depois todos. Uma semana para provar." |
| Venda não marcada no CRM | "Sem marcar o contrato no Kommo, a gente não consegue mostrar quanto a IA trouxe." |

## 8 · Saída obrigatória da reunião (para registrar no ClickUp)

1. O que a IA fará.
2. O que a IA não fará.
3. Quem ela chama quando precisa de ajuda, e como a Dra. fica sabendo.
4. Como o lead anda no funil (etapa por etapa, com o "quando").
5. Como e quando ela faz follow-up (e o que acontece com o FOLLOW 1 a 4 atual).
6. Quais números vão provar resultado (Foto do Antes validada).
7. O que ainda falta e de quem depende.
8. De 5 a 10 testes que precisam passar.

Item contraditório ou sem resposta fica marcado `A CONFIRMAR`. Não escolher por ela.

## 9 · Próximos passos da Control Gestão depois da reunião

1. Abrir os Salesbots e o Digital Pipeline na interface e documentar o robô atual e a regra que devolve para 5 A 10 MIL.
2. Preencher a entrada do Onboarding Compiler e rodar até `readyForBuild: true`.
3. Construir pelo template Kommo (Desenho A), com IDs relidos ao vivo, texto passando pelo filtro de tom humano e exame 10/10.
4. Teste ponta a ponta no WhatsApp real (a mensagem tem que chegar no celular), depois rampagem: 1 contato → 10 leads → todos.

---

### Anexo · referência técnica (08/10/2026, reler ao vivo antes de construir)

| Item | ID |
|---|---|
| Conta | `33595135` · subdomínio `advogadacarolinacalvo` |
| Funil SDR | `9733267` · Contato inicial `74896319` · ATÉ 5 MIL `74896331` · 5 A 10 MIL `74896323` · 10 A 15 MIL `108957127` · ICMS `112097171` · ACIMA DE 15 MIL `108957131` · AGENDAR REUNIÃO `109942607` · Não quer continuar `76490255` · Outros assuntos `75768039` · Desqualificado `75401467` |
| Funil Closer | `9809931` · Reunião agendada `75401491` · Cliente decisão `75538167` · Não compareceu `75401495` · Fez reunião está indeciso `76352079` · Decidiu não ajuizar `76411095` |
| Funil Gestão operacional | `9809959` |
| Campos do formulário SE | Você é `803678` · Salário bruto `803682` · Descontos `803838` (grupo "SE - FORM") |
| Campos de data | Agendamento `773220` · Reunião `803540` · Próxima consulta `801133` (agendador do Kommo) |
| Tipos de tarefa | Reunião `4217119` · Marcar reunião `3657835` · Meeting `2` |
| Usuários | Dra. Carolina `12068987` · Admin Control Gestão `7111358` |
| Webhooks | nenhum |
| Canais de chat | `waba` (oficial) · `com.amocrm.amocrmwa` (WhatsApp Lite) |
