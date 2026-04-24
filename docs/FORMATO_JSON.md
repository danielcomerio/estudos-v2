# Formato JSON — import de questões

O endpoint `POST /api/questions/import` aceita o que a tela `/banco/importar`
manda: um array de itens, cada um podendo ser objetiva **ou** discursiva. Os
dois tipos podem coexistir no mesmo arquivo.

Aceita qualquer um desses wrappers (ou array puro):

```json
[ { ... }, { ... } ]
```
```json
{ "items":      [ { ... }, { ... } ] }
{ "questoes":   [ { ... }, { ... } ] }
{ "questions":  [ { ... }, { ... } ] }
```

Antes do Zod rodar, cada item passa pelo `normalizeQuestion` que:
- renomeia chaves pelos aliases (case-insensitive): `disciplina`/`disciplinaId` →
  `disciplina_id`, `banca` → `banca_estilo`, `resposta` → `gabarito`, `pegadinha`
  → `pegadinhas`, `letter`/`text`/`correct`/`explanation` → `letra`/`texto`/
  `correta`/`explicacao`, etc. (lista completa em
  `src/lib/validators/questions.ts`).
- mapeia slugs legados (mlSup, bdRelacional, leiEtica…) para os 5 canônicos:
  `portugues`, `legislacao_mp`, `estatistica`, `banco_de_dados`,
  `inteligencia_artificial` (veja `slug-mapping.ts`).

## Objetiva

Campos obrigatórios estão marcados com **`*`**.

```json
{
  "disciplina_id": "banco_de_dados",                   // * slug canônico ou legado, ou uuid
  "tema": "JOINs e subqueries",                        // * texto livre, vira topic auto
  "dificuldade": 3,                                    //   1..5, default 3
  "banca_estilo": "FGV",                               //   default "FGV"
  "enunciado": "Qual cláusula SQL retorna ...",        // * >= 10 chars
  "alternativas": [                                    // * exatamente 5 itens, exatamente 1 `correta: true`
    { "letra": "A", "texto": "INNER JOIN",   "correta": false, "explicacao": "..." },
    { "letra": "B", "texto": "LEFT JOIN",    "correta": true,  "explicacao": "..." },
    { "letra": "C", "texto": "RIGHT JOIN",   "correta": false, "explicacao": "..." },
    { "letra": "D", "texto": "FULL JOIN",    "correta": false, "explicacao": "..." },
    { "letra": "E", "texto": "CROSS JOIN",   "correta": false, "explicacao": "..." }
  ],
  "gabarito": "B",                                     // * deve bater com a letra da `correta: true`
  "explicacao_geral": "LEFT JOIN preserva ...",        // * >= 10 chars
  "pegadinhas": ["confundir INNER com LEFT"]           //   string[], default []
}
```

**Dedupe**: o servidor calcula `md5(normalizeEnunciado(enunciado))` e bloqueia
questões repetidas do mesmo usuário (via índice único parcial em
`(user_id, enunciado_hash) WHERE deleted_at IS NULL`).

## Discursiva

A heurística de `detectQuestionType` detecta automaticamente como discursiva
quando o item tem `rubrica`, `espelho_resposta`, `max_linhas`, `quesitos`, ou
`enunciado_completo` — sem precisar de campo `tipo`. Você também pode forçar com
`"tipo": "discursiva"`.

```json
{
  "tipo": "discursiva",                                //   opcional, força detecção
  "disciplina_id": "legislacao_mp",                    // *
  "tema": "Princípios constitucionais do MP",          // *
  "dificuldade": 4,                                    //   1..5, default 4
  "banca_estilo": "FGV",                               //   default "FGV"
  "tipo_discursiva": "B",                              //   "A" | "B" | "C"
  "enunciado_completo": "Texto completo ...",          // * >= 20 chars
  "texto_base": "Texto-base do enunciado",             //   opcional / nullable
  "comando": "Com base no texto, responda ...",        //   opcional
  "quesitos": [
    { "numero": 1, "pergunta": "Explique X",     "pontos_max": 4.0 },
    { "numero": 2, "pergunta": "Compare Y e Z",  "pontos_max": 6.0 }
  ],
  "rubrica": [
    { "criterio": "Definição correta",  "pontos": 3,  "detalhamento": "..." },
    { "criterio": "Aplicação ao caso",  "pontos": 4 },
    { "criterio": "Redação",            "pontos": 3 }
  ],
  "espelho_resposta": "Resposta-modelo 10/10 ...",     //   >= 30 chars quando presente
  "conceitos_chave": ["princípio X", "art. N da CF"],
  "pegadinhas_esperadas": ["confundir A com B"],
  "estrategia_redacao": "Comece definindo, depois aplique ...",
  "observacoes_corretor": "Evite ambiguidade em ...",
  "apostas_relacionadas": ["#1", "Tema 5 Parte B"],
  "max_linhas": 15,                                    //   default 15
  "pontuacao_maxima": 10                               //   default 10
}
```

Discursivas **não** são desduplicadas (sem `enunciado_hash` na tabela).

## Erros comuns

| Sintoma | Causa provável |
| --- | --- |
| "alternativas: deve ter exatamente 5 alternativas" | Objetiva com menos/mais que 5 opções |
| "alternativas: exatamente 1 alternativa deve ser correta" | Mais de uma com `correta: true` ou nenhuma |
| "gabarito deve bater com a letra da alternativa marcada como correta" | Inconsistência entre `gabarito` e a letra da alternativa `correta: true` |
| "disciplina_id '...' não encontrada" | Slug não mapeado + não existe na tabela `disciplines`. Use um dos 5 canônicos ou um legado conhecido |
| Importação retorna `duplicadas` maior que 0 | Enunciado idêntico já existe no seu banco (md5 do enunciado normalizado) |
