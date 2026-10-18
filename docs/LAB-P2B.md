# NOCTE-P2B-E — laboratório experimental Cofre + Foco

**Escopo:** Issue #14; perfil isolado `DF-CF-0.1-lab` conforme N-046/N-047 e RFC aprovado.
**Status normativo:** implementação e evidência são **EXPERIMENTAIS**. N-042 continua RATIFIED apenas como direção; N-043 continua CANDIDATE para regras finais; N-045 e as questões O-17..O-21 continuam OPEN.
**Baseline preservada:** `DF-SYM-0.1`, solver P1B, P1A–P1C, P2A e seus artefatos históricos não foram reescritos.
**Não é evidência:** não houve sessão humana, multiplayer, baralho físico, balanceamento final ou recomendação de produto ratificada.

## 1. Implementação e contrato experimental

O motor puro está em `@nocte/engine/cofre-foco`, separado do export baseline `@nocte/engine`. O identificador de regra é `DF-CF-0.1-lab`; usa quatro cartas iniciais mais uma carta aberta no Cofre, dealer S17 com peek natural, 3 Focos por Noite, Manobra=1 e Leitura=2. A janela começa após composição e peek negativo. Leitura é privada ao jogador solo e precede Manobra; cada uma pode ocorrer uma vez por rodada. Foco não regenera e saldo restante expira ao fim/abandono.

Naturais da composição ficam fixados antes do peek. Ás+10 obtido por Manobra é 21 comum, sem bônus natural, e fica automaticamente em stand. Dealer natural ou duas mãos terminais fecham a janela sem gasto. Manobra só pode trocar uma carta de mão original ainda ativa com a carta do Cofre; a carta retirada volta para o Cofre. A projeção de observador não revela a hole card; a projeção solo só a revela após Leitura válida; cada projeção é clonada para não compartilhar referências com o estado interno.

O motor herda ações, pontuação e modelo de compra infinita com reposição do baseline, sob configuração de regra explícita. O pacote não troca a configuração default nem o comportamento do motor P1A. O simulador usa `EvSolver` P1B para composição e decisões comuns; após Leitura, usa uma heurística hole-aware declarada, não um solver condicional exato.

## 2. Perfis de comparação e políticas

| Perfil | O que varia | Interpretação |
| --- | --- | --- |
| Baseline | DF-SYM-0.1; sem Cofre/Foco | controle P1B, sem gasto de recurso |
| Cofre livre | Manobra livre, sem Leitura/Foco | controle diagnóstico, não regra candidata |
| Foco + Leitura | Foco/Leitura sem Cofre/Manobra | controle diagnóstico; amostra Cofre fica oculta e é inerte sob reposição infinita |
| Cofre + Foco completo | N-046/N-047 | perfil experimental principal |
| B-M | Cofre + Foco + Manobra, sem Leitura | controle de ablação; não é variante normativa |

Cada célula é executada com três políticas de recurso legíveis. **Conserve** usa solver P1B e nunca gasta; **eager** lê quando consegue pagar e manobra quando uma heurística pública de distância a alvo melhora; **horizon** posterga leitura/manobra para a última rodada. Todas otimizam a composição inicial via P1B. `eager` e `horizon` são políticas determinísticas explícitas, não jogadores humanos ou agentes ótimos. O baseline é o controle P1B sem ações extras.

As trajetórias são pareadas por cenário e por streams nomeados: quatro cartas iniciais, dealer up/hole, compras de dealer, Luz, Sombra e Cofre. A lane Cofre é independente para não deslocar sorteios de baseline. “Pareado” significa acoplamento de números aleatórios no modelo com reposição, não equivalência de sapato finito ou fairness multiplayer. Seeds, versões e parâmetros acompanham cada JSON.

## 3. Resultados quantitativos

Unidade: pontos líquidos de confronto por Noite; cada mão começa com exposição 10. Tabelas abaixo mostram a política **eager** e diferença pareada contra baseline sob a mesma seed. Intervalos são IC normal marginal de 95% das diferenças por Noite; comparações compartilham cenários. O n é número de Noites por célula. Valores arredondados a 0,01.

### 3.1 Perfil principal: H=10, 3:2, Foco fixo=3, n=1.000

| Perfil | Média do placar/Noite | Diferença pareada vs baseline (IC 95%) | Vitórias/derrotas/empates contra baseline |
| --- | ---: | ---: | ---: |
| Baseline P1B | 38,30 | referência | 0 / 0 / 1.000 |
| Cofre livre | 32,28 | −6,02 [−8,26; −3,78] | 367 / 511 / 122 |
| Foco + Leitura | 37,97 | −0,33 [−0,87; +0,21] | 122 / 139 / 739 |
| Cofre + Foco completo | 36,98 | −1,32 [−2,26; −0,38] | 288 / 343 / 369 |
| B-M, sem Leitura | 35,17 | −3,13 [−4,60; −1,66] | 356 / 472 / 172 |

No mesmo cenário H=10, o perfil completo superou B-M sob política eager em **+1,81** pontos/Noite [0,48; 3,14], com 436/365/199 Noites ganhas/perdidas/empatadas. A política eager gastou em média 3 Focos/Noite no completo (1 Leitura e 1 Manobra); B-M gastou 3 Manobras. No entanto, a política horizon reverte esse pareamento: completo menos B-M = **−1,20** [−1,76; −0,64], pois conserva orçamento até a última rodada e a Leitura compete com a Manobra pelo saldo. A política conserve coincide exatamente com baseline e expira os 3 Focos. A inversão conforme política mostra interação entre orçamento, timing e heurística; não determina superioridade de uma regra.

A referência de composição/ação do modelo P1B para os mesmos cenários tem média 37,51 pontos esperados por Noite (3,75 por rodada). Este campo é uma referência EV baseline otimizada, copiada entre perfis; **não** é o EV do Cofre + Foco, nem arrependimento relativo a um ótimo com horizonte e recursos.

### 3.2 Sensibilidade ao horizonte e payout

| Configuração | n | Baseline eager | Completo eager | Completo − baseline (IC 95%) |
| --- | ---: | ---: | ---: | ---: |
| H=5, payout 3:2, Foco fixo=3 | 500 | 17,83 | 15,67 | −2,16 [−3,44; −0,88] |
| H=20, payout 3:2, Foco fixo=3 | 500 | 73,67 | 72,51 | −1,16 [−2,48; +0,16] |
| H=10, payout 1:1, Foco fixo=3 | 1.000 | 28,74 | 27,47 | −1,27 [−2,22; −0,33] |

### 3.3 Controle diagnóstico de orçamento proporcional

O controle de pesquisa separado usa `round(3 × H / 10)` Focos: 2 em H=5 e 6 em H=20. **Não** altera N-046 (fixo=3). Em H=5, o perfil completo eager coincide com Foco+Leitura (17,41 vs baseline 17,83; Δ −0,42 [−1,18; +0,34]): após Leitura não resta Foco para Manobra. Em H=20, completo eager teve 69,73 vs baseline 73,67 (Δ −3,94 [−5,73; −2,15]); completo menos B-M = +1,46 [−1,35; +4,27], intervalo compatível com ausência de diferença sob esta amostra.

### 3.4 Interpretação sem promoção normativa

Os dados favorecem leitura cautelosa. Sob políticas implementadas, o gasto em Cofre/Manobra não melhorou o placar agregado sobre o baseline; a Leitura isolada teve resultado próximo do baseline em H=10, enquanto a combinação variou conforme política e horizonte. A heurística simples de Manobra do controle Cofre livre teve desempenho marcadamente pior, sinal de que “carta aberta + troca frequente” não basta e que a heurística ainda precisa ser substituída por decisão matemática apropriada antes de inferir valor estratégico. O perfil completo vs B-M muda de sinal entre eager e horizon: o benefício da informação depende da política de uso e de como a Leitura consome o orçamento.

Isto **não** prova que regras tornam o jogo pior, que a habilidade é dominada ou que existe/não existe ótima estratégia. O teste usa agentes incompletos: a composição otimiza apenas o modelo P1B anterior à habilidade, e a decisão após Leitura é uma heurística. Os placares misturam habilidade de política, variância e regra experimental. N-045 permanece OPEN.

## 4. Reprodução e artefatos

Com Node >=22 e pnpm conforme `packageManager` na raiz:

```powershell
pnpm install --frozen-lockfile
pnpm cofre-foco -- --seed nocte-p2b-e-h10-main-v1 --nights 1000 --horizon 10 --payout 3:2 --budget fixed-3 --out ../../lab/results/p2b-e-fixed-h10-3to2-n1000.json
```

Artefatos congelados desta entrega:

| Arquivo | Seed | Noites × horizonte | Payout | Orçamento |
| --- | --- | ---: | --- | --- |
| `lab/results/p2b-e-fixed-h10-3to2-n1000.json` | `nocte-p2b-e-h10-main-v1` | 1.000 × 10 | 3:2 | fixo 3 |
| `lab/results/p2b-e-fixed-h10-1to1-n1000.json` | `nocte-p2b-e-h10-main-v1` | 1.000 × 10 | 1:1 | fixo 3 |
| `lab/results/p2b-e-fixed-h5-3to2-n500.json` | `nocte-p2b-e-h5-main-v1` | 500 × 5 | 3:2 | fixo 3 |
| `lab/results/p2b-e-fixed-h20-3to2-n500.json` | `nocte-p2b-e-h20-main-v1` | 500 × 20 | 3:2 | fixo 3 |
| `lab/results/p2b-e-proportional-h5-3to2-n500.json` | `nocte-p2b-e-h5-main-v1` | 500 × 5 | 3:2 | proporcional=2 (diagnóstico) |
| `lab/results/p2b-e-proportional-h20-3to2-n500.json` | `nocte-p2b-e-h20-main-v1` | 500 × 20 | 3:2 | proporcional=6 (diagnóstico) |

Para os outros arquivos, repita o comando ajustando `--horizon`, `--nights`, `--payout`, `--budget` e caminho de saída conforme a tabela. Campos `execution.elapsedMs` e `execution.node` são metadados não determinísticos; o objeto `result` é determinístico para a mesma versão e parâmetros.

## 5. Testes e garantias

- Motor: sigilo pré-peek, privacidade após Leitura paga, projeção destacada do estado, composição/naturais, elegibilidade e atomicidade da troca, conservação das cinco cartas, janela após natural/terminalidade, 21 sem bônus, ações subsequentes, dupla, orçamento entre rodadas/expiração e abandono. A propriedade de conservação é exercitada em 200 casos gerados.
- Simulador: replay byte a byte para mesmos parâmetros, cenários emparelhados, todas as células/perfis, conservação de Foco, referência EV e limites de horizonte/amostra.
- CLI: validação dos argumentos, saída reprodutível e execução apenas quando invocado como entrypoint.
- Regressão baseline: teste de lane `cofre` independente; import de subpath dedicado sem mudar export principal.

**Validação local deste checkout:** `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test` (16 arquivos, 114 testes aprovados), `pnpm build` e `pnpm --filter @nocte/web test:e2e` (1 cenário) passaram. Uma primeira execução concorrente de testes teve timeouts em testes preexistentes de auditoria P1C/CLI P1B; repetindo a suite isoladamente, os 114 passaram. A CI deve ser conferida separadamente no SHA publicado.

## 6. Limitações e próximo gate

1. Modelo com reposição infinita; sem sapato físico, espelho multiplayer ou análise de fairness/informação entre participantes.
2. Não existe solver exato de horizonte finito para orçamento compartilhado, nem benchmark de regret contra esse oráculo.
3. Composição inicial usa EV de DF-SYM-0.1; pós-Leitura usa uma heurística explícita. A heurística de Manobra também é de alvo/distância e não calcula EV contrafactual integral.
4. ICs são normais marginais das diferenças pareadas, sem ajuste de multiplicidade; comparações correlacionadas e sementes selecionadas para reprodução, não pool humano.
5. Políticas não são pessoas. Não mede aprendizado, clareza, diversão, repetição, fairness percebida ou adequação competitiva.
6. Os controles de custo zero e ablação servem apenas para decomposição laboratorial; não são propostas aprovadas de regra.

Próxima fase recomendada: validar implementação com revisão independente de regras/fluxo, depois construir o solver condicional que otimiza Read e Manobra sob horizonte e budget de Focus, e somente então congelar uma comparação humana consentida em protocolo próprio. Nenhuma adoção em P2A, multiplayer, economia, regras permanentes ou decisão de balanceamento é recomendada com estes resultados isoladamente.
