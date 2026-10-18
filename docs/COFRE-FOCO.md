# NOCTE — Cofre + Foco: direção canônica e contrato para experimentação

**Data:** 2026-10-18 (Brasília)  
**Decisão principal:** **N-042 — RATIFIED (DIREÇÃO DE PRODUTO)**  
**Parâmetros e ações exemplificativas:** **N-043 — CANDIDATE**  
**Escopo adiado:** **N-044 — DEFERRED**  
**Balanceamento/viabilidade:** **N-045 — OPEN**  
**Implementação:** **NÃO INICIADA / NÃO AUTORIZADA NESTE ADITIVO.**  
**Baseline de comparação:** DF-SYM-0.1, motor P1A e laboratório P1B/P1C; P2A segue independente.

## 1. Motivação e objetivo ratificados

Na experiência inicial pessoal com o protótipo P2A, o fundador considerou o jogo divertido, porém ainda semelhante ao blackjack normal e potencialmente monótono. Isso complementa o indício P1C de que regras curtas podem capturar grande parte da vantagem matemática. **É feedback informal (n=1), não estudo humano consentido P2A concluído.**

Aprovado: o próximo ramo de design de Duas Faces deve explorar **uma carta adicional de reserva — Cofre — e um recurso limitado — Foco — que conecte decisões dentro da rodada e durante uma Noite**. As novas escolhas devem exigir sacrifícios e priorização. Guardar Foco também é uma decisão legítima.

### Invariantes de produto já aprovados

- **Cofre** é uma reserva de carta, separada inicialmente das duas mãos Luz/Sombra, que abre possibilidades reais de alterar uma mão; o exemplo visual considera a **quinta carta**.
- **Foco** é um recurso finito, compartilhado entre oportunidades de uso e rodadas de uma Noite — não é o saldo de créditos do jogador. A intenção é que a opção de gastar tenha **custo de oportunidade futuro**, inclusive a opção de poupar.
- As possibilidades iniciais de uso a testar incluem **manipulação controlada de cartas** e **obtenção limitada de informação**; suas definições normativas permanecem abertas.
- **Não** usar Foco como vantagem comprável, gerável ilimitadamente ou convertível em dinheiro/créditos negociáveis. O leaderboard futuro continua independente do saldo acumulado.
- O jogo deve continuar compreensível para iniciantes, competitivo apenas após validação de fairness, e compatível com a identidade Art Déco/noir existente.
- Continuar usando a versão sem esses recursos como **grupo de comparação**, sem reescrever dados ou reinterpretar resultados de P1A–P1C.

**Aprovação de direção ≠ aprovação de valores exatos, regra de estado ou ordem de ações.**

## 2. Mecânicas candidatas do primeiro protótipo (N-043)

| Componente | Hipótese para teste | Status |
| --- | --- | --- |
| Distribuição | 4 cartas para compor Luz/Sombra + **1 quinta carta** em reserva Cofre | CANDIDATE como contrato exato de distribuição |
| Foco | Orçamento inicial de **3 pontos por Noite**, sem compras | CANDIDATE (quantidade, regeneração e persistência ainda abertos) |
| **Manobra** | Gastar **1 Foco** para trocar uma carta elegível de uma das mãos com a carta de reserva, sob restrições de fase | CANDIDATE (custo/eligibilidade/timing) |
| **Leitura** | Gastar **2 Foco** para revelar ao próprio jogador a carta oculta do dealer num momento válido | CANDIDATE (custo/tempo, compatibilidade com peek e fair play) |
| **Conservar** | Seguir sem gastar Foco e preservar opções de outras rodadas | RATIFIED como objetivo de custo de oportunidade; sem algoritmo definido |

**Exemplo meramente ilustrativo:** Luz 8+3 (=11), Sombra 10+6 (=16), Cofre 5; três pontos de Foco não obrigatórios. Esse exemplo **não demonstra** que usar Manobra ou Leitura seja vantajoso, nem fixa a legalidade de qualquer troca. Não transformar o desenho em cálculo ou balanceamento validado.

## 3. Lacunas de design que não podem ser preenchidas silenciosamente

1. **Cofre visível ou oculto?** Em que momento é recebido/revelado, fica consumido, reposto ou passa de uma rodada para outra? Quais cartas podem ser trocadas? Pode modificar natural? Limite de trocas/rodada? A carta trocada vai para o Cofre ou é descartada?
2. **Quando o Foco existe e é gasto?** Quantidade inicial, acumulação, regeneração, limite máximo, validade por Noite, efeito de encerrar/recomeçar Noite, tratamento em desconexão e empate.
3. **Qual a janela da Manobra?** Antes/depois da composição, peek, ações, dobra, hit ou stand? Reavaliar estado/ação e preservar carta única; impedir swap em mão encerrada.
4. **Qual a janela da Leitura?** Se o dealer verifica natural imediatamente após composição (DF-SYM-0.1), a habilidade pode não ter janela significativa; uma reordenação do peek afeta payout, informação e equilíbrio. Considerar alternativas e validar; **não contornar isso vazando hole/seed para cliente**.
5. **Mão e sessão**: há Foco por rodada, por Noite ou por partida? Como scoring e EV tratam o recurso consumido e a oportunidade futura? A escolha ótima ex-ante é uma política de horizonte finito, não apenas soma independente de duas mãos.
6. **Fairness futura**: em Noite Espelhada, recursos idênticos não implicam informação idêntica quando jogadores gastam diferente; avaliar desenho de decks/draw lanes, commitment e informação privada.
7. **Economia**: uma vantagem matemática extra contra dealer não autoriza créditos persistentes ilimitados; não alterar a economia sem tarefa separada.

Questões detalhadas: [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md), O-03 e O-17..O-21.

## 4. Ordem recomendada de validação — ainda proposta

**A. Especificação e sandbox versionado:** criar RFC/ADR e perfil experimental separado `DF-CF-0.x`, com fases, entradas/saídas, legalidade, orçamento e condições de término explicitados. Comparar pelo menos alternativas de timing/ação. **Não alterar DF-SYM-0.1 ou a P2A ativa.**

**B. Teste isolado de contribuição:** em condições equivalentes, medir baseline Duas Faces, Cofre sem Foco/ações, Foco com ações explicitamente permitidas e variante completa. **Se alguma variante não for coerente, registrar impossibilidade e propor substituto comparável.**

**C. Simulação estratégica:** comparar bots com habilidade similar, heurísticas explicáveis e políticas ótimas/aproximadas; medir valor marginal do Foco, taxa de uso versus conservação, presença de estratégia dominante, ganho entre bons jogadores, variância, custo cognitivo, horizonte da Noite e sensibilidade a payout. Relatórios com seeds, limites, IC e versões.

**D. Experimento humano curto e consentido:** avaliar compreensão da reserva, facilidade de saber quando gastar/poupar, decisão subjetivamente significativa, rotina, tempo médio e replay voluntário; não inferir diversão/retention de modelo matemático apenas.

**E. Gate de produto:** decidir (i) calibrar e continuar, (ii) comparar variantes alternativas, ou (iii) descartar regras que não acrescentem interesse — **sem descartar automaticamente a direção N-042 sem nova decisão do fundador**.

## 5. Aceite documental e escopo

- O Codex segue responsável por programação, simulações, testes e PRs de código (N-041).
- Este documento canoniza **intenção + fronteiras**, não cria tarefa de implementação, não seleciona números e não modifica conteúdo do PR P2A.
- Na futura Issue de engenharia, exigir perfil versionado próprio, feature isolation, invariantes (conservação de cartas, atomicidade de Foco e gasto único, legalidade, sigilo de dealer), compatibilidade com o motor, benchmark e regras de rollback.
- Relatórios e decisões devem informar explicitamente o que foi RATIFIED/EXPERIMENTAL/CANDIDATE/OPEN e manter rastreabilidade N-042..N-045.
- Contratos, Protocolos, conquistas, Prestígio, créditos, ranking e multiplayer ficam fora do primeiro teste; permanecem em suas fases e decisões próprias.

## 6. Relação com decisões anteriores

- **N-018:** Duas Faces é o núcleo escolhido; Cofre + Foco aprofunda esse núcleo, não o substitui.
- **N-019/N-020:** DF-SYM-0.1 permanece EXPERIMENTAL e **não recebe Cofre/Foco**.
- **N-028:** registro histórico antigo de adiamento conjunto agora SUPERSEDED; conceito elevado apenas como direção por N-042.
- **N-043:** 5ª carta/3/1/2/Manobra/Leitura são hipóteses configuráveis, não aprovações numéricas.
- **N-044:** Contratos, Protocolos, conquistas e sistemas de progressão permanecem fora desta etapa.
- **N-036/N-045:** profundidade, prazer, diversidade, balanceamento e fairness continuam OPEN até evidência.
