# NOCTE-P8-S — Auditoria de profundidade estratégica dos Pactos

**Status:** estudo offline EXPERIMENTAL do catálogo `PACT-BOOK-0.1`. Não altera regras nem ratifica balanceamento. N-058 permanece EXPERIMENTAL. Nenhum dado humano foi coletado.

## Escopo e cobertura

O laboratório executa Noites completas de dez rodadas, com o motor puro `@nocte/engine` e suas transições Cofre + Foco e PactBook. Não há cópia do settlement do jogo. A1a é aplicada como overlay contábil em ticks de meia ficha, sem alimentar score, Foco ou decisões de jogo. São comparados os dois Pactos de cada família e a recusa; também há um seletor situacional heurístico. O segundo Ato recebe uma oferta real, determinística e sem reposição; nas células forçadas ele é recusado para isolar a família do Ato II.

Cada família/Pacto foi avaliado nos cenários da matriz: três políticas × três políticas de stake × dois pagamentos naturais × 100 Noites pareadas. O relatório também traz o seletor situacional. Total: 648 células × 100 Noites = **64.800 Noites modelo**, 648.000 rodadas. A cobertura de aceitação por Pacto e os eventos de uso do Privilégio aparecem em `lab/results/p8-pact-depth-v1.json`; Privilégios sem evento observado são explicitamente listados. “Aceito/testado” não significa que toda condição de acionamento ocorreu em cada Noite.

| Família | Opção A | Opção B | Avaliação computacional |
|---|---|---|---|
| Revelação | Véu | Farol | avaliada; uso de Privilégio e Renúncia discriminados no JSON |
| Domínio | Ferro | Ímpeto | avaliada; inclui auditoria de bloqueios de Dobrar/Manobra |
| Foco | Vigília | Fulgor | avaliada; inclui janelas de uso/indisponibilidade |
| Sacrifício | Bastião | Reflexo | avaliada; condições de bust/transferência podem não ocorrer em toda amostra |
| Tempo | Penhor | Arremate | avaliada; seleção/uso e efeito observado separados |
| Destino | Ordem | Caos | avaliada; previews legais e draws da lane reproduzida |
| Vínculo | Cisão | Balança | avaliada; composição 3+1 e recomposição não concedem natural |
| Fortuna | Lastro | Audácia | avaliada sob stake A1a, reserva e liquidação em ticks |
| Escolha | Segunda Chance | Juramento | avaliada; uso limitado, compromisso e Renúncia permanecem distintos |

## Protocolo

- Versões: catálogo `PACT-BOOK-0.1`; cartas `sha256-counter-rejection-v1`; ação ordinária `dp-infinite-s17-v1`; solver condicional `conditional-round-exact-focus-dp-approx-v1`; agentes `public-state-heuristics-v1`.
- Seeds distintas por domínio de cartas, política e oferta. Os mesmos streams nomeados são reutilizados entre células pareadas. As cartas observadas deixam de ser idênticas após decisões que consomem quantidades diferentes; isso é common-random-number coupling, não replay de cartas iguais após divergência.
- Oferta do Ato II é forçada para cada família completa com a mesma seed da Noite. O Ato III usa o sorteio real sem reposição. Um audit adicional cobre 10.000 seeds de oferta.
- `conservative`: regra de limiar (Parar em 15+, caso contrário Pedir), sem gastar Foco voluntariamente e sem adotar Privilégios.
- `myopic`: EV exato da jogada normal sob informação legal do estado atual; ativa as heurísticas de uso imediato indicadas no código para Privilégios. Não é um solver global dos Pactos.
- `intertemporal`: mesma avaliação tática corrente, com heurística explícita de guardar recursos de uso único até a última oportunidade legal e preservar Foco. Não é Bellman ótimo.
- Stakes são fatores separados: 1, 5 ou máximo variável coberto por saldo. Apostas e `match_points` são medidos em saídas independentes. Os pagamentos naturais 3:2 e 1:1 são calculados em execuções separadas com cartas pareadas.
- IC95% das diferenças pareadas: intervalo normal `média ± 1,96 × erro-padrão` calculado sobre Noites; intervalos marginais, não corrigidos por multiplicidade. Para divergência de ações, uma decisão só entra quando ambos os agentes chegam ao mesmo estado público/legally revealed state.

## Resultados

Coleta final: **64.800 Noites modelo** (100 por célula; 648 células), 648.000 rodadas e 10.000 sementes no audit independente das ofertas. Todas as 18 entradas do catálogo foram exercitadas; cobertura lista zero Pactos não testados e zero Privilégios sem evento de uso. Isso mede execução das rotinas sob as políticas, não utilidade estratégica de cada uso. Não houve família repetida nas 10.000 ofertas pareadas do audit.

Resultados auditáveis completos — médias, desvios, erros-padrão, IC95%, pares A/B/recusa, banca, score, Foco, Renúncias, uso/expiração de Privilégios, frequências de ações e desacordo em estados comuns — estão em [`lab/results/p8-pact-depth-v1.json`](../lab/results/p8-pact-depth-v1.json).

### Síntese pareada

| Família (A / B) | A − recusa, 3:2 | B − recusa, 3:2 | A − recusa, 1:1 | B − recusa, 1:1 |
|---|---:|---:|---:|---:|
| Revelação (Véu / Farol) | +2,30 [0,07; 4,53] | +2,15 [0,34; 3,96] | +2,30 [0,07; 4,53] | +2,10 [0,14; 4,06] |
| Domínio (Ferro / Ímpeto) | +1,40 [-1,26; 4,06] | -2,10 [-3,44; -0,76] | +1,50 [-1,22; 4,22] | -2,20 [-3,55; -0,85] |
| Foco (Vigília / Fulgor) | +6,40 [3,84; 8,96] | +4,90 [2,34; 7,46] | +6,00 [3,46; 8,54] | +4,80 [2,24; 7,36] |
| Sacrifício (Bastião / Reflexo) | -5,80 [-8,82; -2,78] | -0,50 [-3,26; 2,26] | -5,80 [-8,83; -2,77] | -0,30 [-3,12; 2,52] |
| Tempo (Penhor / Arremate) | 0,00 [0; 0] | 0,00 [0; 0] | 0,00 [0; 0] | 0,00 [0; 0] |
| Destino (Ordem / Caos) | +0,80 [-0,19; 1,79] | +6,40 [4,00; 8,80] | +0,70 [-0,28; 1,68] | +6,40 [4,00; 8,80] |
| Vínculo (Cisão / Balança) | -2,90 [-7,11; 1,31] | -0,60 [-1,02; -0,18] | -2,00 [-6,22; 2,22] | +0,20 [-0,28; 0,68] |
| Fortuna (Lastro / Audácia) | 0,00 [0; 0] | 0,00 [-1,25; 1,25] | 0,00 [0; 0] | 0,00 [-1,25; 1,25] |
| Escolha (Segunda Chance / Juramento) | +2,00 [-0,55; 4,55] | -3,50 [-5,68; -1,32] | +2,00 [-0,55; 4,55] | -3,60 [-5,89; -1,31] |

Esta tabela é a célula `myopic` / aposta fixa 1, e mostra diferença **pareada** de score estratégico em relação à recusa, não lucro. O intervalo é IC95% normal da diferença sobre 100 Noites pareadas. 3:2 e 1:1 resultaram quase idênticos nesta célula: o pagamento natural raro e a amostra não separaram os perfis. Não resume a heterogeneidade entre políticas e apostas; consulte todas as células JSON. Intervalos são marginais, sem ajuste de multiplicidade.

### Leituras preliminares

- Não há evidência de uma ordenação universal: Domínio, Sacrifício e Escolha mostram diferenças entre A e B, enquanto os efeitos variam entre conservador, imediatista e intertemporal (ver JSON por política). Na célula myopic, Vigília e Caos tiveram ganhos médios positivos com IC que não cruza zero; Ímpeto, Bastião e Juramento foram negativos. São sinais para investigação, não vereditos de dominância: três políticas artificiais, 100 sementes e comparações múltiplas.
- Recusar permaneceu melhor que algumas escolhas no agente myopic, incluindo Bastião, Balança e Juramento; em outros Pactos a diferença ficou indistinguível de zero. A alternativa tem valor contextual e nenhum bônus/penalidade próprio.
- Sob a política conservadora, que nunca dobra e não usa Privilégios, a maioria das escolhas reproduziu o controle; Bastião ainda teve diferença de score -12,3 [ -15,5; -9,1 ], coerente com a Renúncia de não poder Parar sem Compra. Para Ferro, o agente myopic teve +1,4 [-1,3; 4,1] contra recusa e dobrou em média 2,95 vezes versus 3,48 no controle: a Manobra gratuita pode compensar parte do custo, mas esta amostra não demonstra vantagem significativa. É consistente com a hipótese qualitativa do fundador, não a prova.
- Nos estados públicos comparáveis, conservador e myopic escolheram ações ordinárias diferentes em média 35,5% das vezes (média de 3,94 estados comuns por Noite nesta fatia). Intertemporal e myopic não divergiram nessas ações ordinárias compartilhadas: a política intertemporal altera sobretudo o timing de recursos, e não é um solver de planejamento global.
- Tempo apresentou uso registrado do Privilégio mas diferença exatamente zero de score e frequências médias idênticas de Pedir/Parar/Dobrar em todas as sementes na fatia fixa-1; isso não demonstra irrelevância geral, mas é um sinal de que Penhor/Arremate não alteraram decisões/resultado observáveis neste experimento. Recomenda-se auditar essa interação e projetar cenários em que o Cofre selado ou a escolha entre candidatos mude a política antes de qualquer balanceamento.
- Lastro/Audácia também ficaram próximos de zero em score nesta fatia fixa-1. Seu valor principal pode ser contábil e dependente da política de stake; os resultados de banca e as demais stakes precisam ser examinados separadamente, sem confundir lucro com skill score.

### Recomendações priorizadas

1. **Auditar Tempo antes de balancear:** adicionar cenários determinísticos em que um Cofre selado ou a escolha entre candidatos muda o valor/ação; confirmar impacto em mão, score e banco, além do contador de uso. Se não alterar escolhas sob nenhuma política competente, revisar o contrato somente em futura decisão aprovada.
2. **Estudar sinais contextuais, não médias isoladas:** aumentar a amostra pareada e estratificar por estados elegíveis, Renúncia acionada e valor do Privilégio para Vigília, Caos, Bastião e Juramento. Corrigir ou declarar a multiplicidade ao comparar várias famílias, políticas e métricas.
3. **Medir planejamento intertemporal real:** substituir a heurística de atraso por uma política de horizonte finito ou busca roll-out sobre estados públicos e oportunidades restantes; comparar decisão de gastar/guardar contra myopic em estados idênticos e reportar custo computacional.
4. **Levar hipóteses a playtest humano instrumentado:** somente depois de confirmar transições/efeitos, investigar compreensão, variedade de decisões e preferência por aceitar/recusar. Não usar este estudo de agente como evidência de diversão ou retenção.

Nenhuma recomendação autoriza mudança de regras ou balanceamento. Os itens 1–3 são investigações de modelo; o item 4 depende de estudo humano consentido.

### Leituras e candidatos para investigação

1. A preferência global entre A/B/recusa e a frequência de inversões contextuais são exploratórias; exigir IC pareado e recortes antes de propor patch.
2. Compare `renunciationBlocks` com a frequência de Privilégios usados/expirados. Um privilégio usado raramente, uma renúncia quase nunca acionada, e uma escolha de pacto nunca selecionada são diagnósticos distintos.
3. Ferro deve ser julgado por política: comparar seu custo de Dobrar efetivamente bloqueado contra a Manobra gratuita e examinar o agente conservador, que raramente dobra. O feedback individual do fundador continua sendo observação n=1, não evidência populacional.
4. Desacordo de ações reporta somente estados públicos compartilhados. Baixa cobertura comum após divergência não significa concordância estratégica.
5. Nenhum balanceamento foi alterado nesta coleta. Qualquer ajuste requer versão experimental e avaliação separada.

## Reproduzir

Na raiz do repositório, com Node compatível e pnpm da raiz:

```powershell
pnpm install --frozen-lockfile
pnpm pact-depth -- --seed nocte-p8-20261024-a --nights 100 --out lab/results/p8-pact-depth-v1.json
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @nocte/web test:e2e
```

O JSON inclui a seed, versões de motor/solver/streams/agente, tamanho de cada célula e metadados de execução. `elapsedMs` é incidental; resultados, sem esse campo, são determinísticos para mesmo SHA, seed e amostra.

## Limitações

- Políticas computacionais fixas, sem aprendizagem entre partidas, sem prova de ótimo global e sem otimização conjunta de stake e score.
- As heurísticas de composição, timing dos Privilégios e seleção situacional não modelam compreensão ou estratégia humana. O solver exato só cobre decisões ordinárias do estado corrente sob reposição infinita/S17 e informação disponível.
- O estudo forçado isola uma família no Ato II e recusa a oferta do Ato III nas células A/B/recusa. A célula situacional aceita heurísticamente oportunidades nos dois Atos. Não há fatorial de duas escolhas assinadas nem estimativa de todas as interações entre Pactos.
- Sementes pareadas acoplam sequências por lane, mas as lanes divergem após consumos diferentes; não equivalem a baralho físico espelhado.
- ICs são normais, marginais, sem correção das muitas famílias/políticas/métricas. A leitura de dominância é exploratória.
- Não há playtest humano, informação populacional, multiplayer, shoe finito, autoridade de servidor, validação de fairness, equilíbrio final, diversão ou retenção.
- Determinismo de oferta serve ao replay, não à segurança contra adulteração/refresh. O modo continua local e experimental.
