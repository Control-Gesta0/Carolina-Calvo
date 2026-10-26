# Como ligar o Google Agenda à Anna

**Guia simples, passo a passo, para fazer junto com a Dra. Carolina na reunião.**

---

## Antes de começar

**Tempo:** até 1 hora.

**O que a Dra. precisa ter em mãos:**

- ✅ O e-mail e a senha da conta Google onde ficam as reuniões dela, ou seja, a agenda que ela usa no celular.
- ✅ O celular por perto, porque o Google pode mandar um código de confirmação.

**Como fazer:**

- Use o **Google Chrome** no computador.
- A Dra. faz o login e os cliques. O Eduardo vai guiando pela tela compartilhada.
- Deixe a conversa com o Claude aberta, porque no passo 9 ele entra em ação.

**Muito importante:**

- Durante todo o processo, a conta logada no Google precisa ser **a da agenda da Dra.**
- Se aparecer outra conta no canto de cima, à direita, clique na foto e troque.

---

## PARTE 1: criar o "aplicativo da Anna" na conta da Dra.

Este aplicativo é a "chave" que permite à Anna ver os horários livres e marcar reuniões na agenda.

### Passo 1: entrar no Google Cloud

👉 Clique aqui: **<https://console.cloud.google.com>**

- Entre com a conta Google da agenda.
- Se for a primeira vez, aparece uma janela de boas-vindas:
  - em **País**, escolha **Brasil**;
  - marque a caixa dos **Termos de Serviço**;
  - clique em **Concordar e continuar**.

### Passo 2: criar o projeto

👉 Clique aqui: **<https://console.cloud.google.com/projectcreate>**

- Em **Nome do projeto**, apague o que estiver escrito e digite: **Anna Agenda**
- Clique no botão azul **Criar**.
- Espere uns 30 segundos. Vai aparecer um sininho de notificação.
- **Confira no topo da tela, ao lado do logo do Google Cloud, se está escrito "Anna Agenda".** Se não estiver, clique ali e escolha **Anna Agenda**.

### Passo 3: ligar a agenda (Google Calendar API)

👉 Clique aqui: **<https://console.cloud.google.com/apis/library/calendar-json.googleapis.com>**

- Confira no topo se o projeto é **Anna Agenda**.
- Clique no botão azul **Ativar**.
- Espere carregar. Pronto.

### Passo 4: dar nome ao aplicativo

👉 Clique aqui: **<https://console.cloud.google.com/auth/branding>**

- Se aparecer um botão **Começar**, clique nele.
- Preencha:
  - **Nome do app:** Anna - Carolina Calvo Advogados
  - **E-mail para suporte do usuário:** escolha o e-mail da Dra. na lista
- Clique em **Próxima**.
- Em **Público**, marque **Externo** e clique em **Próxima**.
- Em **Informações de contato**, digite o e-mail da Dra. e clique em **Próxima**.
- Marque a caixa **"Concordo com a Política de Dados do Usuário..."**.
- Clique em **Continuar** e depois em **Criar**.

### Passo 5: dizer o que a Anna pode fazer na agenda

👉 Clique aqui: **<https://console.cloud.google.com/auth/scopes>**

- Clique em **Adicionar ou remover escopos**.
- Vai abrir uma janela do lado direito. Role até o fim, onde está escrito **"Adicionar escopos manualmente"**.
- Copie e cole as **duas linhas abaixo** na caixa, uma embaixo da outra:

```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.freebusy
```

- Clique em **Adicionar à tabela** e depois em **Atualizar**.
- De volta à página, role até o fim e clique em **Salvar**.

> O que isso significa: a Anna pode **ver quando a Dra. está ocupada** e **criar ou apagar as reuniões que ela mesma marca**. Ela não lê e-mails, fotos, contatos nem documentos.

### Passo 6: publicar o aplicativo (não pule!)

👉 Clique aqui: **<https://console.cloud.google.com/auth/audience>**

- Em **Status de publicação**, clique em **Publicar app** e depois em **Confirmar**.
- Tem que aparecer **"Em produção"**.

> ⚠️ Se ficar "Em teste", a ligação da agenda para de funcionar em 7 dias.

### Passo 7: criar a chave da Anna

👉 Clique aqui: **<https://console.cloud.google.com/auth/clients/create>**

- Em **Tipo de aplicativo**, escolha **Aplicativo da Web**.
- Em **Nome**, digite: **Anna**
- Desça até **URIs de redirecionamento autorizados** e clique em **+ Adicionar URI**.
- Copie e cole **exatamente** este endereço:

```
https://anna-carolina-calvo.vercel.app/api/google
```

- Clique no botão azul **Criar**.

### Passo 8: copiar as duas chaves

Vai abrir uma janela com:

- **ID do cliente**, um código comprido terminando em `.apps.googleusercontent.com`;
- **Chave secreta do cliente**, um código que começa com `GOCSPX-`.

Clique no ícone de copiar ao lado de cada um e **cole os dois na conversa com o Claude**.

> 🔒 Não mande essas chaves por WhatsApp nem por e-mail. Só na conversa com o Claude.

---

## PARTE 2: ligar a agenda à Anna

### Passo 9: o Claude configura (2 a 3 minutos)

O Claude grava as chaves na Anna e devolve um **link de convite**. O link vale por 7 dias e funciona uma vez só.

### Passo 10: a Dra. autoriza

1. Abra o **link de convite** que o Claude mandou.
2. Escolha a **conta Google da agenda**.
3. Vai aparecer a tela **"O Google não verificou este app"**. É normal, porque o aplicativo acabou de ser criado.
   - Clique em **Avançado**, no canto de baixo, à esquerda.
   - Clique em **Acessar Anna - Carolina Calvo Advogados (não seguro)**.
4. Na tela seguinte, **marque as duas caixas** da agenda.
5. Clique em **Continuar**.
6. Pronto! Tem que aparecer: **"Agenda conectada ✅"**.

---

## PARTE 3: testar na hora (5 minutos)

1. A Dra. abre a agenda dela (**<https://calendar.google.com>**) e cria um compromisso de teste, por exemplo **amanhã às 15:00**, com o título "Teste Anna".
2. O Claude confere que a Anna enxerga esse horário como **ocupado** e não vai oferecê-lo a ninguém.
3. O Claude cria uma **reunião de teste com link do Google Meet**. A Dra. vê a reunião aparecer na agenda.
4. O Claude apaga a reunião de teste. A Dra. vê a reunião sumir.
5. A Dra. apaga o compromisso "Teste Anna".

**Integração concluída. ✅**

---

## Se aparecer algum erro

| Apareceu isto | Faça isto |
|---|---|
| **"Acesso bloqueado"** ou "app não concluiu a verificação" | Volte ao **Passo 6** e confira se está "Em produção". Volte também ao **Passo 4** e confira se o público é "Externo". |
| **"redirect_uri_mismatch"** | Volte ao **Passo 7** e confira se o endereço está **exatamente igual**, sem espaço e sem barra no final. |
| **"O administrador bloqueou este app"** | O e-mail da Dra. é de empresa (Google Workspace). Quem administra o e-mail do escritório precisa liberar. Chame o Claude. |
| As reuniões ficam numa agenda separada, com outro nome | Avise o Claude e diga o nome da agenda. |
| Qualquer outra coisa | Tire um print da tela e mande para o Claude. |

---

## Segurança

- O aplicativo fica **na conta da própria Dra.**, sob o controle dela.
- A Anna **não recebe a senha** da Dra. em nenhum momento.
- Para desligar a qualquer hora, abra **<https://myaccount.google.com/permissions>**, clique em "Anna - Carolina Calvo Advogados" e depois em **Remover acesso**.
