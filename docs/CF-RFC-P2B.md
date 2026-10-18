# NOCTE-P2B-D — Cofre + Foco: regras para um primeiro experimento

**Status:** proposta de design para revisão do fundador; **não RATIFIED e não implementada**.<br>
**Data:** 2026-10-18.<br>
**Versão de regra proposta:** `DF-CF-0.1-candidate` (nome de trabalho; sem contrato executável).<br>
**Baseline preservada:** `DF-SYM-0.1` e protótipo P2A, sem alteração.<br>
**Decisões relacionadas:** N-042 RATIFIED apenas como direção; N-043 CANDIDATE; N-044 DEFERRED; N-045 OPEN.
**Escopo:** análise de regras, alternativas, matemática e validação futura. Não autoriza código, mudança de status, Cofre/Foco em P2A, multiplayer, economia ou deploy.

## 1. Resumo executivo

N-042 ratifica explorar uma reserva de carta e um recurso limitado que conecte escolhas entre Luz, Sombra e rodadas. Não fixa quinta carta, dotação de Foco, custos, timing ou informação. Este RFC recomenda testar primeiro uma janela de habilidade **depois do peek de natural do dealer e antes das ações do jogador**. A recomendação preserva a ordem experimental de `DF-SYM-0.1`, evita gastar Foco numa rodada encerrada pelo natural do dealer e cria uma decisão de conservar ou gastar que alcança as duas mãos e o restante da Noite.

O perfil candidato para análise usa uma quinta carta aberta no Cofre, 3 Focos por Noite, Manobra por 1 e Leitura por 2. Um Foco compartilhado não se renova por rodada. A Manobra troca uma carta de uma mão ainda ativa com a carta do Cofre, devolvendo a carta removida ao Cofre; a Leitura revela somente a hole card do dealer, após confirmação de que ele não tem natural. Cada ação pode ocorrer no máximo uma vez por rodada. Essas quantidades e efeitos são hipóteses para `DF-CF-0.1-candidate`, não escolhas aprovadas.

A Leitura privada limita a recomendação a investigação solo. Ela cria assimetria de informação em qualquer partida espelhada futura; este RFC não declara a variante justa para multiplayer. Uma alternativa mais simples para o primeiro protótipo é testar somente Manobra e Foco, adiando Leitura.

## 2. Autoridade e separação de status

| Item | Estado preservado neste RFC |
| --- | --- |
| Explorar Cofre + Foco como próxima direção de profundidade | **N-042 RATIFIED (direção)** |
| 5ª carta, 3 Foco/Noite, Manobra=1 e Leitura=2 | **N-043 CANDIDATE**; exemplos numéricos, sem aprovação |
| Contratos, Protocolos, conquistas e progressão | **N-044 DEFERRED** |
| Timing do peek, ações, renovação, balanceamento, diversidade, fairness e validação humana | **N-045 OPEN** |
| Contrato deste RFC | **DESIGN PROPOSAL**; não é regra experimental implementada nem status novo |

O RFC não altera o registro de decisões e não fecha O-17..O-21. Uma escolha do fundador sobre o RFC deverá ser registrada em etapa própria antes de criar a Issue de implementação. Aprovar a direção de teste descrita aqui não equivale a ratificar gameplay.

## 3. Objetivo, limites e baseline

O objetivo é adicionar uma escolha entre as mãos e uma escolha intertemporal de recurso sem criar uma lista de habilidades extensa. O Cofre deve influenciar qual mão recebe atenção; o Foco deve tornar a oportunidade de agora concorrente com oportunidades em rodadas futuras. **Conservar Foco é uma ação válida**, sem penalidade explícita.

O baseline de controle é o perfil laboratorial atual `DF-SYM-0.1`: quatro cartas iniciais, partição em Luz/Sombra, exposição inicial 10 pontos por mão, peek de natural depois da composição, ações hit/stand/double, dealer S17 e settlement experimental existente. Nenhuma hipótese deste RFC muda payout, prioridade de natural, exposição, regras de Ás, ordem das mãos, aleatoriedade ou elegibilidade de ação do baseline.

Foco não é crédito, saldo, aposta, pontuação, recompensa, item comprável ou conversível. Cofre e Foco não criam payoff de valor real. Não são tratados como regras de DF-SYM-0.1 nem adicionados ao P2A.

## 4. Alternativas de timing

As alternativas abaixo são comparações de design. A coluna “proposto” descreve como cada fluxo poderia operar para que suas consequências sejam avaliáveis; não afirma aprovação.

| Opção | Sequência e contrato proposto | Natural, double e dealer | Informação e custo | Trade-off |
| --- | --- | --- | --- | --- |
| **A — janela antes do peek** | Depois de compor, antes do peek, o jogador pode fazer até uma Leitura (2 Foco) e uma Manobra (1 Foco) por rodada. Manobra troca uma das duas cartas iniciais pelo Cofre; a carta retirada volta ao Cofre. Leitura mostra a hole card antes da verificação do natural. Sem uso, o jogador segue. Custos candidatos são debitados ao aceitar a ação e não são reembolsados por um natural subsequente. | O peek avalia a mão pós-Manobra. Troca pode criar/desfazer natural composto e alterar push/pagamento. Double ainda parte de duas cartas. Dealer continua comprando depois das mãos. | Cofre e hole são visíveis ao jogador solo; informação de hole é privada. Leitura pode revelar natural cedo; o jogador pode pagar por informação de valor imediato muito baixo nessa situação. | Mantém janela única, mas une mecânica candidata a O-03. A alteração do conjunto de naturals e do payout torna resultados difíceis de comparar com o baseline. Não recomendada para o primeiro teste. |
| **B — depois do peek, antes das ações** (**recomendada**) | Composição e peek seguem `DF-SYM-0.1`. Se o dealer tiver natural, resolve-se a rodada como hoje, sem janela de habilidades nem gasto. Caso contrário, abre-se uma janela única: o jogador pode conservar, usar Leitura (2 Focos), Manobra (1 Foco), ambas ou nenhuma; no combinado, Leitura vem antes da Manobra. Cada uma no máximo uma vez na rodada. | O peek e a elegibilidade de natural são fixados antes das habilidades. Mãos naturais já liquidadas não podem ser manobradas. A Manobra só atinge mão ainda elegível para ação, preserva duas cartas e a elegibilidade normal de double; não concede bônus de natural retroativo. Dealer mantém S17 e compra depois das duas mãos. | Leitura revela ao participante solo a hole card, e somente essa carta, durante a rodada. O custo ocorre após confirmação de não-natural; não revela draws futuros, seed ou fonte aleatória. Informação privada deixa fairness multiplayer em aberto. | Preserva a cronologia e liquidação do natural do baseline e oferece um custo intertemporal claro. Adiciona uma janela antes de jogar e permite sinergia entre Leitura e Manobra. Melhor equilíbrio entre valor de teste e complexidade. |
| **C — Manobra durante a mão** | Depois de uma compra em mão ativa e antes de avaliar o total, o jogador pode fazer uma única Manobra de 1 Foco por rodada: substituir somente a carta recém-comprada pelo Cofre; a compra removida volta ao Cofre. Leitura, se incluída, custa 2 e fica disponível após peek negativo. Não há nova troca nem leitura repetida. | Torna possível corrigir uma compra que levaria a bust, inclusive depois de double, e converte um resultado terminal em decisão adicional. Se permitir trocar cartas antigas ou reabrir mão encerrada, deixa de haver contrato simples e pode mudar double/exposição. | Cofre e ações legais são visíveis; Leitura privada pode orientar se gastar Cofre nessa rodada ou guardá-lo para a próxima. | Produz decisões reativas, mas aumenta estados, interações e risco de habilidade de resgate dominante. Requer regras para bust, double e terminalidade que não são necessárias à pergunta inicial. Adiar até que a opção B seja avaliada. |

Critérios qualitativos para escolher uma direção após a análise: usar B se preservar natural/peek e oferecer uma decisão escassa antes das duas mãos sem regra de resgate; simplificar para B-M se Leitura dominar Manobra, tiver valor baixo em quase todos os estados ou aumentar demais a carga de compreensão; considerar A somente se o fundador quiser testar explicitamente interação com natural e aceitar um estudo separado de payout/timing; considerar C somente em experimento separado se a troca reativa mostrar valor que não se reduza a “salvar bust” dominante. Nenhum limiar numérico de diversão, profundidade ou fairness está ratificado; definir critérios e métricas antes de executar a simulação principal.

### Recomendação de primeira variante

Avaliar a **Opção B** como `DF-CF-0.1-candidate`, com Manobra e Leitura na janela pós-peek. Não introduzir ações depois da primeira compra. Para a primeira implementação experimental após aprovação do RFC, manter o primeiro ciclo **solo**. Se o teste matemático mostrar que Leitura domina ou se seu custo cognitivo crescer, usar a alternativa minimalista **B-M**: mesma reserva e janela, Foco apenas para Manobra; Leitura é removida desse perfil e permanece como controle separado de pesquisa.

O motivo para não começar pela Opção A é que ela transforma timing de peek e natural em variável experimental junto com as habilidades. O motivo para não começar pela Opção C é que resgatar uma compra adiciona regras de bust/double e pode deixar a reserva obrigatória para jogar bem. A Opção B preserva o contrato atual de natural e deixa claro quando se decide gastar.

## 5. Contrato end-to-end proposto para `DF-CF-0.1-candidate`

Todos os pontos desta seção são **candidatos sujeitos à revisão**, não comportamento atual.

### 5.1 Distribuição e Cofre

1. Cada rodada distribui as quatro cartas iniciais do jogador, upcard e hole card do dealer como no perfil de referência, mais uma quinta carta visível ao jogador no Cofre.
2. A partição inicial usa somente as quatro cartas iniciais e continua formando duas mãos de duas cartas. O Cofre fica fora das mãos até uma Manobra aceita.
3. Há no máximo uma Manobra por rodada. Ela troca uma carta escolhida de uma mão elegível pela carta no Cofre; a carta substituída torna-se a nova carta do Cofre. Não se cria nem se remove carta durante a troca.
4. Manobra só é legal na janela pós-peek e antes de qualquer ação de mão. O alvo deve continuar ativo, estar na composição de duas cartas e aceitar ações pelo contrato-base. Uma mão natural já terminal, mão encerrada ou estado com ação anterior não é elegível.
5. Ao encerrar a rodada, todas as cartas dessa rodada, inclusive a carta do Cofre, saem de jogo. A próxima rodada recebe uma nova carta de reserva. Nenhuma carta Cofre persiste entre rodadas; apenas o Foco persiste na Noite.

### 5.2 Janela de habilidade e Leitura

1. A janela abre somente se o peek do dealer confirmou ausência de natural. A resolução do natural do dealer não oferece uma janela, não gasta Foco e não gera reembolso a discutir.
2. A ordem candidata do combinado é **Leitura opcional → Manobra opcional → ações Luz/Sombra**. O participante também pode pular qualquer uma ou ambas e guardar Foco.
3. Leitura custa 2 Focos e revela apenas a hole card do dealer ao jogador solo até o fim daquela rodada. Uma vez usada, não pode ser repetida na mesma rodada. Não revela cartas futuras, seed, estado de RNG nem outras lanes.
4. Leitura não altera o peek, a distribuição já amostrada, score, legalidade das ações ou a política S17. A confirmação do dealer sem natural vem antes; portanto Leitura não pode ser usada para sondar uma rodada que o natural encerrou.
5. A Leitura pode informar decisões das duas mãos porque ambas enfrentam o mesmo dealer. Isso é uma propriedade estratégica relevante, não um vazamento acidental a ocultar na proposta. Será exclusivamente solo até existir um modelo de informação e fairness para multiplayer.

### 5.3 Foco e transações de ação

| Regra candidata | Contrato proposto |
| --- | --- |
| Dotação | 3 Focos no início de cada Noite experimental; sem compra nem créditos. |
| Escopo | Um saldo compartilhado entre Luz, Sombra e rodadas, não três saldos por mão. |
| Custos | Manobra=1; Leitura=2. Valores N-043 CANDIDATE, não aprovados. |
| Renovação | Nenhuma renovação entre rodadas. O saldo não pode exceder 3. |
| Expiração | Saldo restante expira ao terminar ou abandonar a Noite; nova Noite começa com 3 no perfil candidato. |
| Empate/resultado | Win, loss, push, natural ou bust não alteram o Foco. Não há devolução por resultado desfavorável. |
| Ação inválida | A ação não aceita não desconta Foco nem altera carta/estado. A validação de legalidade e débito é atômica. |
| Reenvio | Repetição de comando/idempotency key não pode repetir a troca nem o débito. |
| Inatividade | Não gasta automaticamente; seguir sem agir preserva o saldo para a próxima rodada. Temporizador/reconexão ficam fora do primeiro solo e abertos para multiplayer. |

Um gasto aceito não é revertido porque a decisão depois se mostrou ruim. Cancelamento antes de confirmar não gasta. O estado de Foco deve ser registrado como valor numérico separado de pontos de partida e qualquer ledger econômico futuro.

### 5.4 Fluxo de estados

```text
DEAL (4 cartas + upcard/hole + Cofre)
  → COMPOSE (particionar apenas as 4 originais)
  → PEEK
      ├─ dealer natural → RESOLVE conforme DF-SYM-0.1 → ROUND_END
      └─ sem natural → FOCUS_WINDOW (Leitura?, depois Manobra?, ou conservar)
                       → LUZ_ACTIONS → SOMBRA_ACTIONS
                       → DEALER_DRAW (S17) → RESOLVE → ROUND_END
  → NEXT_ROUND (repor cartas da rodada; carregar Foco remanescente)
  → NIGHT_END (Foco não usado expira)
```

Regras de ações de mão, settlement, naturals, exposições e dealer são herdadas do `DF-SYM-0.1` candidato somente quando explicitamente indicado. O estado novo não deve inferir permissões por rótulo visual: cada transição futura precisará de ações legais explícitas por versão de regra. O fluxo não supõe timeout, reconexão, sala ou árbitro de rede.

### 5.5 Naturals, double e pagamento

- Peek conserva sua posição de referência: após composição, antes da janela nova. Se o dealer tem natural, usa-se settlement corrente; nenhuma habilidade é ofertada.
- A elegibilidade para natural do jogador fica determinada pelo par composto **antes do peek**, como no baseline. Mãos naturais liquidadas não podem ser alteradas.
- Manobra não transforma um 21 posterior à janela em natural pagável a 3:2. Se uma futura implementação gerar um 21 após troca, a proposta o trata como 21 comum sob o perfil de pagamento selecionado; o 3:2 continua restrito ao natural reconhecido pelo baseline. O próprio payout segue experimental e não é ratificado aqui.
- Manobra mantém duas cartas e não consome hit; o jogador retém as opções e exposição previstas para uma mão inicial de duas cartas, incluindo double se permitido pelo estado-base. O double continua comprando exatamente uma carta e encerra essa mão conforme DF-SYM-0.1.
- Depois do primeiro hit/double/stand, Manobra não pode atuar na Opção B. Hit e bust seguem o baseline e não podem ser revertidos por Cofre.
- Dealer não vê nem reage a cartas ou intenção de gasto. Ele compra depois das duas mãos e para em qualquer 17, como S17. No final, hole e draws são revelados segundo a projeção pública terminal já corrigida na P2A.

## 6. Perfis de comparação

Os controles isolados ajudam atribuição, mas não fingem que são variantes competitivas equivalentes. Cada resultado deve declarar payout e perfil de partida. N-019/N-020 continuam experimentais.

| Perfil de pesquisa | Cenário/ação | O que isola | Limite de interpretação |
| --- | --- | --- | --- |
| **Baseline** | `DF-SYM-0.1`; quatro iniciais, sem Cofre/Foco. | Referência canônica do P1/P2A e regressão de experimento. | Baseline infinito com reposição não define shoe/mirror de produto. |
| **Cofre isolado** | Quinta carta aberta e uma troca gratuita por rodada pré-ação; sem orçamento de Foco. | Valor de ter uma carta de reserva e efeito inter-mãos sem custo escasso. | Controle diagnóstico de limite superior; “gratuita” não é proposta de gameplay. |
| **Foco + informação** | Quatro iniciais, 3 Foco/Noite, Leitura=2 uma vez/rodada após peek negativo; sem Cofre. | Valor da informação e opção de guardar Foco sem carta de reserva. | Controle não implementa a direção combinada completa; Leitura privada exige avaliação solo. |
| **Cofre + Foco** | Perfil completo da Opção B, custos candidatos e quinta carta. | Sinergia entre reserva, leitura, escolha da mão e orçamento no horizonte. | Variável composta; diferenças contra os controles não identificam sozinhas causa única. |
| **Minimalista B-M** | Quinta carta, 3 Foco/Noite, Manobra=1; sem Leitura. | Se a reserva com custo compartilhado cria decisões sem regra informacional extra. | Recomendação alternativa; não substituir o perfil principal sem registrar a mudança de hipótese. |

Se um controle for incoerente em certo aspecto, preservar cenário, regras herdadas, horizonte e políticas possíveis e explicar a limitação. Não igualar “benefício por ação” ou acesso à informação artificialmente para forçar uma comparação. Resultados dos controles não alteram regras P2A/P1 nem decidem multiplayer.

## 7. Implicações estratégicas e análise matemática

### 7.1 Onde aparece a interdependência

No baseline infinito, EV da rodada pode ser decomposto em duas utilidades de mão frente à mesma upcard, e composições simples capturam boa parte da vantagem. Cofre + Foco quebra essa separabilidade por dois motivos: a troca escolhe qual mão melhora e a mesma reserva de Foco pode ser gasta em qualquer mão ou guardada para qualquer rodada futura. Leitura também informa as duas mãos simultaneamente.

Uma decisão que melhora EV imediato pode reduzir valor futuro do Foco. Uma política que sempre guarda nunca recebe benefício, pois o saldo expira ao fim da Noite. Uma política gulosa que sempre gasta pode desperdiçar recursos em estados de pequena vantagem. A tensão entre essas políticas é hipótese de profundidade, ainda não evidência de que haverá diversidade útil.

### 7.2 Função-valor de horizonte

Para uma Noite de `H` rodadas, saldo `f`, resultado público atual `z` e política `π`, a referência ótima deve maximizar **score esperado da Noite** sem conhecer deals futuros. Forma abstrata:

```text
Vₜ(f, z) = max sobre ações legais a
           E[ ganho imediato(z, a) + Vₜ₋₁(f − custo(a), próximo estado) ]
V₀(f) = 0 para todo f                 (Foco restante expira sem valor residual)
```

Distribuição de deals e informação observável entram na expectativa; a decisão não pode acessar hole ainda oculta, seed, cartas futuras ou draws futuros. Para Leitura, uma ramificação posterior pode condicionar decisões à hole revelada após gasto válido. Para Manobra, o ganho deve refletir a composição efetivamente trocada e o custo de oportunidade do Foco, não a soma de duas mãos independentes antes da alteração.

**Arrependimento intertemporal** por Noite é `E[S* − Sπ]` em cenários pareados, onde `S*` é o resultado da melhor política legal sob a mesma distribuição e o mesmo saldo inicial e `Sπ` é o da política testada. O oráculo não recebe observações futuras; é uma política de informação, não um jogador onisciente. Relatar score esperado separado de vitória/empate em sessão, variância, uso de Foco e saldo expirado. EV não prova diversão ou fairness.

O valor marginal de um Foco é `λₜ(f)=Vₜ(f)−Vₜ(f−1)`. É diagnóstico de escassez no modelo, não unidade de crédito nem valor exposto ao jogador. Comparar valor de informação e valor de Manobra contra essa opção futura e reportar a distribuição por posição da rodada e saldo remanescente. Se a ação tiver ganho de score positivo mas menor que o valor de guardar o ponto para um estado futuro, gastar não é ótimo no horizonte.

### 7.3 Sensibilidade do orçamento

Com 3 Focos fixos e sem renovação, disponibilidade média aritmética máxima é `3/H`: **0,60** por rodada em 5, **0,30** em 10 e **0,15** em 20. Isso não significa fração de Foco legalmente divisível; somente indica que a escassez relativa muda com o horizonte. Não assumir que três pontos são comparáveis entre noites de durações diferentes.

Relatar pelo menos (a) 3 fixos em cada horizonte, pois testa literalmente a hipótese por Noite, e (b) uma sensibilidade com orçamento proporcional ao horizonte, identificada como controle matemático, não como regra candidata. A sensibilidade proporcional pode usar o orçamento fixo de H=10 como âncora para mostrar efeito de duração sem mudar regras ou esconder que o orçamento fixo favorece oportunidades escassas em sessões curtas. Apresentar os resultados em pontos de score e por Noite; não converter em créditos.

### 7.4 Hipóteses quantitativas a testar (não resultados)

- Foco fixo pode aumentar valor de timing, mas pode se tornar “sempre guardar até surgir mão óbvia”; medir política dominante e parte do EV capturada por heurísticas curtas.
- Leitura pode elevar ação correta contra dealer conhecido, mas ser investimento dominante cedo ou nunca valer 2 pontos de Foco; medir seu ganho marginal e se Manobra perde relevância quando a informação está disponível.
- Manobra pode tornar decisão de composição pós-peek significativa, mas swaps que criam soma alta podem reforçar regra simples de “sempre trocar a pior carta”; avaliar erro residual e condições em que isso falha.
- Se Leitura privada aumentar muito win probability, isso é uma vantagem do pacote de informação, não evidência de profundidade equilibrada. Fazer comparação de informação igualada para estudo solo (todos os agentes podem comprar pelo mesmo custo), sem transferir conclusão para espelhamento multiplayer.

## 8. RNG, distribuição e reprodutibilidade

O modelo P1A/P1B/P1C usa draws independentes de rank com reposição: A–9 cada com probabilidade 1/13 e dez-valores com probabilidade 4/13. Acrescentar um rank amostrado do Cofre nessa distribuição **não** altera probabilidades marginais independentes no modelo infinito; porém adiciona informação inicial e muda o traço seeded se inserido na sequência antiga. Isso não é uma simulação de baralho finito nem uma decisão de shoe.

Para uma avaliação futura versionada, atribuir a reserva a uma lane/nome de draw separado, e preservar lanes do quarteto, dealer, Luz e Sombra nos controles pareados. Seed e namespace de `DF-CF-0.1-candidate` devem ser próprios. Isso mantém casos comuns alinhados sem afirmar equivalência de multiplayer. O cofre extra não deve deslocar draws futuros de uma política para a outra por diferença de consumo.

Num shoe finito, a quinta carta consome carta do baralho e altera a composição disponível para hit/dealer; troca conserva as duas cartas envolvidas mas não as devolve ao shoe. A distribuição condicional muda e o solver infinito atual não responde essa pergunta. Deck count, ordem física, reshuffle e espelhamento permanecem O-01/O-02/N-024. Qualquer motor futuro precisa de configuração/versionamento próprios, replay determinístico e solver que reflita exatamente o mesmo modelo. Não atualizar, renomear ou reinterpretar resultados históricos P1A–P1C.

## 9. Matriz de situações de borda

Resultados esperados abaixo são os contratos candidatos das opções A/B/C. “Pendente” marca condição que exige decisão antes de qualquer implementação; não deve ser resolvida silenciosamente.

| Situação | A — antes do peek | B — pós-peek (recomendada) | C — durante a mão |
| --- | --- | --- | --- |
| 1. Dealer natural | Ações de Foco aceitas podem ter sido gastas antes de natural encerrar; hole já lida pode antecipar a notícia. Custo não reembolsado. | Resolve no peek conforme baseline; não há janela nem gasto; Foco fica disponível. | Como B: nenhum salvamento se rodada encerra antes das ações. |
| 2. Natural composto do jogador | Manobra antes do peek pode criar/destruir natural; settlement usa par pós-troca. Efeito no payout precisa ser versionado. | Natural elegível é fixado pré-peek; mão terminal imutável. Troca não cria bônus retroativo. | Natural já terminal não pode ser alvo; redefinir após ação seria conflito e permanece proibido. |
| 3. Ás suave na mão ou Cofre | Recalcular 1/11 após a troca e antes do peek; novos casos de natural. | Recalcular total soft/hard após troca, sob regra atual; a hole lida não fixa futura compra. | Recalcular após troca da carta recém-comprada antes de testar bust; regra nova e mais complexa. |
| 4. Manobra e double | Manobra antes do peek preserva duas cartas; double segue legalidade após recompor natural. Payout/natural muda. | Uma troca mantém duas cartas e permite double conforme elegibilidade-base; depois de double não há Manobra. | Troca após compra forçada não pode alterar exposição/draw count do double; se mexer nisto, a alternativa é inválida. |
| 5. Hit que causaria bust | Não há ação de mão ainda; sem conflito. | Hit e bust seguem baseline; Manobra fechada, sem resgate. | Trocar compra que bustaria antes de avaliar bust é parte do contrato da Opção C; medir risco de “salva-bust”. |
| 6. Mão já encerrada (stand/bust/natural/double) | Peek ainda não ocorreu; terminalidade de natural é recalculada depois da troca. | Mão terminal não é elegível. Não reabrir ou alterar settlement parcial. | Não é alvo. Se dealer começou/resolução ocorreu, janela fechada. |
| 7. Cofre já usado | Uma troca por rodada; carta substituída fica no Cofre, sem segunda troca. | Igual: no máximo uma Manobra; Cofre passa a conter a carta retirada até fim da rodada. | Uma troca total por rodada; não permitir repetir “salvamento” nem ciclar cartas. |
| 8. Cofre não usado | Carta sai de jogo ao encerrar a rodada; próxima recebe outra. | Igual. Foco não usado pode continuar; a carta não. | Igual. |
| 9. Foco esgotado | Nenhuma habilidade legal; peek e mãos seguem. Leitura já gasta não pode ser retirada. | Nenhuma habilidade legal; jogador pode continuar normalmente. | Nenhuma nova troca/leitura; não interromper mão. |
| 10. Seed/replay | Replay inclui regra, ordem de draws e ação de habilidade; seed não aparece antes do fim. | Namespace/lane próprio para Cofre; replay reproduz escolha e informação autorizada sem publicar seed à UI. | Replay inclui compra, troca da carta comprada e ação que levou a ela; qualquer diferença de stream deve ser versionada. |
| 11. Push/empate | Resultado não devolve Foco já gasto. | Sem refund; recurso é da Noite, não payoff da mão. | Sem refund; desempate não deve ser alterado por Foco. |
| 12. Abandono/inatividade | Ação aceita continua consumida; restante expira ao sair. Sem compra automática. | Ação aceita continua consumida; restante expira no fim/abandono. No-op não gasta. Persistir/desconexão fica OPEN. | Igual; interrupção durante janela após compra precisa comando idempotente para não aplicar dupla troca. |
| 13. Ação repetida ou atrasada | Rejeitar segunda troca/leitura; nenhuma mudança extra de saldo/carta. | Rejeitar comando repetido com chave/idempotência; débito e efeito atômicos. | Rejeitar comando de mão inativa ou hit já resolvido; não ressuscitar bust. |
| 14. Leitura em natural do dealer | Permitida antes do peek neste fluxo e pode consumir Foco mesmo quando inútil; risco explícito da opção. | Não existe: peek termina a rodada antes da janela. | Fechada se o natural encerrou; se não, leitura permanece privada e posterior. |
| 15. Disconnect após gastar | Sem reconexão no primeiro solo; comportamento persistente futuro OPEN. | No solo local, recarregar perde sessão como P2A. Futuro servidor deve persistir saldo/ação atomicamente; O-08 segue OPEN. | Se reconexão ocorrer entre draw e swap, estado pendente/replay precisa resolver antes de aceitar comando. OPEN para produção. |
| 16. Cofre e futuras cartas do dealer | Distribuição infinita: mesma distribuição de ranks; shoe finito altera composição. Não usar o mesmo resultado como evidência dos dois modelos. | Idem; leitura só mostra a hole efetivamente distribuída, nunca draws futuros. | Reserva que substitui draw depende de sequência física; solver com reposição não é válido para fairness de shoe. |

## 10. UX e compreensão

Na mesa solo experimental, Cofre aparece como carta separada do arranjo Luz/Sombra; mostrar saldo Foco como recurso da Noite, por exemplo “Foco 2/3”, separado de score. A janela após o peek deve explicar que o dealer não tem natural, sem exibir política sugerida ou EV do solver.

- Uma escolha de Manobra apresenta uma prévia da mão/Cofre e informa “gasta 1 Foco”; só troca e desconta após confirmação. O custo, carta retirada e carta que fica no Cofre permanecem textualmente identificáveis.
- Leitura exige confirmação clara “revelar hole card por 2 Focos”. Após aceite, marca que aquela informação foi lida nesta rodada. Não sugere se deve comprar/parar/dobrar.
- “Continuar sem gastar” está sempre disponível e preserva Foco. Não usar animação, urgência ou feedback de perda para pressionar uso.
- O fluxo não deve ensinar solver, estratégia ótima, probabilidades, EV/regret ou caminho preferido antes da escolha. A explicação é de regra e custo, não dica.
- Cartas, total e status são legíveis sem cor; controles de teclado/leitor de tela anunciam custo, saldo, consequência e estado da janela. O participante consegue concluir uma rodada mesmo sem explorar habilidades.

Estas linhas são requisitos de estudo futuro, não pedido de alteração ao UI P2A nesta task.

## 11. Plano de validação futuro

### 11.1 Simulação offline versionada

Usar cenários pareados com as mesmas quatro iniciais e dealer up/hole em todos os perfis; quinta carta tem lane extra comum apenas aos perfis que a usam. Reproduzir cada perfil com seed/rule/solver/policy versionada. Comparar horizons 5/10/20 e pelo menos os dois tratamentos de orçamento da Seção 7.3. Nenhum agente recebe informação que sua política não comprou ou não observa.

Políticas mínimas:

1. **Conservar sempre:** controle de valor zero de habilidades.
2. **Gulosa por rodada:** gasta se ganho de score imediato estimado superar zero, sem preço-sombra de Foco futuro.
3. **Heurística pública simples:** regras curtas baseadas só em cartas/upcard/saldo/rodadas, sem hole nem seed; uma regra não representa população humana.
4. **Política de horizonte:** DP/recursão sobre saldo, rodadas restantes, fase, informação pública e resultado corrente; Leitura abre observação da hole somente após custo.

Reportar score EV e regret intertemporal em pontos por Noite, win/loss/push em sessões pareadas, variância/IC, frequência e momento das ações, Manobra por mão/estado, Leitura e utilidade por hole, saldo restante/expirado, decisões sem gasto, acordo/diversidade entre políticas e casos em que heurísticas simples capturam quase todo o ganho. Denominadores, unidades, seeds, versões e dados de incerteza são obrigatórios; intervalos correlacionados são identificados como marginais. Não selecionar resultados favoráveis após examinar teste retido.

Riscos de regra dominante a testar: sempre Manobra para uma mesma categoria de estado; sempre Leitura quando restam X Focos; gastar tudo na primeira oportunidade; guardar até fim; uma habilidade ter valor inferior por Foco em todo estado; Cofre tornar composição inicial irrelevante. Se políticas fortes e simples coincidirem em quase todos os casos ou ganho absoluto ficar dentro da incerteza prática, isso é evidência desfavorável à profundidade pretendida, não justificativa para ajustar regras sem nova hipótese.

### 11.2 Justiça e informação

Com Leitura privada, dar a ambos os lados Foco e regra iguais não iguala informação durante a rodada. Se apenas uma política compra a leitura, um duelo pareado concede conhecimento exclusivo do mesmo dealer. Opções futuras (não selecionadas) incluem: manter Leitura somente em solo; torná-la revelação pública que ambos observam após o gasto de um jogador; ou retirar Leitura de uma versão competitiva. Revelação pública beneficia também o oponente e altera incentivo de gastar. A escolha não pode ser feita por implementação conveniente.

Common-random lanes permitem avaliação contrafactual, não resolvem equivalência de shoe/live mirror. Depois de teste solo, qualquer alegação de fairness exige uma pergunta específica, modelo de informação, política de recursos por concorrente, distribuição de draw, controles por posição e experimento versionado. Nenhuma variante deste RFC está pronta para ranqueada.

### 11.3 Etapa humana

Após aprovação de um perfil executável, usar o protocolo de consentimento P2A como referência, com novo protocolo versionado e briefing neutro. Medir entendimento da carta, custo, saldo e opção de conservar; tempo relativo e hesitação na janela; escolha de habilidade por estado; repetitividade percebida; diferença entre expectativa e resultado; interesse voluntário em repetir. Separar observação, resposta opcional, inferência e limitação; não inventar n=1 formal nem inferir retenção a partir de replay declarado.

## 12. Riscos, invariantes e dependências

### Invariantes propostas para qualquer implementação futura

- As quatro cartas iniciais são particionadas uma vez e exatamente; Cofre começa fora das mãos.
- Swap transfere exatamente uma carta por outra, preservando o multiconjunto das cinco cartas; nenhum card é duplicado/perdido.
- Foco é inteiro, finito, saldo único por Noite, nunca negativo ou comprado; custo descontado uma só vez e junto da transição válida.
- Peek/natural segue perfil explicitamente versionado; nenhuma ação pós-peek pode reescrever settlement natural já concluído.
- Leitura (se ativa) mostra apenas a hole existente a quem tem autorização; nunca seed/futuras cartas.
- Manobra da opção B ocorre antes de qualquer ação de mão, não salva bust e não reabre mão terminal.
- Dealer mantém ações/ordem S17 de perfil selecionado; regras não inferidas por UI.
- Replay cita `rulesId`, versão de stream, cenário e ações; resultados P1A–P1C/P2A permanecem imutáveis.

### Riscos/dependências

| Risco/dependência | Por que importa | Gate antes de código |
| --- | --- | --- |
| O-03: dealer natural e natural composto | Opção A interfere diretamente; Opção B reduz, mas não aprova payout. | Fundador seleciona timing e confirma relação com regra existente. |
| O-01/O-02/N-024: shoe/mirror | Quinta carta muda contagem em shoe finito; lanes são controle offline apenas. | Delimitar primeiro laboratório infinito e separar fairness/deck finito. |
| N-043 valores | 3/1/2 não têm validação. | Aprovação explícita do perfil de teste, calibragem documentada. |
| Leitura privada | Informação desigual em partida espelhada. | Inicialmente solo; decisão própria para multiplayer. |
| Horizonte da Noite | Valor de Foco depende do número de oportunidades restantes. | Fixar H por condição experimental e relatar sensibilidade. |
| P2A e estudo humano | Interface atual não implementa esta mecânica. | Criar Issue/versão/branch separada; não editar baseline ou relatório humano. |
| Complexidade do solver | EV de leitura e recurso é dinâmica de horizonte, não soma das duas mãos. | Especificar solver que usa apenas informação disponível e cross-check independente. |

## 13. Decisões que o fundador precisa tomar

1. Aprovar, modificar ou rejeitar a **janela B pós-peek** como hipótese para primeiro protótipo; reconhecer que manter timing não resolve O-03 em geral.
2. Escolher se primeiro build inclui **Leitura** ou começa minimalista com **B-M**; definir modelo privado/publico só para o contexto aprovado (proposta inicial é solo privado).
3. Aprovar ou substituir valores candidates 3 Foco, Manobra 1, Leitura 2 e sem renovação; definir se o primeiro protocolo usa Foco fixo ou orçamento proporcional como regra experimental (ambos ainda podem ser só condições de simulação).
4. Confirmar elegibilidade de Manobra e tratamento de 21/natural após troca; proposta: uma troca pré-ação em mão ativa e bônus natural não retroativo.
5. Definir o próximo gate: sandbox/simulador matemático `DF-CF-0.x`, ou outra comparação antes de código. Não há implementação autorizada por este RFC.

Qualquer seleção é nova aprovação de design e requer atualização rastreável do registro/contrato antes de habilitar implementação. Até lá todas as proposições continuam **CANDIDATE** ou **OPEN**.

## 14. Limitações e recomendação

O modelo infinito dá controle reproduzível, mas ignora esgotamento de ranks, contagem e restrições físicas do baralho. A Leitura pode mudar dramaticamente EV e fairness; nenhum número de valor ou taxa de uso foi calculado neste RFC. O solver P1B otimiza a decisão existente com informação atual e não é, sem extensão e validação, um solver de horizonte de Foco. Políticas de software não representam jogadores. Resultados de P1C motivam teste de custo intertemporal, mas não provam que a mecânica proposta corrige monotonia. A observação inicial do fundador (n=1) continua sendo feedback informal, separada do protocolo estruturado P2A. P2A está preservada como baseline e não há resultados humanos estruturados reivindicados.

**Recomendação:** se o fundador aceitar uma primeira hipótese executável, começar com a **Opção B** em solo, `DF-CF-0.x` isolado, cenários pareados, e tratar 3/1/2 como parâmetros configuráveis. Comparar o combinado com a alternativa minimalista B-M e controles sem mecânicas. Manter a Leitura fora de qualquer alegação competitiva até resolver informação privada e fairness. Só depois de evidência quantitativa e playtest humano consentido decidir se calibrar, simplificar ou descartar a implementação experimental; nenhuma delas muda DF-SYM-0.1.
