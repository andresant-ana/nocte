# NOCTE — RFC P4: banca fictícia, habilidade e recompensas

**RFC:** `NOCTE-P4-D-v0.1` • **Data:** 2026-10-19  
**Origem:** Issue #23 • **Status:** **direção A0 → A1 aprovada pelo fundador** (N-052 RATIFIED somente como sequência de experimentos); especificação econômica A0 e escolha posterior A1 ainda OPEN (N-053).  
**Autoridade vigente:** N-009, N-012, N-014–N-017, N-021, N-026–N-027, N-031, N-038, N-040, N-044, N-048–N-051.  
**Código:** nenhum. **O fundador aprovou preparar A0 como próximo experimento, não aprovou valores de saldo, falência ou alterações nas regras.** Nenhuma banca funcional, compra, loja, stake livre, conta ou regra de multiplayer está aprovada para implementação sem o contrato específico de A0.

## 1. Decisão a ser tomada

NOCTE deverá recompensar simultaneamente (a) melhorar decisões e desempenho competitivo; (b) ganhar/conservar **fichas virtuais**, proporcionando tensão de banca; e (c) futuramente expressar conquistas mediante cosméticos, sem troca por dinheiro real ou vantagem comprável.

A primeira pergunta não é preço de skin. É **qual contrato de banca produz decisões interessantes sem destruir comparabilidade, induzir dependência de sorte ou financiar emissão ilimitada de fichas?**

### Hipóteses a validar (não conclusões)

- Uma banca limitada por Noite aumenta significado da vitória e gestão de risco, mas pode ser apenas uma camada emocional sobre o score já existente.
- Selecionar tamanho de aposta *antes das cartas* introduz gestão de risco, porém não necessariamente mais habilidade por rodada sob baralho infinito, odds idênticas e sem contagem; pode só aumentar variância.
- Selecionar aposta *depois de ver as cartas/Cofre* criaria uma decisão informada, mas também intensificaria vantagens dominantes de quem conhece o solver e dificultaria mirroring/fairness.
- Uma moeda de cosmético vinculada diretamente às fichas faz o jogador valorizar a banca, porém pode converter desempenho em um ativo com preço de referência, pressionando antifraude e enquadramento jurídico.

## 2. Camadas contábeis e finalidade

| Camada | Significado | Persistência e autoridade sugeridas | Proibição |
| --- | --- | --- | --- |
| `match_points` | Desfecho matemático comparável por mão/rodada; exposição normalizada para comparação de habilidade | replay/partida com regras versionadas; transição de engine | Não substituir por lucro nominal |
| `bankroll_session` | Fichas fictícias para risco dentro de uma Noite | somente sessão, reinicializa; no primeiro laboratório local | Sem cash-out, valor real, loja ou impacto sobre rank |
| `credit_balance` | Potencial banca persistente para modos sociais | **não implementada**; exigiria ledger e backend autoritativo | Solo ilimitado não pode imprimir créditos reais do jogo |
| `skill_rating` | Estimativa competitiva com incerteza, independente do tamanho da banca | mecanismo separado ainda OPEN | Não melhorar por ser rico ou apostar alto |
| `earned_cosmetic_points` | Possível recompensa de desafios/marcos (limites e emissão próprios) | futura e opcional, não implementada | Não comprar fichas, Foco, classificação, cartas ou vantagem |
| `premium_purchase` | Possível compra futura **somente cosmética** após novo gate | futura e opcional, **não implementada** | Não comprar fichas nem valor jogável |

**Foco** permanece exclusivamente um orçamento de decisão `DF-CF-0.1-lab`. Jamais transferir recursos entre Foco, créditos de jogo, classificação e moeda paga.

## 3. Comparação dos três modelos de banca

| Opção | Contrato possível | Vantagens | Riscos / esforço | Estado |
| --- | --- | --- | --- | --- |
| **A — banca reiniciada por Noite** | saldo inicial fictício `B₀`; ganhos/perdas da Noite afetam `bankroll_session`; ao começar outra Noite, reseta | zero economia persistente, permite testar UX e sensação de perda/risco com baixo custo | stakes dinâmicos podem transformar pontuação em volatilidade; pouco senso de progressão intersessão | **APROVADO COMO PRIMEIRO EXPERIMENTO**, desenho executável OPEN |
| **B — banca persistente** | ledger de créditos, origem verificável, gasto, recuperação e limites | progressão e identidade duradouras | positivo EV no solo, bots, contas múltiplas, inflação, proteção de saldo, custo server e fraude | DEFERRED até simulação/antifarm |
| **C — pote redistribuído em duelo** | 1v1 mirror com entrada fictícia fixa; stake de ambos escrowed; vencedor leva pote, empate reembolsa | stake social sem emissão líquida por partida e igualdade nominal de recursos | collusion/self-matching, alt accounts, kick/disconnect, sincronização de cenário, acesso de quem zerou | CANDIDATE depois do gate multiplayer |

As opções B e C **não** são ativadas ao escolher A. A simples integração de uma banca de sessão **não ratifica apostas configuráveis** nem futura loja.

## 4. Primeira experiência: dois subtestes A0/A1, sem stakes de dinheiro real

### A0 — só banca de sessão (controle de apresentação)

- Manter **exposição inicial de 10 pontos por mão** em `DF-CF-0.1-lab`, natural experimental 3:2 ou 1:1 e double como já definidos.
- Apresentar um **saldo por Noite separado** dos `match_points`, cujo estado inicial fictício é declarado previamente (por exemplo, 100 fichas como **valor ilustrativo, não aprovado**).
- Ganhos/perdas refletidos somente na Noite; nada é carregado para perfil, loja ou conta. Analisar clareza e emoção sem adicionar decisões de stake.
- Importante: se o saldo fosse insuficiente para honrar as exposições existentes, seria necessária uma regra explícita de terminalidade/continuação. **Não inventar bankroll negativo nem alteração automática em double**; projetar a opção antes do código.

### A1 — escolha limitada de stake, apenas estudo isolado

- Se A0 não acrescentar profundidade, comparar opção de selecionar **uma faixa limitada de exposição igual para Luz/Sombra**, **antes** de ver qualquer carta/cenário da rodada e antes do Cofre. Valores como 5/10/20 são **exemplos ilustrativos, não regras RATIFIED**.
- **N-021 REJECTED permanece intacta:** não reintroduzir a antiga distribuição flexível 5–15 das 20 unidades **entre** Luz/Sombra no primeiro competitivo. A1 seria experimento explícito não ranqueado, no qual cada mão começa com a mesma exposição.
- Reservar o débito de ambas as mãos, verificar que haverá saldo para a exposição escolhida. Para double, só habilitar se houver fichas suficientes para a exposição adicional (ou construir um modelo separado de limite de double); não deixar mão negar pagamento ou gerar dívida.
- Evitar que “mais fichas = mais rank”: score skill padronizado por stake ou match com stakes idênticos, e medir o impacto da restrição de double em jogadores com saldos diferentes.
- Não revelar dealer hole nem qualquer carta/seed antes de escolher stake. Testar seleção antes das cartas versus após composição **somente como contrafactual no laboratório** para medir vantagem da informação, não liberar late betting na UI por inércia.

**Hipóteses concorrentes:** começar com A0 é a recomendação mais segura; se não agregar decisões, A1 é justificável para um estudo UX/risco em modo solo isolado, não uma alteração do ranking. **O fundador aprovou a sequência A0→A1, mas NÃO os números/tecnologia/regras econômicas concretas.** Iniciar pelo contrato A0; A1 depende de resultado e autorização própria.

## 5. Banca persistente: restrições de estabilidade

O P2B-F reporta políticas de Cofre/Foco com valor esperado superior ao baseline sob deck infinito. Portanto o score experimental positivo **não** equivale a uma fonte segura de fichas persistentes. Um agente pode repetir Noites, criar contas ou automatizar o jogo.

Necessário antes de B:
1. Definir todas as fontes (`mint`): saldo inicial, claim diário gratuito, desafios automáticos verificáveis e bônus limitados, com cap por identidade/janela. Um ganho de score solo ilimitado **não** deve automaticamente creditar a carteira persistente.
2. Definir sumidouros (`burn`): entradas virtuais voluntárias, cosméticos por marcos quando legalmente permitido, serviços meramente estéticos; não vender vantagem para tirar fichas da circulação.
3. Prevenir 0-fichas como bloqueio total: prática gratuita permanente, Subsolo/recuperação e alternativa casual sem stake, sem pressionar compra. **Jamais vender fichas reais**, inclusive “resgate” de saldo.
4. Backend autoritativo N-031, ledger append-only/eventos idempotentes, validação server-side, limites por conta/dispositivo onde proporcionais e respeito à privacidade. Simular bots, duplicação, rollback, collusion, criação em massa de contas e corrida de transações.
5. Testar a economia em coortes sintéticas e com políticas adversariais. Reportar `mint-burn`, saldo mediano e concentração, insolvência, tempo de recuperação, Gini ou métrica explicitamente definida, custo operacional, frequência de fraude e incentivo a replay sem coerção.

## 6. Duelos e skill: não confundir prêmio com classificação

O duelo espelhado proposto 1v1/10 rodadas e a redistribuição zero-sum N-026 são **CANDIDATE**. Mirror RNG e modelo de draws divergentes permanecem O-01/O-02/O-24 OPEN.

Caso futuramente aprovado, concorrentes precisam de **condições de início equivalentes**, exposição de confronto normalizada, regras iguais, fontes informacionais equivalentes e resultado auditável. Uma entrada fixa de `x` créditos por jogador e pote `2x` é um exemplo de contabilidade de transferência (soma conservada antes de fees, que não estão aprovadas), não um valor de produto. Duas contas do mesmo dono poderiam manipular transferências; exigir proteção contra collusion e partidas forjadas. Rating principal deverá estimar habilidade sem contabilizar riqueza/stake diretamente (N-012).

## 7. Desafios e cosméticos: três propostas de distribuição

| Proposta | Funcionamento | Situação |
| --- | --- | --- |
| **R1 — marcos sem moeda** | concluir desafio verificável desbloqueia diretamente verso/moldura/título | Menor abuso e complexidade; ótima primeira alternativa conceitual |
| **R2 — moeda conquistável + compras premium segregadas** | desafios/marcos dão pontos cosméticos limitados; catálogo aceita pontos ou dinheiro real/uma carteira paga **se no futuro autorizado** | Mais flexível; exige dois saldos claros, UX e conformidade |
| **R3 — moeda única de três origens** | desafios, conversão fichas→moeda e compras com dinheiro real | Proposta do fundador **não aprovada**; mistura valor de jogo e de consumo, amplia farming/equivalência econômica |

**Preferência de análise:** R1 no primeiro experimento de recompensas; depois R2 caso exista interesse real por uma loja. **R3 requer gate excepcional de N-050** e não pode ser implementada como parte do MVP diante de N-009. Não converter `earned_cosmetic_points` nem `premium_purchase` para fichas, Foco, stake, sorte ou acesso competitivo. Evitar loot boxes pagas, prazo artificial de ofertas, vendas enganosas e incentivos de jogo compulsivo.

Cosméticos seguros plausíveis: versos de carta visíveis em salas, tema de mesa, molduras/títulos, avatares, efeitos opcionais de fim de rodada, emblemas e sons desativáveis. Não vender cartas numericamente melhores, hole revelada, Foco adicional, refresh de sorteio, status de ranking ou proteção contra derrota. Antes de fazer compras reais, auditoria jurídica/classificação/plataformas e desenho de reembolso/acessibilidade; o RFC não fornece autorização legal.

## 8. Protocolo de pesquisa e critérios de saída

### Pesquisa offline antes de qualquer código de banca

- Reusar cenários `DF-SYM-0.1`/CF de Noites H=5,10,20, payout 3:2 e 1:1. Separar políticas de habilitação de habilidades das políticas de stake; streams pareados quando comparáveis.
- Simular A0/A1 e, em desenho econômico apenas, B/C com agentes conservador, prudente, agressivo e oportunista informacional; nunca pressupor que um agente é solver perfeito se não for.
- Reportar por perfil: resultados **normalizados** e fichas nominais, EV e variância, IC de estimativas, insolvência/retorno à prática gratuita, concentração, sensibilidade a B₀ e stake, efeito do uso de double, políticas ótimas aproximadas versus decisões de iniciantes. Treino/avaliação separados.
- Fazer teste de incentivos (late betting, farm solo, bots com repetição, carteiras fictícias múltiplas, collusion em duelos, créditos duplicados e descontinuidade de conexão) **antes** de considerar economia persistente.
- Evitar transformar acaso de natural/21 em desafio pago; desafios de skill devem ser julgados pela decisão com informação disponível, não resultado realizado.

### Pesquisa humana

Manter `P2C-observation-v1` separado. O fundador relatou qualitativamente gostar de Cofre/Foco e confirmar a nova UX de Leitura/Manobra no navegador, mas isso é **n=1 informal, sem playtest controlado da banca**. Antes de alterar experiência: estudo de comparação de compreensão, duração, ansiedade/frustração pela banca, percepção de fairness, volatilidade, interesse em voltar, distinção rating vs fichas e dificuldades em saldo zero; registrar ordem dos modos e dados ausentes.

### Gate de aprovação para um laboratório A0/A1

- Fundador aprova **escopo isolado**, seed/cenários, condições, default de `B₀`, stake, terminalidade, política de double e teste; nenhuma escolha aqui autoriza Code.
- Validação matemática e testes de invariantes; nenhum comportamento novo no baseline ou default P2C.
- Revisão de fairness, acessibilidade e risco de compulsão; prática gratuita incondicional.
- Resultados da pesquisa offline e primeiras impressões humanas ajudam a escolher A0 ou A1, sem declarar diversão/monetização por premissa.

### Gate adicional para B/C, loja e qualquer pagamento

Modelo econômico testado (inflação/fraude), identidade e servidor auditáveis, regras de benefício claras, privacidade e conformidade jurídica/plataformas, custo de operação, migração versionada e nova autorização explícita. **Sem pagamentos, sem aposta monetária, sem cambialidade entre saldo jogável e ativos de valor real.**

## 9. Próximas decisões de contrato — ainda abertas

1. **Sequência resolvida (N-052):** começar por A0 e avaliar A1 depois. **Ainda OPEN (N-053):** saldo inicial, reserva, exposição, double, insuficiência e comportamento ao zerar.
2. Em um protótipo A0, o jogador fica sem fichas e encerra a Noite, ou segue a mesma rodada em prática não pontuável? Como comunicar essa consequência sem frustração?
3. Como medir habilidade independente de stake: rating por partidas espelhadas, score normalizado por oportunidade ou ambas as medidas?
4. Para cosméticos, priorizar **desbloqueio direto de desafio (R1)** versus **pontos cosméticos limitados (R2)**? O usuário sugeriu R3; nenhuma variante está aprovada.
5. Quais observações humanas reais justificariam investir na persistência B e em C multiplayer?

**Decisão do fundador (N-052 RATIFIED como sequência):** preparar o contrato para A0 e depois avaliar A1 somente se necessário e autorizado. Não vincular fichas à loja, não codificar A1/B/C/R2/R3 por esta decisão. N-053 OPEN e N-009/N-021/N-038/N-045/N-050 preservadas.

## 10. Rastreabilidade

- [ECONOMY-REWARDS-DIRECTION](ECONOMY-REWARDS-DIRECTION.md): objetivos fundadores e restrições.
- [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md): modalidades, ranking, antiabuso, Subsolo.
- [DECISION-REGISTER](DECISION-REGISTER.md): N-009, N-012, N-021, N-026–027, N-038, N-048–N-052 e N-053 OPEN.
- [OPEN-QUESTIONS](OPEN-QUESTIONS.md): O-01/O-02/O-10/O-11/O-16/O-22/O-23 preservadas.
- [PLAYTEST-P2C](PLAYTEST-P2C.md): roteiro de experiência sem resultados inventados.
- [LAB-P2B-F](LAB-P2B-F.md): valor simulado de Cofre/Foco, não política monetária.

## 11. Adendo da aprovação — 2026-10-19

**O fundador aprovou a sequência A0→A1**, que deixa de ser mera recomendação (N-052 RATIFIED apenas como plano experimental). O próximo gate é **descrever e validar o contrato operacional de A0** (N-053 OPEN): qual `B₀`, quando debitar/estornar exposições, como exigir cobertura de duas mãos e potenciais doubles, e o que ocorre com 0 fichas sem impedir prática gratuita. A0 não implementa persistência, apostas variáveis, loja nem score/rating por riqueza. **Não transformar saldo fictício em simple offset de `match_points` e chamá-lo banca com risco real se ele puder ficar negativo ou não controlar exposições.** Uma projeção puramente informativa é permitida somente quando rotulada honestamente como demonstração visual, distinta da banca funcional a ser desenhada. A1 ainda é apenas próximo estágio de comparação, não contrato de código.

## Especificação A1 pré-cartas — Issue #32 (2026-10-20)

[BANKROLL-A1-RFC](BANKROLL-A1-RFC.md) documenta, sem código, exposição igual e limitada pré-deal por rodada (A1a), por Noite (A1b) e controle fixo A0.1 (A1c). N-055 CANDIDATE registra a recomendação de pesquisa A1a somente; bandas 5/10/20, reserva `4s`, solver condicional e métrica normalizada seguem pendentes de aprovação. A1 continua não autorizada para implementação. O contrato e os parâmetros A0.1 aprovados não são alterados. A evidência de saldo/score A0-V é computacional e não responde a incentivos ou preferências humanas sob stakes variáveis.
