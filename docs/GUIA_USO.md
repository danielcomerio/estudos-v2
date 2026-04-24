# Guia de uso — estudos-v2

Passo a passo de quem nunca usou o app.

## 1. Criar conta e perfil

1. Acesse a URL de produção (ou `http://localhost:3000` no dev).
2. Clica em **Criar conta**, preenche email + senha + nome.
3. Cai no **onboarding**: confirme ou ajuste nome do concurso, banca, data da prova,
   e as cotas por disciplina (default = Oficial MP-ES: 10/5/15/15/15).
4. Clica em **Criar perfil e entrar**.

## 2. Importar seu primeiro lote de questões

1. Vai em **Banco → Importar** (`/banco/importar`).
2. Arraste ou selecione um ou mais arquivos `.json`. Cada arquivo pode ser:
   - Um array puro: `[{...}, {...}]`
   - Um wrapper: `{ "items": [...] }`, `{ "questoes": [...] }`, ou `{ "questions": [...] }`.
3. Cada arquivo é validado no navegador antes de ir pro servidor. Status:
   - **OK** — 100% válidas
   - **Atenção** — >0 válidas mas >0 com erros (erros aparecem num painel)
   - **Erro** — 0 válidas ou JSON falhou
4. Clica **Importar válidas**. O servidor dedupa por hash do enunciado e retorna
   contagens (inseridas, duplicadas, erros).

Formato esperado: veja [FORMATO_JSON.md](./FORMATO_JSON.md).

## 3. Praticar

1. Abre `/praticar`. Selecione disciplinas (vazio = todas), dificuldade min/max,
   modo (aleatório, FSRS due, repetir que errei, etc.), quantidade, timer.
2. **Iniciar sessão**. Responda uma a uma.
3. Ao final, resumo (acertos/%, tempo total, tempo médio).

## 4. Revisar (FSRS)

1. Abre `/revisar`. Vê contadores de vencidas / novas / total do banco.
2. Configura limite + se inclui novas.
3. **Revisar X questões** inicia uma sessão de praticar em modo FSRS.

## 5. Simulado

1. Abre `/simulado` → **Novo template**.
2. Clica **Aplicar preset "Oficial MP-ES"** pra começar com as cotas do edital.
3. Salva. De volta na lista, clica **Iniciar** no template.
4. O runner tem cronômetro sticky e grid de navegação entre questões. Flagar
   pra revisar depois. **Finalizar** grava pontuação e duração.

## 6. Discursivas

1. Abre `/discursivas`. Clica **Responder** na que quer treinar.
2. Escreve a resposta (contador de linhas abaixo).
3. **Enviar e auto-avaliar**: revela o espelho, preenche a rubrica (inputs 0..pontos),
   marca os conceitos-chave que você cobriu, lê notas de estratégia/pegadinhas.
4. **Salvar avaliação**.

## 7. Comunidade

1. Abre `/comunidade` pra ver questões públicas de outros usuários.
2. **Adicionar ao meu banco** cria uma cópia privada (fork) da questão.
3. Pra compartilhar as suas: em `/banco`, troca o dropdown de visibilidade de
   **Privada** pra **Pública**.
4. Pra receber créditos no feed, configure seu perfil público em
   `/configuracoes/perfil-publico`: ative a flag, pegue um `@handle`, escreva uma bio.

## 8. Dashboard

Resumo de tudo: vencidas, taxa de acerto 7d, banco, discursivas, acerto por
disciplina (30d), últimos simulados, e dias até a prova.

## 9. Reset com backup

Se precisar começar do zero (troca de concurso, limpar dados de teste, etc.):

1. Abre **Configurações → Resetar dados**.
2. Marca o checkbox, clica **Resetar todos os meus dados**.
3. O servidor faz um JSON com TUDO que vai apagar, sobe no bucket `backups/`, te
   retorna uma URL assinada (7 dias) e só depois apaga. Seu perfil + study_profile
   são preservados.
4. Pra baixar backups antigos: **Configurações → Backups**.
