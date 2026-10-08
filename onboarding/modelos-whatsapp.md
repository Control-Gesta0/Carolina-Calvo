# Modelos de WhatsApp (Meta) da Anna e da cobrança

> Criados no Kommo em 08/10/2026 como **rascunho**. Falta enviar para aprovação da Meta (Kommo › Configurações › Modelos › abrir o modelo › enviar para revisão). A Meta leva de 1 minuto a 48 horas.
> Cada variável é um campo do card que o sistema preenche antes do envio. O envio sai pelo Salesbot, usando o modelo aprovado.

## Campos criados no lead

| Campo | ID | Exemplo enviado à Meta |
|---|---|---|
| IA - Primeiro nome | `805158` | Maria |
| IA - Horário da reunião | `805160` | quinta-feira, 09/10, às 15:00 |
| IA - Link do Meet | `805162` | https://meet.google.com/abc-defg-hij |
| Cobrança - Link de pagamento | `805164` | https://www.asaas.com/i/abc123xyz |
| Cobrança - Vencimento | `805166` | 07/11/2026 |
| Cobrança - Dias de atraso | `805168` | 10 |
| Cobrança - Prazo limite | `805170` | 20/11/2026 |

## Modelos

| ID | Modelo | Categoria | Quando sai |
|---|---|---|---|
| `51584` | Anna - Primeiro contato | MARKETING | Primeira mensagem para lead de formulário e reativação da base de setembro e outubro |
| `51586` | Anna - Lembrete reunião 24h | UTILITY | 24 horas antes da reunião |
| `51588` | Anna - Lembrete reunião 1h | UTILITY | 1 hora antes |
| `51590` | Anna - Lembrete reunião 15min | UTILITY | 15 minutos antes |
| `51592` | Cobrança - Antes do vencimento | UTILITY | 4º dia útil do mês (vencimento dia 07) ou 4 dias antes (outros vencimentos) |
| `51594` | Cobrança - Dia do vencimento | UTILITY | Dia do vencimento, de manhã |
| `51596` | Cobrança - Vencimento 17h | UTILITY | Dia do vencimento, 17:00, se não pagou |
| `51598` | Cobrança - 1 dia de atraso | UTILITY | D+1 |
| `51600` | Cobrança - 5 dias de atraso | UTILITY | D+5 |
| `51602` | Cobrança - 10 dias de atraso | UTILITY | D+10 |
| `51604` | Cobrança - 18 dias de atraso | UTILITY | D+18 (prazo limite = envio + 2 dias) |
| `51606` | Cobrança - Pagamento confirmado | UTILITY | Quando o Asaas confirma o pagamento |

**Ajustes nos textos da Dra.:**

- "Fique atenta" virou "Atenção para", porque o texto vai para homens e mulheres.
- Os textos de 10 e 18 dias foram enxugados para caber no limite de 1.024 caracteres da Meta, sem perder nenhum ponto.
- O texto de 18 dias ganhou a linha do link de pagamento.
- Espaços antes de pontuação foram corrigidos.

Os modelos de primeiro contato, lembretes de reunião, antes do vencimento e pagamento confirmado foram redigidos pela Control Gestão no tom da Dra. e precisam do OK dela.

### Anna - Primeiro contato · MARKETING · `51584`

> Olá, [IA - Primeiro nome]. Aqui é a Anna, da equipe da Dra. Carolina Calvo. Recebemos o seu contato sobre os descontos bancários.
>
> Você quer saber se, no seu caso, é possível:
>
> 1) suspender os descontos bancários e pagamento das dívidas por até 6 meses?
> 2) reestruturar o pagamento das dívidas em condições mais favoráveis e com juros revisados?
> 3) as duas opções acima.
>
> É só me responder com o número.

### Anna - Lembrete reunião 24h · UTILITY · `51586`

> Olá, [IA - Primeiro nome]. Passando para lembrar da sua reunião on-line com a Dra. Carolina Calvo amanhã, [IA - Horário da reunião].
>
> O link de acesso pelo Google Meet é este: [IA - Link do Meet]
>
> Se precisar remarcar, é só responder esta mensagem.

### Anna - Lembrete reunião 1h · UTILITY · `51588`

> Olá, [IA - Primeiro nome]. A sua reunião on-line com a Dra. Carolina Calvo começa em 1 hora.
>
> Link de acesso pelo Google Meet: [IA - Link do Meet]
>
> Se tiver algum imprevisto, me avise por aqui.

### Anna - Lembrete reunião 15min · UTILITY · `51590`

> Olá, [IA - Primeiro nome]. Faltam 15 minutos para a sua reunião on-line com a Dra. Carolina Calvo.
>
> Para entrar, use este link do Google Meet: [IA - Link do Meet]
>
> Até já.

### Cobrança - Antes do vencimento · UTILITY · `51592`

> Olá, [IA - Primeiro nome]. Bom dia.
>
> Segue o link de pagamento da sua parcela de honorários com vencimento em [Cobrança - Vencimento]:
>
> [Cobrança - Link de pagamento]
>
> Caso o pagamento já tenha sido efetuado, peço a gentileza de me encaminhar o comprovante.
>
> Desde já, agradeço.

### Cobrança - Dia do vencimento · UTILITY · `51594`

> Bom dia.
>
> Segue o boleto referente à sua ação.
>
> Data de vencimento no dia de HOJE.
>
> Link para pagamento: [Cobrança - Link de pagamento]
>
> Caso o pagamento já tenha sido efetuado, peço a gentileza de me encaminhar o comprovante.
>
> Desde já, agradeço.

### Cobrança - Vencimento 17h · UTILITY · `51596`

> Até o momento, *não localizamos em nosso sistema o pagamento da sua parcela de honorários com vencimento na data de hoje*.
>
> Atenção para *não pagar juros ou encargos por atraso*.
>
> Lembramos que, conforme a *Cláusula 7ª (Subcláusulas 1ª e 5ª)* do seu contrato, o vencimento da parcela de honorários *não está atrelado ou condicionado ao envio de atualizações ou andamentos processuais*.

### Cobrança - 1 dia de atraso · UTILITY · `51598`

> Passando por aqui para lembrar que a sua parcela com vencimento ontem ainda não consta com baixa em nosso sistema financeiro.
>
> Para facilitar a sua regularização ainda hoje e mantermos o seu contrato 100% em dia, segue O LINK DE PAGAMENTO: [Cobrança - Link de pagamento]
>
> Por favor, me envie o comprovante por aqui. Se já tiver efetuado o pagamento, por favor desconsidere esta mensagem.

### Cobrança - 5 dias de atraso · UTILITY · `51600`

> Olá, tudo bem?
>
> Constatamos em nosso sistema financeiro que a sua parcela com vencimento em [Cobrança - Vencimento] permanece pendente de quitação, completando hoje 5 dias de atraso.
>
> Para mantermos a regularidade do seu contrato e evitarmos o encaminhamento do seu débito para as medidas administrativas previstas, disponibilizo abaixo o link de pagamento:
>
> [Cobrança - Link de pagamento]
>
> Por gentileza, realize o pagamento e nos envie o comprovante por aqui até às 17:00 de hoje para darmos a baixa imediata no sistema.
>
> Caso tenha ocorrido algum imprevisto financeiro atípico neste mês, me avise por este canal para que possamos avaliar a melhor alternativa para a sua situação.
>
> Ficamos no aguardo da sua confirmação!

### Cobrança - 10 dias de atraso · UTILITY · `51602`

> Olá, [IA - Primeiro nome], como vai?
>
> Constatamos em nosso sistema financeiro que a sua parcela com vencimento em [Cobrança - Vencimento] continua pendente de quitação, completando hoje [Cobrança - Dias de atraso] dias de atraso.
>
> Sobre a condução do seu caso:
>
> 1) Acompanhamento Processual Mantido: o nosso setor jurídico continua acompanhando o seu processo na Justiça, garantindo os seus prazos e a defesa dos seus direitos.
>
> 2) Pausa no Repasse de Informações e Suporte: enquanto durar a pendência financeira, as atualizações processuais, os relatórios de andamento, os agendamentos de reuniões e o suporte por este canal de WhatsApp ficam paralisados até a baixa do pagamento.
>
> Para regularizar a sua situação hoje e reativar o seu atendimento, segue o link de pagamento:
>
> [Cobrança - Link de pagamento]
>
> Por gentileza, realize o pagamento e nos envie o comprovante por aqui até às 17:00 de hoje para darmos a baixa imediata no sistema.
>
> Ficamos no aguardo da sua confirmação!

### Cobrança - 18 dias de atraso · UTILITY · `51604`

> Prezado(a) [IA - Primeiro nome],
>
> Verificamos em nosso sistema financeiro que a sua parcela com *vencimento em [Cobrança - Vencimento]* permanece pendente de quitação, *completando hoje [Cobrança - Dias de atraso] dias de atraso*.
>
> Como *não tivemos o seu retorno* às nossas tentativas de contato anteriores, reforçamos os termos da condução da sua pasta:
>
> *1) Acompanhamento Processual Mantido:* O nosso setor jurídico continua monitorando e resguardando a sua ação na Justiça, garantindo a defesa dos seus direitos.
>
> *2) Atendimento e Atualizações Paralisados:* No entanto, o repasse de informações do processo e o suporte ativo por este canal de WhatsApp seguem oficialmente *paralisados até a regularização do débito*.
>
> Para evitarmos o encerramento do seu plano facilitado e o encaminhamento do débito para notificação extrajudicial com aplicação das multas contratuais, estipulamos o *prazo limite até [Cobrança - Prazo limite], às 17:00*, para a quitação da parcela.
>
> Link para pagamento: [Cobrança - Link de pagamento]
>
> Ficamos no aguardo.

### Cobrança - Pagamento confirmado · UTILITY · `51606`

> Olá, [IA - Primeiro nome]. Confirmamos o recebimento do pagamento da sua parcela de honorários com vencimento em [Cobrança - Vencimento].
>
> Agradecemos. O seu contrato segue em dia.

