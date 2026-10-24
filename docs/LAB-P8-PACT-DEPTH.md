# NOCTE-P8-S — Auditoria de profundidade estratégica dos Pactos

**Status:** estudo offline EXPERIMENTAL do catálogo `PACT-BOOK-0.1`. Não altera regras nem ratifica balanceamento. N-058 permanece EXPERIMENTAL. Nenhum dado humano foi coletado.

## Escopo e cobertura

O laboratório executa Noites completas de dez rodadas pelo motor puro `@nocte/engine` e suas transições Cofre + Foco e PactBook. Resultados de mãos e score vêm do motor. A1a é um overlay contábil analítico em ticks de meia ficha, aplicando seu contrato documentado sem alimentar score, Foco ou decisões de jogo. São comparados os dois Pactos de cada família e a recusa; também há um seletor situacional heurístico. O segundo Ato recebe uma oferta real, determinística e sem reposição; nas células forçadas ele é recusado para isolar a família do Ato II.

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

Coleta corrigida: **64.800 Noites modelo** (100 por célula; 648 células), 648.000 rodadas e 10.000 sementes no audit independente das ofertas. Todas as 18 entradas do catálogo tiveram 1.800 Noites com assinatura (3 políticas × 3 stakes × 2 payouts × 100) e ao menos um evento de uso de Privilégio. O total de eventos por Pacto está no JSON; isso mede execução das rotinas, não utilidade estratégica de cada uso. Não houve família repetida nas 10.000 ofertas pareadas do audit.

Resultados auditáveis completos — médias, desvios, erros-padrão, IC95%, pares A/B/recusa, banca, score, Foco, Renúncias, uso/expiração de Privilégios, frequências de ações e desacordo em estados comuns — estão em [`lab/results/p8-pact-depth-v1.json`](../lab/results/p8-pact-depth-v1.json).

### Síntese pareada

| Família (A / B) | A − recusa, 3:2 | B − recusa, 3:2 | A − recusa, 1:1 | B − recusa, 1:1 |
|---|---:|---:|---:|---:|
| Revelação (Véu / Farol) | +0,60 [-1,41; 2,61] | +0,55 [-0,21; 1,31] | +0,60 [-1,41; 2,61] | +0,50 [-0,31; 1,31] |
| Domínio (Ferro / Ímpeto) | +3,00 [0,34; 5,66] | -0,80 [-2,70; 1,10] | +2,80 [0,06; 5,54] | -0,90 [-2,85; 1,05] |
| Foco (Vigília / Fulgor) | +4,80 [2,62; 6,98] | +4,60 [2,35; 6,85] | +4,40 [2,18; 6,62] | +4,60 [2,31; 6,89] |
| Sacrifício (Bastião / Reflexo) | -6,10 [-9,02; -3,18] | -0,60 [-3,42; 2,22] | -6,10 [-9,03; -3,17] | -0,40 [-3,28; 2,48] |
| Tempo (Penhor / Arremate) | +1,30 [0,23; 2,37] | +1,10 [-0,08; 2,28] | +1,10 [0,18; 2,02] | +0,90 [-0,15; 1,95] |
| Destino (Ordem / Caos) | +1,80 [0,32; 3,28] | +4,40 [2,72; 6,08] | +1,70 [0,22; 3,18] | +4,40 [2,72; 6,08] |
| Vínculo (Cisão / Balança) | -2,40 [-6,78; 1,98] | +0,60 [-0,80; 2,00] | -1,60 [-5,96; 2,76] | +1,30 [-0,08; 2,68] |
| Fortuna (Lastro / Audácia) | 0,00 [0; 0] | +1,20 [-0,50; 2,90] | 0,00 [0; 0] | +1,20 [-0,50; 2,90] |
| Escolha (Segunda Chance / Juramento) | +0,60 [-1,11; 2,31] | -2,70 [-5,22; -0,18] | +0,60 [-1,11; 2,31] | -2,80 [-5,38; -0,22] |

Esta tabela é a célula `myopic` / aposta fixa 1, e mostra diferença **pareada** de score estratégico em relação à recusa, não lucro. O intervalo é IC95% normal da diferença sobre 100 Noites pareadas. Nesta fatia, 3:2 e 1:1 permanecem próximos; o pagamento natural raro e a amostra não distinguem amplamente os perfis. A tabela não resume a heterogeneidade entre políticas e apostas; consulte todas as células JSON. Intervalos são marginais, sem ajuste de multiplicidade.

### Leituras preliminares

- Não há evidência de uma ordenação universal: os sinais variam por par e política. Na fatia myopic/fixa 1, os ICs de 3:2 excluem zero em sentido positivo para Ferro, Vigília, Fulgor, Penhor, Ordem e Caos, e em sentido negativo para Bastião e Juramento; os demais efeitos da tabela cruzam zero ou são exatamente zero. Isto é exploratório: três políticas artificiais, 100 sementes por célula, muitos recortes e nenhuma correção de multiplicidade.
- Recusar foi melhor que Bastião e Juramento nessa fatia, mas os outros sinais dependem do par; a recusa segue sem bônus ou penalidade próprios. A presença de ICs que cruzam zero não prova equivalência.
- O controle conservador, que não usa Privilégios nem paga Foco, reproduz o controle sem Pacto quando a Renúncia não o afeta; Bastião é a exceção: exigir uma Compra antes de Parar reduziu o score em -12,30 [-15,55; -9,05] (3:2), com 1,61 bloqueios de Parar por Noite. Ferro e Juramento, cujas Renúncias fixam Luz e esse agente nunca Dobra, ficaram exatamente em zero contra recusa. Ferro foi positivo para o agente myopic (+3,00 [0,34; 5,66] em 3:2; +2,80 [0,06; 5,54] em 1:1), mas bloqueou em média 0,79 tentativas legais de Dobrar por Noite; o agente ainda dobrou 3,23 vezes com Ferro versus 3,81 no controle sem Pacto. Manobra paga e os demais efeitos são usados; não há evidência para reduzir esse resultado à Renúncia irrelevante. A percepção individual do fundador continua observação n=1.
- A paridade de ação entre myopic e conservador é esparsa: na célula recusa/fixa 1/3:2 foram compartilhados 0,60 estados por Noite e 0,18 ações diferiram por Noite; o desacordo agregado nesses estados foi 30% (189 de 900 pares família-Noite continham algum estado compartilhado). Portanto a taxa percentual isolada é frágil e não quantifica domínio geral. O intertemporal também é uma heurística de timing, não um solver global de planejamento.
- **Tempo mudou com a correção.** Antes, o agente não conseguia executar Manobras pagas quando não havia Privilégio gratuito, fazendo Penhor/Arremate parecerem sem efeito. Agora, no Ato II, a política myopic executou em média **0,22 Manobra paga por Noite** sob cada Pacto (IC95% [0,12; 0,32]; 22 ações em 100 Noites); no total da Noite pagou 1,64 Manobras em média. A Leitura paga foi executada 0,68 vezes/Noite em média (1,36 pontos de Foco consumidos); a fixture de seleção verifica que ela continua disponível quando a carga gratuita não está mais elegível. Com payout 3:2, Penhor ficou em +1,30 [0,23; 2,37] de score vs recusa e +0,26 [0,05; 0,47] ticks de banca; Arremate em +1,10 [-0,08; 2,28] de score e +0,22 [-0,02; 0,46] ticks. Em 1:1, respectivamente +1,10 [0,18; 2,02] e +0,22 [0,04; 0,40] ticks para Penhor; +0,90 [-0,15; 1,95] e +0,18 [-0,03; 0,39] ticks para Arremate. Penhor tem sinal positivo nesta amostra myopic; Arremate não separa de zero. Os ICs são pareados sobre 100 Noites, e não demonstram causalidade universal, efeito marginal isolado de Selar/segundo Cofre ou dominância. O resultado não permite manter a antiga conclusão de “efeito exatamente nulo”.
- A Manobra paga compete pelo Foco e pelo valor da mão com Selar/gerar segundo Cofre. Em ambas as opções Tempo, a Manobra paga ocorreu enquanto o Pacto estava vigente, então a nova comparação não depende de um agente que nunca usa essa habilidade. Ainda é necessário isolar elegibilidade e estado do Cofre para separar o valor marginal do Privilégio temporal do restante da estratégia.
- Lastro continua em score zero na fatia fixa 1 por construção do ledger: sua principal consequência é a banca/seguro; Audácia +1,20 [-0,50; 2,90]. Esses valores não devem ser confundidos com lucro nem com classificação estratégica; verificar saldos e stakes variáveis no JSON.

### Recomendações priorizadas

1. **Isolar o valor de Tempo:** criar análise determinística pareada onde o Cofre selado/alternativo muda a decisão ótima/EV, separar o efeito de Manobra paga e reportar decisão, score e banca. Penhor agora tem sinal positivo e Arremate permanece inconclusivo no myopic/fixa 1; não fazer balanceamento com esta amostra.
2. **Estudar sinais contextuais, não médias isoladas:** aumentar a amostra pareada e estratificar por estados elegíveis, Renúncia acionada e valor do Privilégio para Ferro, Vigília, Fulgor, Caos, Bastião e Juramento. Corrigir ou declarar a multiplicidade ao comparar famílias, políticas e métricas.
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

Na raiz do repositório, com Node compatível e pnpm da raiz (a execução de 64.800 Noites levou cerca de 182 s no Node 24.21.0):

```powershell
pnpm install --frozen-lockfile
pnpm pact-depth -- --seed nocte-p8-20261024-a --nights 100 --out lab/results/p8-pact-depth-v1.json
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @nocte/web test:e2e
```

O JSON compacto tem cerca de 2,7 MB e 857 linhas (antes: 4,6 MB e cerca de 173 mil linhas), sem remover células ou métricas. Inclui seed, versões de motor/solver/streams/agente, tamanho de cada célula, eventos de ação paga discriminados e metadados de execução. `elapsedMs` é incidental; os resultados, sem esse campo, são determinísticos para mesmo SHA, seed e amostra.

## Correção metodológica desta revisão

A revisão no PR #49 encontrou que a política myopic condicionava Manobra paga à existência de Privilégio gratuito e bloqueava Leitura paga depois do uso do Privilégio. O agente foi corrigido em `c741fe1`; um teste de regressão cobre seleção paga/consumo/ausência de Privilégio e um teste determinístico confirma a chamada paga de Manobra durante as Noites com Penhor e Arremate, além de Leitura paga no controle e com Véu. O relatório registra separadamente Manobra paga com Pacto vigente e Leitura paga depois de consumir qualquer Privilégio do Pacto. As regras e o motor P7 não foram alterados. A matriz e este relatório foram recalculados após essa correção.

Auditoria adicional não identificou divergência nova de transição: os caminhos especiais chamam as transições Cofre + Foco/PactBook, os previews de Ordem/Juramento são de uma carta consumida pela ação seguinte, e os efeitos de Penhor/Arremate são limitados ao Ato. O laboratório agora conta chamadas de Manobra/Leitura pagas no adaptador junto com o gasto de Foco devolvido pelo motor, e confere que a Manobra paga é executada em estado com Penhor/Arremate vigentes. Limitação: `paidReadAfterPactPrivilegeConsumed` não distingue qual capacidade consumiu o Privilégio; portanto é diagnóstico de sequência, não prova específica de Leitura paga após Leitura gratuita. A fixture de unidade prova a disponibilidade pela regra de seleção em ambas as condições, mas a amostra da célula Véu não exercitou Leitura paga depois de gastar sua Leitura gratuita. Nenhuma diferença foi encontrada que justificasse alterar o motor.

## Limitações

- Políticas computacionais fixas, sem aprendizagem entre partidas, sem prova de ótimo global e sem otimização conjunta de stake e score.
- As heurísticas de composição, timing dos Privilégios e seleção situacional não modelam compreensão ou estratégia humana. O solver exato só cobre decisões ordinárias do estado corrente sob reposição infinita/S17 e informação disponível.
- O estudo forçado isola uma família no Ato II e recusa a oferta do Ato III nas células A/B/recusa. A célula situacional aceita heurísticamente oportunidades nos dois Atos. Não há fatorial de duas escolhas assinadas nem estimativa de todas as interações entre Pactos.
- Sementes pareadas acoplam sequências por lane, mas as lanes divergem após consumos diferentes; não equivalem a baralho físico espelhado.
- O JSON preserva agregados completos por célula (média, desvio, EP, IC95%, mínimo e máximo), não os registros individuais das 64.800 Noites; a reprodução integral exige executar novamente o comando com o mesmo SHA, seed e amostra.
- ICs são normais, marginais, sem correção das muitas famílias/políticas/métricas. A leitura de dominância é exploratória.
- Não há playtest humano, informação populacional, multiplayer, shoe finito, autoridade de servidor, validação de fairness, equilíbrio final, diversão ou retenção.
- Determinismo de oferta serve ao replay, não à segurança contra adulteração/refresh. O modo continua local e experimental.
