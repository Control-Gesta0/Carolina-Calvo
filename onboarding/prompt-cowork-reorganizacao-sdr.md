# Prompt para o Cowork: redirecionar os robôs das colunas que saem do SDR (03/11/2026)

> **Situação.** A Dra. pediu, em 03/11, para tirar do SDR as colunas ATÉ 5 MIL e 5 A 10 MIL. Os cards delas já foram movidos e as colunas estão vazias. A coluna ICMS já foi excluída.
>
> Alguns robôs ainda mandam cards para as duas colunas. Este prompt troca o destino desses robôs, e depois o Claude Code exclui as colunas. Destinos decididos pelo Eduardo:
> - quando o lead volta a escrever: **Contato inicial**;
> - quando o robô classifica pela faixa de salário: **Desqualificado**.
>
> Cole o bloco abaixo no Cowork, com o Chrome logado no Kommo do escritório. O prompt não leva nenhum segredo.

```text
Implantação da Anna (Carolina Calvo Advogados), no Kommo https://advogadacarolinacalvo.kommo.com (account_id 33595135). Confirme a conta antes de começar.

AUTORIZAÇÃO
Só pode trocar a ETAPA DE DESTINO dos blocos "Mudar etapa" (ou "Alterar status") listados abaixo, em que o destino hoje é SDR › ATÉ 5 MIL ou SDR › 5 A 10 MIL. Nada mais.

LIMITES
- Não altere mensagens, esperas, condições, tags, gatilhos, nem outros blocos.
- Não desative, não exclua e não crie robô, Salesbot ou automação.
- Não exclua colunas: isso será feito depois, pela integração.
- Não escreva para nenhum lead.
- Senhas e códigos são comigo. Se pedirem, me chame e espere.
- Se um item não estiver como descrito, não altere: anote o que viu e siga para o próximo.

A · SALESBOTS (Configurações > Salesbot, ou a lista de Bots). Em cada um, abra o editor, troque só o destino e salve.
1. 39652 SDR RETORNO IMEDIATO: "SDR › 5 A 10 MIL" vira "SDR › Contato inicial".
2. 48895 Acompanha resposta e move para RI: "SDR › 5 A 10 MIL" vira "SDR › Contato inicial".
3. 50370 SDR- Alterar etapa plan-Rtrnimed.: "SDR › 5 A 10 MIL" vira "SDR › Contato inicial".
4. 48672 Retorno Imediato SDR: "SDR › 5 A 10 MIL" vira "SDR › Contato inicial".
5. 45903 Para retorno imediato: "SDR › 5 A 10 MIL" vira "SDR › Contato inicial".
6. 15160 Fluxo Superendividamento - Vídeo ("Luíza"): os destinos "SDR › ATÉ 5 MIL" e "SDR › 5 A 10 MIL" viram "SDR › Desqualificado". Os outros destinos ficam como estão.
7. 52872 Robo inicial: os destinos "ATÉ 5 MIL" e "5 A 10 MIL" viram "SDR › Desqualificado". Os outros destinos ficam como estão.

B · AUTOMAÇÕES DAS ETAPAS (Leads > funil > Automatizar). Troque só o destino da ação "Mudar etapa".
8. Funil SDR, etapas Venda ganha / Venda perdida: a regra "chat iniciado por mensagem de entrada → mudar para 5 A 10 MIL" passa a mudar para "Contato inicial".
9. Funil Closer, etapa Venda perdida: a regra "chat iniciado por mensagem de entrada → mudar para SDR › 5 A 10 MIL" passa a mudar para "SDR › Contato inicial".

C · CONFERÊNCIA
10. Procure, em todos os Salesbots e automações dos funis, se sobrou algum destino "ATÉ 5 MIL" ou "5 A 10 MIL". Anote cada um, sem alterar.

RELATÓRIO
- Para cada item de 1 a 9: o destino antes, o destino depois, e se salvou e conferiu reabrindo (sim/não).
- Item 10: a lista do que sobrou com destino nas duas colunas, ou "nada".
- O que travou ou foi pulado, com o que a tela mostrou.
```

## Depois do Cowork

Cole o relatório na sessão do Claude Code. Se o item 10 vier "nada", o Claude confere que as duas colunas continuam vazias e as exclui pela integração.
