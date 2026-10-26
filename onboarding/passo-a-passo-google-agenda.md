# Passo a passo: integração do Google Agenda (reunião com a Dra.)

**Duração:** até 1 hora, feita na conta Google **da agenda da Dra.**, com tela compartilhada. O Eduardo conduz; a Dra. faz o login e as confirmações.

**A Dra. precisa ter em mãos:** o login da conta Google da agenda e o celular, para a verificação em duas etapas.

**O Claude Code precisa estar aberto na sessão**, para configurar a Anna no meio do processo (passo 9).

---

## Parte 1: criar o aplicativo da agenda (Google Cloud)

1. **Entrar no Google Cloud.** Abra **console.cloud.google.com** com a conta Google da agenda. Se for a primeira vez, escolha o país **Brasil**, aceite os termos e clique em **Concordar e continuar**.

2. **Criar o projeto.**
   - No topo da página, clique no seletor de projeto e em **Novo projeto**.
   - Nome: **Anna Agenda**. Clique em **Criar**.
   - Quando terminar, selecione o projeto **Anna Agenda** no seletor do topo.

3. **Ativar a API da agenda.**
   - Abra o menu ☰ › **APIs e serviços** › **Biblioteca**.
   - Busque **Google Calendar API**, abra e clique em **Ativar**.

4. **Configurar a tela de autorização.**
   - Abra o menu ☰ › **APIs e serviços** › **Tela de permissão OAuth**. Pode aparecer como **Google Auth Platform**. Clique em **Começar**.
   - **Informações do app:** nome **Anna - Carolina Calvo Advogados**, e-mail de suporte = e-mail da Dra.
   - **Público:** **Externo**.
   - **Informações de contato:** e-mail da Dra.
   - Aceite a política e clique em **Criar**.

5. **Permissões da agenda.**
   - No menu da esquerda, abra **Acesso a dados** › **Adicionar ou remover escopos**.
   - No campo de escopos manuais, cole as duas linhas abaixo e clique em **Adicionar à tabela** › **Atualizar** › **Salvar**:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.freebusy`

6. **Publicar o app.**
   - Abra **Público** › **Publicar app** › **Confirmar**.
   - O status precisa ficar **Em produção**. Se ficar "Em teste", o acesso vence em 7 dias.

7. **Criar a credencial da Anna.**
   - Abra **Clientes** › **Criar cliente**.
   - Tipo de aplicativo: **Aplicativo da Web**. Nome: **Anna**.
   - Em **URIs de redirecionamento autorizados**, clique em **Adicionar URI** e cole exatamente este endereço, depois clique em **Criar**:
     `https://anna-carolina-calvo.vercel.app/api/google`

8. **Copiar as chaves.** Na janela que abre, copie o **ID do cliente** e a **Chave secreta do cliente**.
   - Cole as duas **só na sessão do Claude Code**.
   - Nunca envie por WhatsApp.

## Parte 2: conectar a agenda à Anna

9. **Configurar a Anna** (Claude Code, de 2 a 3 minutos). O Claude grava as chaves na Anna e devolve o **link de convite**. O link vale por 7 dias e uma vez só.

10. **A Dra. autoriza.**
    - Abra o link do convite e escolha a conta Google da agenda.
    - Na tela "O Google não verificou este app", clique em **Avançado** › **Acessar Anna (não seguro)**. O aviso aparece porque o app é novo; é normal.
    - Marque **as duas caixas** da agenda e clique em **Continuar**.
    - Deve aparecer a página **"Agenda conectada ✅"**, com o nome da agenda.

## Parte 3: teste na hora

11. **A Dra. cria um compromisso de teste** na agenda, por exemplo amanhã às 15:00. O Claude confere que a Anna enxerga esse horário como ocupado.

12. **O Claude cria e apaga uma reunião de teste** com link do Google Meet. A Dra. vê a reunião aparecer na agenda e depois sumir.

13. **A Dra. apaga o compromisso de teste.**

---

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| "Acesso bloqueado" ou "app não concluiu o processo de verificação" | Volte ao passo 6. O app está "Em teste" ou o público está "Interno". |
| "redirect_uri_mismatch" | Volte ao passo 7. O endereço precisa ser exatamente o de cima, sem barra no final. |
| "O administrador bloqueou este app" | A conta é de um Google Workspace com bloqueio. Quem administra o domínio libera o app em admin.google.com › Segurança › Controles de API. |
| As reuniões ficam numa agenda separada, por exemplo "Reuniões" | Avise o Claude e informe o nome da agenda. |

**Segurança:** o app fica na conta da Dra., sob o controle dela. O acesso pode ser revogado a qualquer momento em **myaccount.google.com/permissions**.
