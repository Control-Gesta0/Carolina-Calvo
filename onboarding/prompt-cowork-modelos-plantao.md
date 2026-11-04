# Prompt para o Cowork: modelos de primeira mensagem do expediente e do plantão (04/11/2026)

> **Para que serve.** A Dra. quer que a Anna se apresente como "equipe de plantão" fora do expediente:
> - segunda a sexta, das 4h às 8h59 e das 17h às 22h;
> - sábado e domingo, das 4h às 22h.
>
> No lead de formulário, a primeira mensagem é um modelo da Meta, com texto fixo. Por isso são dois modelos: um para o expediente e outro para o plantão. A Anna escolhe qual mandar pela hora.
>
> As frases de apresentação foram propostas à Dra. em 04/11. Se ela mudar alguma, troque a linha no item c antes de rodar.
>
> - **Parte 1:** criar os dois modelos e mandar para a Meta.
> - **Parte 2:** criar os dois robôs de saudação. Só roda com os modelos aprovados.
>
> Cole o bloco no Cowork, com o Chrome logado no Kommo do escritório. O prompt não leva nenhum segredo.

```text
Implantação da Anna (Carolina Calvo Advogados), no Kommo https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme a conta antes de começar.

AUTORIZAÇÃO
- Parte 1: criar 2 modelos de WhatsApp novos e enviá-los para a aprovação da Meta.
- Parte 2 (só com os 2 modelos APROVADOS): criar 2 Salesbots novos.

LIMITES
- Não altere, desative nem exclua nada que já exista: modelos, Salesbots (inclusive o 54604 "Anna · Saudação (primeiro contato)"), automações, etapas, cards.
- Não crie automação em etapa nenhuma: quem dispara os robôs novos é a Anna.
- Não escreva para nenhum lead.
- Senhas e códigos são comigo. Se pedirem, me chame e espere.
- Se um passo travar, anote o que a tela mostrou e siga.

==================================================
PARTE 1 · DOIS MODELOS NOVOS
==================================================
Vá em Configurações > Comunicação (ou Chats e mensagens) > Modelos. Crie os dois, um de cada vez, com:
- Categoria: Marketing
- Idioma: Português (Brasil)
- Número do WhatsApp: o do escritório, o mesmo do modelo "Anna - Primeiro contato v2"
- Sem cabeçalho, sem rodapé, sem botões
- Variável [NOME]: inserida pelo seletor de campos do editor, campo do lead "IA - Primeiro nome" ({{lead.cf.805158}}). Não digite à mão.
- Exemplo da variável, se a Meta pedir: Maria

a. Nome: Anna - Primeiro contato expediente
b. Nome: Anna - Primeiro contato plantão

c. Texto, exatamente assim. A PRIMEIRA LINHA muda entre os dois modelos; o resto é igual:

   Modelo "expediente", primeira linha:
Olá, [NOME]! Aqui é a Anna, da equipe da Dra. Carolina Calvo.

   Modelo "plantão", primeira linha:
Olá, [NOME]! Aqui é a Anna, da equipe de plantão do escritório da Dra. Carolina Calvo.

   Resto do texto (igual nos dois), com as linhas em branco, os asteriscos e os emojis:

*Imagine poder respirar financeiramente, com menos descontos comprometendo sua renda todos os meses.*

Qual dessas possibilidades faria mais diferença para você hoje?

*1️⃣* Buscar judicialmente a *suspensão dos descontos bancários por até 6 meses*.

*2️⃣* Buscar a *reestruturação das dívidas*, com revisão dos juros e condições de pagamento mais favoráveis.

*3️⃣ AS DUAS OPÇÕES*, para buscar um alívio financeiro e reorganizar suas dívidas.

*Me responda apenas 1, 2 ou 3*, para verificarmos o que pode ser feito no seu caso.

d. Confira o texto, salve e clique em "Enviar para revisão" / "Enviar para aprovação". Se aparecer um aviso de moderação pedindo confirmação, me chame para eu clicar.
e. Anote o ID e o status de cada modelo.

==================================================
PARTE 2 · DOIS ROBÔS DE SAUDAÇÃO (só com os modelos APROVADOS)
==================================================
Se algum modelo não estiver aprovado, NÃO faça esta parte: anote "aguardando aprovação".

Para cada modelo aprovado, crie um Salesbot novo igual ao 54604 "Anna · Saudação (primeiro contato)":
- Nome: "Anna · Saudação expediente" (modelo expediente) e "Anna · Saudação plantão" (modelo plantão).
- Um único bloco "Enviar mensagem" pelo WhatsApp Business "Carolina Calvo Advocacia", com o MODELO correspondente, sem editar o texto.
- Marque a opção "Forçar mensagem". Sem ela, o Kommo não envia para quem nunca conversou com o escritório.
- Sem outros blocos, esperas, tags, mudanças de etapa ou gatilhos.
- Salve, reabra e confira o modelo e o "Forçar mensagem".

RELATÓRIO
1. Parte 1: nome, ID e status de cada modelo; se a variável ficou como o campo "IA - Primeiro nome".
2. Parte 2: nome e ID de cada Salesbot, ou "aguardando aprovação".
3. O que travou ou foi pulado, com o que a tela mostrou.
```

## Depois

Cole o relatório na sessão do Claude Code. Com os dois robôs prontos, a Anna passa a escolher pela hora de Brasília:
- **plantão:** segunda a sexta das 4h às 8h59 e das 17h às 22h; sábado e domingo das 4h às 22h;
- **expediente:** segunda a sexta das 9h às 16h59.

O teste é feito nos dois horários e no fim de semana.
