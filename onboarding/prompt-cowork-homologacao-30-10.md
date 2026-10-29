# Prompt para o Cowork: o que falta no Kommo para a homologação (30/10/2026)

> Cole o bloco abaixo numa sessão do Cowork com o Chrome logado no Kommo do escritório, com um usuário administrador. O prompt não leva nenhum segredo.
>
> **Os robôs antigos não são alterados.** A Parte 3 só lê e monta a lista para a Dra. decidir o que fica, sai ou muda.
>
> A exportação das conversas para o treino é outro prompt, porque é longo: `prompt-cowork-conversas-set-out.md`.

```text
Implantação da Anna (Carolina Calvo Advogados). Faça pelo meu Chrome, no Kommo https://advogadacarolinacalvo.kommo.com (account_id 33595135), nesta ordem, e no fim me devolva um relatório único. Confirme que está nessa conta antes de começar.

AUTORIZAÇÃO (só isto pode ser criado, alterado ou excluído)
- Parte 0: excluir EXATAMENTE o card e os 2 contatos listados na Parte 0, e nada mais.
- Parte 1: criar 1 modelo de WhatsApp novo e enviá-lo para a aprovação da Meta.
- Parte 2: criar 1 automação nova na etapa SDR › Contato inicial e 1 Salesbot novo para ela, só se o modelo da Parte 1 já estiver APROVADO.

LIMITES
- Fora o card e os 2 contatos da Parte 0, NÃO altere, desative, exclua nem reordene nada que já exista: robô, Salesbot, automação, modelo, etapa, campo, tag, card ou contato. Isso vale principalmente para os robôs antigos: eles só mudam depois da decisão da Dra.
- Não escreva para nenhum lead e não mude cards de etapa.
- Senhas e códigos de verificação são comigo. Se pedirem, me chame e espere.
- Se um passo travar, anote o que a tela mostrou, pule só aquele item e siga.

==================================================
PARTE 0 · LIMPAR O NÚMERO DE TESTE +55 11 96486-6458
==================================================
Este número vai ser usado no teste da primeira mensagem, como se fosse um lead novo. Hoje ele aparece no Kommo em um card e dois contatos antigos, que devem ser excluídos.
a. Abra e confira antes de excluir. Só exclua se o telefone for +55 11 96486-6458:
   - card https://advogadacarolinacalvo.kommo.com/leads/detail/19914892 ("Lead #19914892", funil SDR, tag ABR 25);
   - contato https://advogadacarolinacalvo.kommo.com/contacts/detail/16379536 ("Guilherme Gomes");
   - contato https://advogadacarolinacalvo.kommo.com/contacts/detail/21642973 (sem nome).
b. Exclua primeiro o card e depois os dois contatos, pelo menu "..." de cada um > Excluir.
c. Na busca do Kommo, procure por 964866458. Se aparecer outro card ou contato com esse telefone, NÃO exclua: anote o link.
d. Na lista de Chats, procure por 964866458 e anote se ainda aparece alguma conversa, sem apagar nada.

==================================================
PARTE 1 · MODELO "Anna - Primeiro contato v2"
==================================================
a. Vá em Configurações > Comunicação (ou Chats e mensagens) > Modelos. Procure "Anna - Primeiro contato v2".
   - Se já existir: anote o ID e o status (Em revisão, Aprovado ou Rejeitado, com o motivo) e vá para a Parte 2.
   - Se não existir: crie conforme abaixo.
b. Novo modelo de WhatsApp:
   - Nome: Anna - Primeiro contato v2
   - Categoria: Marketing
   - Idioma: Português (Brasil)
   - Número do WhatsApp: o do escritório, o mesmo dos outros modelos "Anna - ..."
   - Sem cabeçalho, sem rodapé, sem botões
c. Texto, exatamente assim, com as linhas em branco, os asteriscos e os emojis:

Olá, [VARIÁVEL]!

*Imagine poder respirar financeiramente, com menos descontos comprometendo sua renda todos os meses.*

Qual dessas possibilidades faria mais diferença para você hoje?

*1️⃣* Buscar judicialmente a *suspensão dos descontos bancários por até 6 meses*.

*2️⃣* Buscar a *reestruturação das dívidas*, com revisão dos juros e condições de pagamento mais favoráveis.

*3️⃣ AS DUAS OPÇÕES*, para buscar um alívio financeiro e reorganizar suas dívidas.

*Me responda apenas 1, 2 ou 3*, para verificarmos o que pode ser feito no seu caso.

d. No lugar de [VARIÁVEL], insira pelo seletor de campos do editor o campo do lead "IA - Primeiro nome" (no código: {{lead.cf.805158}}). Não digite o nome à mão.
e. Exemplo da variável, se a Meta pedir: Maria
f. Confira o texto com o item c, salve e clique em "Enviar para revisão" ou "Enviar para aprovação". Anote o ID e o status.

==================================================
PARTE 2 · ROBÔ DE SAUDAÇÃO (só com o modelo APROVADO)
==================================================
Se o modelo ainda não estiver aprovado, NÃO faça esta parte: anote "aguardando aprovação" e vá para a Parte 3.

a. Crie um Salesbot novo chamado: Anna · Saudação (primeiro contato)
   - Um único bloco "Enviar mensagem" pelo WhatsApp, com o MODELO "Anna - Primeiro contato v2".
   - Não edite o texto do modelo. Se editar, ele vira mensagem comum e não chega a quem nunca conversou com o escritório.
   - Sem outros blocos, esperas, tags ou mudanças de etapa.
b. No funil SDR, abra a automação (Digital Pipeline) da etapa "Contato inicial" e adicione UMA automação nova:
   - Gatilho: quando o lead entra na etapa.
   - Espera: 1 minuto. A Anna preenche o primeiro nome nesse intervalo.
   - Condição: só leads com a tag anna-teste. Use o filtro de condição da automação. Se não houver filtro por tag, ponha no início do Salesbot um bloco "Condição": se a tag anna-teste NÃO estiver no lead, parar.
   - Ação: rodar o Salesbot "Anna · Saudação (primeiro contato)".
   - Não mexa nas outras automações que já estão nessa etapa (por exemplo "Campanha" e "Robo inicial").
c. Salve e reabra para conferir que ficou salvo, com a condição da tag.

==================================================
PARTE 3 · LISTA DOS ROBÔS ANTIGOS (SOMENTE LEITURA)
==================================================
Objetivo: montar a lista para a Dra. decidir o que fica, sai ou muda antes da entrada da Anna. Não altere nada. Se abrir um modal de edição, feche sem salvar.

a. Abra a automação (Digital Pipeline) de TODOS os funis: SDR, Closer, Gestão operacional, Financeiro e qualquer outro que aparecer.
b. Para CADA etapa, anote cada automação ligada a ela:
   - funil › etapa;
   - gatilho exato (entrou na etapa, mensagem recebida, X horas antes/depois de um campo de data, mudança de campo etc.) e espera;
   - condição (tags, campos, horário), se houver;
   - ação: Salesbot (nome e ID), modelo ou texto enviado, mudança de etapa (para onde), tag posta ou tirada, tarefa;
   - se está ativa.
c. Abra também, só para ler, estes Salesbots e anote bloco a bloco o que cada um faz (mensagens/modelos, esperas, mudanças de etapa, tags):
   39652 SDR RETORNO IMEDIATO · 48895 Acompanha resposta e move para RI · 50370 SDR- Alterar etapa plan-Rtrnimed. · 52156 Follow Cliente decisão · 52872 Robo inicial · 16332 Campanha · 21100 Não compareceu · 48674 não compareceu · 48672 Retorno Imediato SDR · 47119 Move para retorno imediato · 45903 Para retorno imediato · 41258 horário de funcionamento · 15160 Fluxo Superendividamento - Vídeo · 48676 Fluxo Superendividamento · 52612 Follow up · 53764 FOLLOW AGENDAR REUNIÃO · 52906 a 52912 Ativar follow 1 a 4 · 52128 / 52152 / 52154 Reunião agendada 2h / 1h / 15 minutos · 21094 Cliente Desisão · 43877 Disparo CLOSER - CLIENTE DECISÃO.
d. Marque cada automação com uma destas situações, olhando o que ela faz com um lead do SDR ou do Closer:
   - MANDA MENSAGEM ao lead (qual);
   - MOVE O CARD de etapa ou de funil (de onde para onde);
   - SÓ TAREFA/TAG;
   - INATIVA.

==================================================
RELATÓRIO FINAL
==================================================
0. Parte 0: o que foi excluído; o que a busca e os Chats ainda mostram para 964866458.
1. Parte 1: nome, ID e status do modelo; se a variável ficou como o campo "IA - Primeiro nome".
2. Parte 2: feito ou "aguardando aprovação"; se feito, o nome do Salesbot, a condição da tag e o print da automação salva.
3. Parte 3: uma tabela com funil › etapa | automação/Salesbot (ID) | gatilho e espera | condição | o que faz | situação (MANDA MENSAGEM / MOVE O CARD / SÓ TAREFA-TAG / INATIVA) | ativa? Depois, a descrição bloco a bloco dos Salesbots do item c. Se possível, um print de cada etapa.
4. Tudo o que travou ou foi pulado, com o que a tela mostrou.
```

## Depois que a Meta aprovar o modelo

Se a Parte 2 ficou "aguardando aprovação", rode no Cowork só a Parte 2 do bloco acima, com o mesmo cabeçalho de autorização e limites. Depois cole o relatório na sessão do Claude Code. A Anna passa a usar a saudação pelo Kommo, e o teste com o número que nunca falou com o escritório é feito na hora.
