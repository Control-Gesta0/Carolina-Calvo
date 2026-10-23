# Prompt para o Cowork: exportar as conversas de setembro e outubro (treino da Anna)

> **Para que serve.** A Dra. pediu que a Anna aprenda com as conversas reais de setembro e outubro: objeções, perguntas frequentes e o que levou à reunião. O Kommo não entrega o texto das conversas antigas pela integração, porque os eventos de chat trazem só o código da mensagem. A cópia é feita pela tela.
>
> **A amostra.** São 91 cards com conversa de verdade, com pelo menos 3 mensagens do lead e 3 da equipe, entre 13/09 e 13/10:
> - 45 que viraram reunião;
> - 11 encerrados como venda perdida;
> - 35 que ficaram no SDR.
>
> Dentro de cada grupo, entram primeiro as conversas mais longas.
>
> **Como devolver.** O Cowork grava um arquivo de texto. O Eduardo anexa o arquivo na sessão do Claude Code, que roda `npx tsx scripts/treino-conversas.ts <arquivo>` e gera o relatório para a Dra. aprovar.
>
> O prompt não leva nenhum segredo. Os dados pessoais (CPF, telefone, e-mail) são mascarados pelo script antes de qualquer análise.

```text
Implantação da Anna (Carolina Calvo Advogados): exportar conversas para treino. Faça pelo meu Chrome, já logado no Kommo https://advogadacarolinacalvo.kommo.com.

AUTORIZAÇÃO
Só LEITURA. Você pode abrir os cards da lista abaixo e copiar o texto da conversa do WhatsApp de cada um.

LIMITES
- Não escreva nada para nenhum lead, não mude etapa, tag, campo, tarefa nem nota. Não clique em "Enviar".
- Senhas e códigos são comigo. Se pedirem, me chame e espere.
- Se um card não abrir ou não tiver conversa, anote "sem conversa" e siga para o próximo.

COMO FAZER EM CADA CARD
1. Abra o link do card.
2. No painel da conversa (lado direito/feed), role até o início da conversa de WhatsApp.
3. Copie todas as mensagens, do início ao fim, na ordem, no formato abaixo. "LEAD" é o que o cliente escreveu e "EQUIPE" é o que o escritório ou os robôs mandaram. Mensagem de áudio: escreva [áudio]. Imagem ou PDF: escreva [arquivo].
4. Anote no cabeçalho a etapa em que o card está hoje (funil › etapa, no topo do card) e a data de criação.

FORMATO (um bloco por card, exatamente assim):
=== CARD <número do card> | etapa final: <funil › etapa> | entrada: <dd/mm/aaaa>
[LEAD dd/mm hh:mm] texto
[EQUIPE dd/mm hh:mm] texto
...

Grave tudo num único arquivo de texto chamado conversas-set-out.txt na pasta Downloads e me avise quando terminar, com quantos cards ficaram "sem conversa".

LISTA DE CARDS
  1. https://advogadacarolinacalvo.kommo.com/leads/detail/27799274
  2. https://advogadacarolinacalvo.kommo.com/leads/detail/28680320
  3. https://advogadacarolinacalvo.kommo.com/leads/detail/28688466
  4. https://advogadacarolinacalvo.kommo.com/leads/detail/24593269
  5. https://advogadacarolinacalvo.kommo.com/leads/detail/20021212
  6. https://advogadacarolinacalvo.kommo.com/leads/detail/27429949
  7. https://advogadacarolinacalvo.kommo.com/leads/detail/28850908
  8. https://advogadacarolinacalvo.kommo.com/leads/detail/28805564
  9. https://advogadacarolinacalvo.kommo.com/leads/detail/28721912
 10. https://advogadacarolinacalvo.kommo.com/leads/detail/26793210
 11. https://advogadacarolinacalvo.kommo.com/leads/detail/28667554
 12. https://advogadacarolinacalvo.kommo.com/leads/detail/28573664
 13. https://advogadacarolinacalvo.kommo.com/leads/detail/10864100
 14. https://advogadacarolinacalvo.kommo.com/leads/detail/27116394
 15. https://advogadacarolinacalvo.kommo.com/leads/detail/28440618
 16. https://advogadacarolinacalvo.kommo.com/leads/detail/26715428
 17. https://advogadacarolinacalvo.kommo.com/leads/detail/28576508
 18. https://advogadacarolinacalvo.kommo.com/leads/detail/26364312
 19. https://advogadacarolinacalvo.kommo.com/leads/detail/27107710
 20. https://advogadacarolinacalvo.kommo.com/leads/detail/28261006
 21. https://advogadacarolinacalvo.kommo.com/leads/detail/19573394
 22. https://advogadacarolinacalvo.kommo.com/leads/detail/26572222
 23. https://advogadacarolinacalvo.kommo.com/leads/detail/27308415
 24. https://advogadacarolinacalvo.kommo.com/leads/detail/28757022
 25. https://advogadacarolinacalvo.kommo.com/leads/detail/27622066
 26. https://advogadacarolinacalvo.kommo.com/leads/detail/27740046
 27. https://advogadacarolinacalvo.kommo.com/leads/detail/28211844
 28. https://advogadacarolinacalvo.kommo.com/leads/detail/28673624
 29. https://advogadacarolinacalvo.kommo.com/leads/detail/28163630
 30. https://advogadacarolinacalvo.kommo.com/leads/detail/28808178
 31. https://advogadacarolinacalvo.kommo.com/leads/detail/28654366
 32. https://advogadacarolinacalvo.kommo.com/leads/detail/28861680
 33. https://advogadacarolinacalvo.kommo.com/leads/detail/23298545
 34. https://advogadacarolinacalvo.kommo.com/leads/detail/28213342
 35. https://advogadacarolinacalvo.kommo.com/leads/detail/28146330
 36. https://advogadacarolinacalvo.kommo.com/leads/detail/28648490
 37. https://advogadacarolinacalvo.kommo.com/leads/detail/13577620
 38. https://advogadacarolinacalvo.kommo.com/leads/detail/27873036
 39. https://advogadacarolinacalvo.kommo.com/leads/detail/20982860
 40. https://advogadacarolinacalvo.kommo.com/leads/detail/28371034
 41. https://advogadacarolinacalvo.kommo.com/leads/detail/26369262
 42. https://advogadacarolinacalvo.kommo.com/leads/detail/28740098
 43. https://advogadacarolinacalvo.kommo.com/leads/detail/28657790
 44. https://advogadacarolinacalvo.kommo.com/leads/detail/27947432
 45. https://advogadacarolinacalvo.kommo.com/leads/detail/25063566
 46. https://advogadacarolinacalvo.kommo.com/leads/detail/27523074
 47. https://advogadacarolinacalvo.kommo.com/leads/detail/26058451
 48. https://advogadacarolinacalvo.kommo.com/leads/detail/27694702
 49. https://advogadacarolinacalvo.kommo.com/leads/detail/28853372
 50. https://advogadacarolinacalvo.kommo.com/leads/detail/28731964
 51. https://advogadacarolinacalvo.kommo.com/leads/detail/28255580
 52. https://advogadacarolinacalvo.kommo.com/leads/detail/28667360
 53. https://advogadacarolinacalvo.kommo.com/leads/detail/25723485
 54. https://advogadacarolinacalvo.kommo.com/leads/detail/28810030
 55. https://advogadacarolinacalvo.kommo.com/leads/detail/28642492
 56. https://advogadacarolinacalvo.kommo.com/leads/detail/28649330
 57. https://advogadacarolinacalvo.kommo.com/leads/detail/28738176
 58. https://advogadacarolinacalvo.kommo.com/leads/detail/11686852
 59. https://advogadacarolinacalvo.kommo.com/leads/detail/28806530
 60. https://advogadacarolinacalvo.kommo.com/leads/detail/28700668
 61. https://advogadacarolinacalvo.kommo.com/leads/detail/28801196
 62. https://advogadacarolinacalvo.kommo.com/leads/detail/28651340
 63. https://advogadacarolinacalvo.kommo.com/leads/detail/25367208
 64. https://advogadacarolinacalvo.kommo.com/leads/detail/28717422
 65. https://advogadacarolinacalvo.kommo.com/leads/detail/28806078
 66. https://advogadacarolinacalvo.kommo.com/leads/detail/28720084
 67. https://advogadacarolinacalvo.kommo.com/leads/detail/28688722
 68. https://advogadacarolinacalvo.kommo.com/leads/detail/28851428
 69. https://advogadacarolinacalvo.kommo.com/leads/detail/28717780
 70. https://advogadacarolinacalvo.kommo.com/leads/detail/28727512
 71. https://advogadacarolinacalvo.kommo.com/leads/detail/28797158
 72. https://advogadacarolinacalvo.kommo.com/leads/detail/28691980
 73. https://advogadacarolinacalvo.kommo.com/leads/detail/28836984
 74. https://advogadacarolinacalvo.kommo.com/leads/detail/28851392
 75. https://advogadacarolinacalvo.kommo.com/leads/detail/28648286
 76. https://advogadacarolinacalvo.kommo.com/leads/detail/28834846
 77. https://advogadacarolinacalvo.kommo.com/leads/detail/28673892
 78. https://advogadacarolinacalvo.kommo.com/leads/detail/28656090
 79. https://advogadacarolinacalvo.kommo.com/leads/detail/28757952
 80. https://advogadacarolinacalvo.kommo.com/leads/detail/28807450
 81. https://advogadacarolinacalvo.kommo.com/leads/detail/28646124
 82. https://advogadacarolinacalvo.kommo.com/leads/detail/28860620
 83. https://advogadacarolinacalvo.kommo.com/leads/detail/28907412
 84. https://advogadacarolinacalvo.kommo.com/leads/detail/28813736
 85. https://advogadacarolinacalvo.kommo.com/leads/detail/28792202
 86. https://advogadacarolinacalvo.kommo.com/leads/detail/28787018
 87. https://advogadacarolinacalvo.kommo.com/leads/detail/28676674
 88. https://advogadacarolinacalvo.kommo.com/leads/detail/23070239
 89. https://advogadacarolinacalvo.kommo.com/leads/detail/27503754
 90. https://advogadacarolinacalvo.kommo.com/leads/detail/28842062
 91. https://advogadacarolinacalvo.kommo.com/leads/detail/28792758
```
