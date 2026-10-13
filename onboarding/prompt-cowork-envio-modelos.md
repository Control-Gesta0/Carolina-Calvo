# Prompt para o Cowork: enviar os 12 modelos de WhatsApp para aprovação

> Cole o bloco abaixo numa sessão do Cowork que tenha o navegador (Claude in Chrome) logado no Kommo do escritório com um usuário administrador.

```text
Preciso que você envie 12 modelos de mensagem de WhatsApp para aprovação da Meta, pelo navegador, na conta Kommo do escritório Carolina Calvo Advogados. Trabalhe só pela interface do Kommo.

CONTEXTO
- Conta: https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme que está nessa conta antes de qualquer clique.
- Os 12 modelos já existem como RASCUNHO. Foram criados pela API em 08/10/2026, mas a API não deixa ligar o modelo ao número de WhatsApp. Sem esse vínculo, a revisão não vai para a Meta. Por isso o envio precisa ser feito pela tela.
- Todos os modelos já aprovados da conta (34) usam o mesmo número oficial (conta WABA 2343930862777873). Os novos precisam usar esse mesmo número.

OS 12 MODELOS (nome exato no Kommo · ID · categoria)
1. Anna - Primeiro contato · 51584 · Marketing
2. Anna - Lembrete reunião 24h · 51586 · Utilidade
3. Anna - Lembrete reunião 1h · 51588 · Utilidade
4. Anna - Lembrete reunião 15min · 51590 · Utilidade
5. Cobrança - Antes do vencimento · 51592 · Utilidade
6. Cobrança - Dia do vencimento · 51594 · Utilidade
7. Cobrança - Vencimento 17h · 51596 · Utilidade
8. Cobrança - 1 dia de atraso · 51598 · Utilidade
9. Cobrança - 5 dias de atraso · 51600 · Utilidade
10. Cobrança - 10 dias de atraso · 51602 · Utilidade
11. Cobrança - 18 dias de atraso · 51604 · Utilidade
12. Cobrança - Pagamento confirmado · 51606 · Utilidade

PASSO A PASSO
1. Abra a área de modelos de mensagem do Kommo. Normalmente fica em Configurações, na parte de modelos/templates de chat. O nome do menu pode variar.
2. Antes de mexer nos novos, abra o modelo já aprovado "Lembrete Reunião" só para olhar. Veja qual número de WhatsApp está selecionado nele e anote. Não altere nada nesse modelo.
3. Para cada um dos 12 modelos da lista:
   a. Abra o modelo pelo nome exato.
   b. Selecione o mesmo número de WhatsApp que você anotou no passo 2.
   c. Confira, sem alterar, se a categoria bate com a lista acima e se o idioma é Português (Brasil).
   d. Se a tela pedir exemplos para as variáveis, use estes:
      - IA - Primeiro nome: Maria
      - IA - Horário da reunião: quinta-feira, 09/10, às 15:00
      - IA - Link do Meet: https://meet.google.com/abc-defg-hij
      - Cobrança - Link de pagamento: https://www.asaas.com/i/abc123xyz
      - Cobrança - Vencimento: 07/11/2026
      - Cobrança - Dias de atraso: 10
      - Cobrança - Prazo limite: 20/11/2026
   e. Salve e clique para enviar para revisão (aprovação).
   f. Confira se o status mudou para "Em revisão" ou equivalente antes de passar para o próximo.

REGRAS
- Não altere o texto de nenhum modelo, nem nome, nem categoria. Se a tela obrigar a mudar algo além do número e dos exemplos, pare nesse modelo, anote o que a tela pediu e siga para o próximo.
- Não toque em nenhum outro modelo, Salesbot, lead, funil ou configuração da conta.
- Não exclua nada.
- Se aparecer login, código de verificação ou qualquer pedido de senha, pare e me avise. Não digite credenciais.
- Se a Meta sugerir mudar a categoria (por exemplo, de Utilidade para Marketing), não aceite sozinho. Anote e me avise.

QUANDO TERMINAR, ME DEVOLVA
Uma tabela com os 12 modelos: nome, número selecionado, status final na tela (Em revisão, Aprovado, Rejeitado ou Não enviado) e o motivo, quando houver. Inclua também qualquer aviso que a tela tenha mostrado.
```
