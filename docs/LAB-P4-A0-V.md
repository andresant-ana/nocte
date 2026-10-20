# NOCTE-P4-A0-V — validação offline da banca A0.1

**Issue:** #30 • **Status:** evidência computacional EXPERIMENTAL, sem ratificação de design ou balanceamento.
**Perfil:** `BANKROLL-LAB-A0-0.1` sobre `DF-CF-0.1-lab`; configuração aprovada para experimento continua `B₀=150`, `H=10`, exposição 10 por mão e reserva 40.
**Decisões preservadas:** N-009, N-012, N-021, N-038, N-048, N-050, N-052, N-053 e N-054. Nenhuma decisão muda de status.

## Pergunta e método

Qual é a frequência modelada de transição para prática gratuita sob saldos diferentes e políticas legais de jogo, e como essa camada contábil se relaciona com score e Foco? A simulação reusa o motor Cofre + Foco e solver P2B-F. Ela gera uma trajetória completa de 5/10/20 rodadas por política e Noite; então executa a mesma sequência de `round.score` em quatro ledgers de sensibilidade (`B₀=60,100,150,200`). O saldo nunca é uma entrada da política nem muda ação, RNG, Foco ou `match_points`.

O principal é 1.000 Noites, 10 rodadas, com payout natural 3:2 e sensibilidade 1:1. O treino da política intertemporal usa 512 cenários por estágio de horizonte, em domínio de seed separado da avaliação. Seeds raiz: `nocte-p4-a0-v-20261019`; prefixos internos ficam registrados nos JSON. Streams nomeados SHA-256 fornecem cenários e ações reproduzíveis.

Políticas, sem alegar comportamento humano ou ótimo global:

| Política | Regra computacional |
| --- | --- |
| `conserve` | Composição/ações P1B condicionais ao estado; não usa Leitura nem Manobra e deixa os três Focos expirarem. |
| `myopic` | Solver exato de rodada P2B-F com valor de continuação zero; escolhe gastos pelo EV da rodada atual. |
| `intertemporal` | Solver exato de rodada com continuação sample-average Bellman P2B-F treinada em separado; aproxima valor do Foco restante. |

Contagens de prática usam intervalo de Wilson 95%. Médias de score, banca final e rodadas usam IC normal marginal 95%. Quantis bancários são quantis empíricos (P05/P25/P50/P75/P95), sem intervalo bootstrap. O período de confiança do score é por Noite; política e payout compartilham cenários, portanto comparações são pareadas e correlacionadas. Nenhum intervalo tem ajuste de multiplicidade.

## Resultados — payout 3:2, H=10, n=1.000

### Score e Foco por política

| Política | `match_points` médio/Noite [IC95%] | Variância de score | Foco médio gasto (de 3) | Diferença pareada vs conservar [IC95%] |
| --- | ---: | ---: | ---: | ---: |
| Conservar | 37,18 [33,43; 40,94] | 3.669,17 | 0,000 | controle |
| Myopic | 44,18 [40,40; 47,97] | 3.731,54 | 3,000 | +7,00 [6,03; 7,97] |
| Intertemporal | 58,43 [54,57; 62,29] | 3.885,32 | 2,872 | +21,25 [19,78; 22,71] |

Intertemporal menos myopic foi +14,25 pontos/Noite [12,71; 15,78] no mesmo conjunto de avaliação. Isso compara políticas de solver sob as regras Cofre + Foco experimentais; não é vantagem causada pela banca, pois as duas recebem a mesma contabilidade A0.

### Efeito do saldo inicial na passagem para prática

Cada célula mostra `probabilidade de pelo menos uma rodada de prática (IC Wilson 95%) / fração média de rodadas financiadas`.

| `B₀` de sensibilidade | Conservar | Myopic | Intertemporal |
| ---: | ---: | ---: | ---: |
| 60 | 36,2% [33,3; 39,2] / 76,8% | 28,0% [25,3; 30,9] / 82,8% | 27,8% [25,1; 30,7] / 81,0% |
| 100 | 7,7% [6,2; 9,5] / 96,8% | 6,7% [5,3; 8,4] / 97,2% | 5,6% [4,3; 7,2] / 97,3% |
| **150** | **1,0% [0,5; 1,8] / 99,8%** | **0,6% [0,3; 1,3] / 99,9%** | **0,7% [0,3; 1,4] / 99,8%** |
| 200 | 0,0% [0,0; 0,4] / 100,0% | 0,0% [0,0; 0,4] / 100,0% | 0,0% [0,0; 0,4] / 100,0% |

Em 1.000 Noites, a configuração experimental aprovada de 150 quase sempre financiou as dez rodadas para estas políticas. Isso é uma baixa frequência modelada no perfil, não garantia de que a prática seja rara para pessoas ou outras políticas. Em `B₀=60`, a prática ocorre em cerca de 28–36% das Noites, e em `B₀=100`, em cerca de 6–8%.

### Banca final no payout 3:2

| Política | B0=60 | B0=100 | B0=150 | B0=200 |
| --- | ---: | ---: | ---: | ---: |
| Conservar | 89,9 [86,1; 93,7] (P05/P50/P95: 20/85/200) | 136,2 [132,4; 140,0] (30/140/240) | 187,2 [183,4; 190,9] (85/190/290) | 237,2 [233,4; 240,9] (135/240/340) |
| Myopic | 98,7 [94,9; 102,5] (20/100/205) | 143,1 [139,3; 147,0] (30/145/245) | 194,2 [190,4; 198,0] (90/195/295) | 244,2 [240,4; 248,0] (140/245/345) |
| Intertemporal | 108,7 [104,5; 112,9] (20/115/220) | 156,6 [152,6; 160,6] (30/160/260) | 208,3 [204,5; 212,2] (105/210/310) | 258,4 [254,6; 262,3] (155/260/360) |

As células mostram média final [IC normal 95%] (quantis P05/P50/P95), em fichas fictícias. O zero de banca ocorreu em no máximo 0,2% nesta amostra por política/saldo; para eventos raros, ver contagens e limites Wilson nos JSON. A banca final não é score nem skill.

## Sensibilidade do payout natural 1:1

| Política | Score médio [IC95%] | Foco médio gasto | Prática B0=60 | Prática B0=100 | Prática B0=150 | Prática B0=200 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Conservar | 28,37 [24,68; 32,06] | 0,000 | 38,2% [35,2; 41,3] | 8,2% [6,7; 10,1] | 1,0% [0,5; 1,8] | 0,0% [0,0; 0,4] |
| Myopic | 35,34 [31,62; 39,06] | 3,000 | 29,4% [26,7; 32,3] | 6,9% [5,5; 8,6] | 0,6% [0,3; 1,3] | 0,0% [0,0; 0,4] |
| Intertemporal | 49,56 [45,76; 53,36] | 2,865 | 29,2% [26,5; 32,1] | 6,0% [4,7; 7,6] | 0,7% [0,3; 1,4] | 0,0% [0,0; 0,4] |

Diferenças pareadas de score contra `conserve`: myopic +6,97 [5,99; 7,95]; intertemporal +21,19 [19,72; 22,66]; intertemporal contra myopic +14,22 [12,68; 15,76]. Payout 1:1 é só sensibilidade da configuração experimental versionada, sem mudança de regra aprovada.

## Sensibilidade ao horizonte — payout 3:2

| Horizonte / amostra | Política | Score médio [IC95%] | Foco gasto | Prática B0=60 | Prática B0=150 |
| --- | --- | ---: | ---: | ---: | ---: |
| H=5 / n=500 | Conservar | 18,03 [14,41; 21,65] | 0,00 | 24,4% | 0,0% |
| H=5 / n=500 | Myopic | 25,51 [21,78; 29,24] | 2,99 | 19,4% | 0,0% |
| H=5 / n=500 | Intertemporal | 34,07 [30,28; 37,86] | 2,70 | 18,8% | 0,0% |
| H=20 / n=500 | Conservar | 75,67 [68,19; 83,15] | 0,00 | 43,2% | 3,2% |
| H=20 / n=500 | Myopic | 83,93 [76,38; 91,48] | 3,00 | 36,0% | 2,6% |
| H=20 / n=500 | Intertemporal | 102,02 [94,55; 109,49] | 2,95 | 36,2% | 1,4% |

Com B0=150, nenhuma política atingiu prática no horizonte curto H=5; H=20 elevou a prática para 1,4–3,2%. A amostra H=20 tem menor precisão que a principal. Isso é sensibilidade de modelo à duração, não autorização para expor H=5/20 como opções de A0.

## Integridade e verificações

- A0.1 mantém reserva 40, financia saldo exatamente 40, liquida `round.score` do motor uma vez e não permite saldo negativo. Ledgers abaixo do limiar tornam-se prática irreversível; scores posteriores não alteram saldo.
- Cada caminho bancário é aplicado aos scores resolvidos pelo motor, sem recalcular liquidação. As quatro bancas de cada política compartilham exatamente a mesma sequência rodada a rodada.
- A comparação de score sem banca é identidade de contabilidade: média e variância de `match_points` são invariáveis à escolha de `B₀`; Foco/decisões/RNG também não recebem saldo. O modo sem banca não é reexecutado com outro algoritmo para fabricar uma comparação.
- O teste E2E Chromium fixa os draws somente dentro do contexto Playwright. Sequência: 150→110→70→40; ronda financiada iniciada em 40 perde 40 e deixa zero; a rodada seguinte vira prática. Confere saldo congelado, aumento de `match_points` na prática e Foco 3/3 conservado. Não há fixture/seed exposto na aplicação.
- Testes automatizados cobrem reprodutibilidade, IC Wilson, validação de CLI, faixas de saldo e conservação de rodadas/Foco.

## Reprodução

Na raiz (Node ≥22, pnpm 12.9.1):

```powershell
pnpm install --frozen-lockfile
pnpm bankroll-a0-validation -- --seed nocte-p4-a0-v-20261019 --nights 1000 --horizon 10 --payout 3:2 --training 512 --out ../../lab/results/p4-a0-v-h10-3to2-n1000.json
pnpm bankroll-a0-validation -- --seed nocte-p4-a0-v-20261019 --nights 1000 --horizon 10 --payout 1:1 --training 512 --out ../../lab/results/p4-a0-v-h10-1to1-n1000.json
pnpm bankroll-a0-validation -- --seed nocte-p4-a0-v-20261019-h5 --nights 500 --horizon 5 --payout 3:2 --training 512 --out ../../lab/results/p4-a0-v-h5-3to2-n500.json
pnpm bankroll-a0-validation -- --seed nocte-p4-a0-v-20261019-h20 --nights 500 --horizon 20 --payout 3:2 --training 512 --out ../../lab/results/p4-a0-v-h20-3to2-n500.json
```

Os dois JSON congelam o relatório completo, parâmetros, comparações pareadas, incerteza e limitações. `execution.elapsedMs`/Node são metadados ambientais e não fazem parte do resultado científico determinístico.

## Limitações e conclusão

1. O saldo não modifica escolhas. Portanto os dados estimam a frequência em que a regra `B<40` troca uma trajetória já definida para prática; não capturam pressão, aversão à perda, mudança de estratégia ou abandono humano.
2. Há somente 1.000 Noites por célula. O limite superior Wilson observado para nenhuma prática em B0=200 é ≈0,4%, não zero populacional. Eventos de saldo exato zero são raros e incertos.
3. `myopic` e `intertemporal` são modelos, não agentes humanos; a continuação intertemporal é aproximada por Bellman sample-average. O motor usa ranks infinitos com reposição, S17 e regras CF experimentais.
4. Médias de saldo agregam modos financiado e prática congelada; variância pode ser assimétrica. IC normal é aproximação da média, quantis são amostrais e intervalos são marginais sem ajuste de multiplicidade.
5. Sem usuários, baralho finito, mirror multiplayer, servidor, persistência ou teste de decisão/compreensão. Nenhum resultado identifica diversão, retenção, fairness percebida ou banca balanceada.
6. O ganho de placar do agente é da política Cofre + Foco dentro do motor; A0 não causa ganho de skill. O score e Foco permanecem independentes da banca por construção.

**Leitura provisória:** o saldo inicial é um controle forte da frequência de prática. B0=150 financiou ≥99,8% das rodadas esperadas para as três políticas nesta amostra, enquanto B0=60 reduziu a fração a ~76–83%. A A0.1 aprovada pode não produzir a transição em muitas Noites de dez rodadas sob agentes competentes; isso é evidência para planejar playtests mais longos/observar ocorrência espontânea, não autorização para reduzir B0, alterar exposição ou iniciar A1. N-053/N-054 ficam EXPERIMENTAL somente para A0.1; nenhuma recomendação de mudança numérica está ratificada.
