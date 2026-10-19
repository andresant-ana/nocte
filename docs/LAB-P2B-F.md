# NOCTE-P2B-F — solver condicional e estratégia intertemporal

**Escopo:** Issue #16. Solver e comparação offline para a configuração isolada `DF-CF-0.1-lab` de N-046/N-047.
**Status:** evidência COMPUTACIONAL EXPERIMENTAL; não muda o status de N-042 a N-047 nem ratifica custos, timing, distribuição ou regra final.
**Preservação:** P2B-E, motor DF-SYM-0.1, solver P1B, artefatos P1A–P1C e interface P2A permanecem como baseline.

## 1. Pergunta e conclusão curta

O P2B-E mostrou que políticas fixas ou heurísticas podem perder para o Duas Faces original. Esta etapa substitui composição sem Cofre, Manobra por distância a alvo e Leitura heurística por valores condicionais exatos dentro da rodada; para o saldo entre rodadas, usa programação dinâmica aproximada e avaliação com sementes independentes.

Com 1.000 Noites por célula e 512 cenários de treino por estágio, a política intertemporal teve ganho esperado pareado estimado de **15,18 / 21,20 / 26,42 pontos por Noite** sobre DF-SYM-0.1 em H=5/10/20, payout 3:2; os ICs pareados de 95% ficaram acima de zero. Em H=10 e payout 1:1, o ganho estimado foi **21,17 pontos**. São resultados do perfil experimental sob reposição infinita, e não estimativas de habilidade humana ou balanceamento final. No conjunto de teste pareado atual, agentes herdados do P2B-E marcaram eager H=10/3:2 = −2,27 e horizon = −1,35 pontos vs baseline; a política condicional/intertemporal estima +21,20. As regras são as mesmas, mas a nova comparação otimiza o Cofre visível e todas as decisões atuais sob valores condicionais; o contraste **não isola causalmente uma única mudança de solver** nem substitui os artefatos P2B-E anteriores.

Manobra oferece valor positivo em muitos estados elegíveis e consome a maior parte do saldo. Leitura continua opcional e matematicamente útil em estados específicos, mas o custo de 2 Focos e o valor de guardá-los tornam o uso raro na política avaliada, sobretudo em H=10/20. Isso recomenda um protótipo solo Cofre + Foco separado para medir compreensão e escolha humana, mantendo DF-SYM como baseline selecionável; não recomenda canonizar regras nem substituir P2A.

## 2. Informação, unidades e formulação

O solver recebe somente as quatro cartas do jogador, carta aberta do dealer, Cofre aberto, orçamento de Foco restante, rodadas restantes, `beliefState` e identificação do perfil. Antes do peek, a crença é `dealer-hole-unknown-before-peek`; nenhuma função de decisão recebe a hole card, seed ou compras futuras. O cálculo integra o resultado do peek. Na ramificação de dealer natural, não há janela de Foco e o saldo segue para a Noite. Na ramificação negativa, o buraco é condicionado a não formar natural. Só uma decisão Leitura abre sub-ramificações privadas por rank do buraco; o controlador pode então escolher Manobra para aquele rank. A API retorna opções legais, Q-value com continuação, EV corrente exato, custo, composição/troca proposta, valor marginal de Read/Manobra e provenance.

Em unidades de exposição inicial (uma mão vale 1; dez pontos de confronto), para `f` Focos e `h` rodadas restantes:

```text
V[0, f] = 0                         # o saldo expira no fim da Noite
V[h, f] ≈ média_de_treino [ max_partição { q*(S_natural + V[h-1, f])
                        + (1-q)* max_ação_de_recurso (EV_atual + V[h-1, f-custo]) } ]
```

`q` é a probabilidade exata de natural do dealer dada a carta aberta. Com Leitura, `max_ação_de_recurso` compara, para cada rank do buraco condicionado ao peek negativo, conservar, Manobra e a continuação após cada escolha; sem Leitura, Manobra usa apenas informação pública. Manobra não pode ser aplicada a uma mão natural/terminal. A composição é escolhida antes do peek e maximiza o EV ex-ante. Se o dealer abrir natural, o termo de continuação usa `f` sem gasto.

Uma vez fixado um estado de mão e uma crença do dealer, a recursão do jogador, a distribuição S17 do dealer, a atualização do buraco por peek e as opções atuais são **EXATAS** sob rank infinito com reposição e os pagamentos configurados. O valor da expectativa sobre futuras distribuições/rodadas e a política intertemporal são **ESTIMADOS** por sample-average Bellman. Não chamamos o resultado de ótimo global exato.

O espaço de ações sempre inclui conservar. Portanto, com valores de continuação exatos, a política ótima com habilidades opcionais não pode ter EV inferior à política sem elas: em qualquer estado, conservar reproduz a alternativa básica. O DP estimado não oferece garantia de dominância fora da amostra por erro finito de treino; o relatório testa essa propriedade para a camada de opção atual e reporta separadamente resultados simulados.

## 3. Métodos e reprodutibilidade

- **Treino:** recursão regressiva para `h=1..H`, estados `F=0..3`, com 512 cenários independentes por estágio; sem seleção baseada na avaliação.
- **Erro do treino:** cada Q-stage reporta SE/IC95 amostral por `h,F`, condicional aos valores `V[h-1,*]` já ajustados. Essa dispersão quantifica amostras de deals naquele estágio, não propaga incerteza das tabelas anteriores e não é IC total do Bellman.
- **Avaliação:** 1.000 Noites independentes para cada célula. Seed raiz `nocte-p2b-f-20261018`; treino usa prefixo isolado `NOCTE-P2B-F:train:`, e avaliação usa exatamente a raiz/lane versionada P2B-E para o pareamento com políticas herdadas.
- **Políticas herdadas:** também roda `conserve/eager/horizon` da P2B-E com a seed/lane `cofre-foco-named-lanes-v1:nocte-p2b-f-20261018`, coincidente com os cenários usados na avaliação nova; agentes antigos e novos são exibidos em paralelo. `conserve` deve coincidir com o controle baseline.
- **Pareamento:** baseline, conservar, imediato e intertemporal recebem as mesmas quatro cartas, upcard/hole, Cofre e lanes nomeadas de compras por rodada. O acoplamento reduz ruído, não representa sapato finito.
- **Políticas:** `baseline` usa P1B em DF-SYM-0.1; `conserve` otimiza a composição sob perfil CF com orçamento 0; `immediate` otimiza EV atual sem valor de continuação; `intertemporal` escolhe com a tabela `V[h-1,f]` treinada em separado.
- **Limiar de ação:** escolhe o maior Q-value ex-ante; empates menores que `1e-12` em unidades de exposição conservam a preferência já listada. Não há limiar heurístico calibrado.
- **Métricas:** média de pontos esperados condicionais da política escolhida, placar efetivamente simulado, diferenças pareadas por Noite, uso/expiração de Foco e diagnósticos de valor marginal Read/Manobra. IC normal de 95% sobre diferenças pareadas por Noite; sem ajuste de multiplicidade.
- **Oráculo:** limite superior de uma rodada com hole conhecida gratuitamente antes da composição, sem draws futuros conhecidos; exatamente enumerado e explicitamente não realizável. Não é um oráculo global de Noite nem um agente.
- **Custo:** `execution.elapsedMs` registra wall time do comando completo (treino, avaliação, políticas herdadas e exemplos); tempo/Node são metadados ambientais e ficam fora do resultado determinístico.
- **Escalas:** pontuação em pontos líquidos por Noite; cada mão abre com exposição 10. Valores Bellman internos são convertidos por 10 para as tabelas em pontos.

Comandos, na raiz, para reconstruir as quatro células congeladas:

```powershell
pnpm install --frozen-lockfile
pnpm cofre-foco-conditional -- --seed nocte-p2b-f-20261018 --nights 1000 --horizon 5 --payout 3:2 --training 512
pnpm cofre-foco-conditional -- --seed nocte-p2b-f-20261018 --nights 1000 --horizon 10 --payout 3:2 --training 512
pnpm cofre-foco-conditional -- --seed nocte-p2b-f-20261018 --nights 1000 --horizon 20 --payout 3:2 --training 512
pnpm cofre-foco-conditional -- --seed nocte-p2b-f-20261018 --nights 1000 --horizon 10 --payout 1:1 --training 512
```

O resultado científico do JSON é determinístico; `execution` contém elapsedMs e versão Node, que variam por ambiente. Os arquivos com tabelas de valor, SE/IC condicional de treino, políticas P2B-E e novas, seeds, métricas, casos e limitações estão em `lab/results/p2b-f-*.json`. Tempos observados neste checkout: H5≈23 s, H10/3:2≈41 s, H20≈93 s e H10/1:1≈49 s.

## 4. Evidência quantitativa

Todas as diferenças usam os mesmos cenários para a política e DF-SYM-0.1. Tabela: valor esperado condicional exato da política selecionada, e diferença pareada vs baseline; estimar a política intertemporal exige a tabela Bellman amostral descrita acima.

| Perfil experimental | EV baseline / Noite | Ganho imediato vs baseline (IC 95%) | Ganho intertemporal vs baseline (IC 95%) | Ganho realizado intertemporal (IC 95%) | Ganho esperado intertemporal vs imediato |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3:2, H=5 | 19,17 | +7,46 [7,17; 7,75] | **+15,18 [14,79; 15,57]** | +14,62 [13,28; 15,95] | +7,72 |
| 3:2, H=10 | 37,98 | +7,39 [7,10; 7,68] | **+21,20 [20,84; 21,56]** | +19,85 [18,43; 21,26] | +13,81 |
| 3:2, H=20 | 76,43 | +7,31 [7,04; 7,58] | **+26,42 [26,08; 26,77]** | +25,03 [23,65; 26,40] | +19,11 |
| 1:1, H=10 | 28,93 | +7,32 [7,03; 7,61] | **+21,17 [20,81; 21,53]** | +19,69 [18,26; 21,12] | +13,85 |

Resumo de uso da política intertemporal (médias por Noite):

| Perfil | Foco gasto (de 3) | Foco expirado | Leituras | Manobras | Estados elegíveis com valor marginal estimado positivo para Leitura |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3:2, H=5 | 2,702 | 0,298 | 0,141 | 2,420 | 163 / 3.518 (4,6%) |
| 3:2, H=10 | 2,870 | 0,130 | 0,030 | 2,810 | 31 / 5.674 (0,55%) |
| 3:2, H=20 | 2,936 | 0,064 | 0,008 | 2,920 | 8 / 10.291 (0,08%) |
| 1:1, H=10 | 2,880 | 0,120 | 0,032 | 2,816 | 31 / 5.688 (0,55%) |

Leitura só é avaliada no denominador quando resta Foco suficiente e existe mão ativa após composição. O contador de “valor positivo” compara a melhor opção com Read à melhor sem Read, incluindo o valor de continuação estimado; os 31 casos H=10/3:2 foram selecionados pelo agente. Esse corte mede oportunidades do modelo, não uma preferência humana. Manobra teve margem estimada positiva em 2.480/4.673 (H=5), 2.950/8.266 (H=10), 3.074/15.456 (H=20) estados elegíveis 3:2; uso por Noite foi limitado pelo orçamento de 3 e pela regra de uma Manobra por rodada. A margem média pode ser negativa porque inclui todos os estados elegíveis; o solver seleciona Manobra apenas quando seu Q-value condicionado supera a alternativa.

Agentes herdados da P2B-E, nos mesmos cenários pareados e com política de recurso anterior, tiveram:

| Perfil 3:2 | H=5 | H=10 | H=20 |
| --- | ---: | ---: | ---: |
| `conserve` (controle) | 0,00 | 0,00 | 0,00 |
| `eager` — delta vs baseline [IC 95%], pontos/Noite | −2,25 [−3,23; −1,27] | −2,27 [−3,21; −1,33] | −2,17 [−3,10; −1,24] |
| `horizon` — delta vs baseline [IC 95%], pontos/Noite | −0,87 [−1,55; −0,19] | −1,35 [−2,15; −0,55] | −1,41 [−2,25; −0,57] |

Em H=10/1:1, os deltas herdados foram eager −2,31 [−3,25; −1,37] e horizon −1,35 [−2,17; −0,53]. Conserve coincide exatamente com o baseline.

### 4.1 Limite superior local e três estados de decisão

O oráculo de hole conhecida teve EV exato de 43,01 / 82,48 / 161,64 pontos/Noite em H=5/10/20 3:2, e 73,85 em H=10 1:1. Ele conhece a hole antes da composição sem pagar Leitura e não conhece compras futuras; os gaps pareados sobre o EV atual da política intertemporal foram 8,67 / 23,30 / 58,79 / 23,75. É um limite de informação para uma rodada, não valor global de Noite.

Os JSON H=10 registram exemplos reproduzíveis sem revelar a hole real: (a) cards 5-2-3-10, up 5, Cofre 6; o solver escolhe outra partição Luz/Sombra e a Manobra troca a segunda carta de Luz pelo Cofre (EV atual −0,096 para +0,591 unidades de exposição); (b) cards 4-10-10-9, up 10, Cofre 3, saldo 3 e uma rodada: Read+Manobra tem marginal estimada positiva de +0,194 unidade; (c) cards 9-7-7-2, up 3, Cofre 4, saldo 1 e 8 rodadas: imediatista escolhe Manobra. O Q-value intertemporal de gastar é 3,631 contra 3,645 ao conservar; EV corrente de gastar é 1,036 contra 0,266 ao conservar. O valor de continuação estimado favorece poupar. Nenhum caso inclui a hole efetiva.

Os resultados de placar realizado acompanham a direção do EV, mas são uma amostra finita e ruidosa; não substituem a expectativa condicional. O cenário de payout 1:1 foi uma sensibilidade, não uma mudança de regra.

## 5. Testes e garantias

- Cross-check independente da distribuição de dealer conhecido por enumeração recursiva, incluindo resultado após hole não natural revelado.
- Rejeição explícita de uma hole que contradiz peek negativo; a API não aceita a informação de dealer natural como ramo Leitura.
- Regra de Ás+10 pós-Manobra como 21 comum sem bônus natural.
- Sem Focus, EV de composição equivale ao solver P1B; adicionar habilidades não reduz EV da opção ótima na mesma distribuição.
- Reprodutibilidade da tabela de treino, monotonicidade do valor com orçamento, controle `conserve` idêntico ao baseline e conservação do orçamento/expiração.
- Erros-padrão/IC95 por estágio e orçamento de treino, condicionais às tabelas de continuação anteriores.
- Testes não modificam exports nem resultados de DF-SYM/P1B/P2B-E.

## 6. Limitações e recomendação

1. Expectativa entre rodadas é sample-average com 512 cenários por estágio; SE/IC de treino é condicional à tabela anterior, sem propagação de incerteza. Não calculamos solver global exato nem regret contra um oráculo de Noite com informação perfeita. O limite de uma rodada não é um regret global. A confiança de avaliação condiciona-se à política treinada.
2. Aproximação infinita com reposição; sem sapato físico, multiplayer, espelhamento de hole-card, adversários ou viés de informação entre assentos.
3. IC normal por Noite, sem correção por múltiplas comparações. 1.000 Noites e 512 cenários podem bastar para este contraste grande, mas não para ajustar custos finos ou fechar equilíbrio.
4. Nenhum dado humano: clareza, aprendizado, interesse, repetição, percepção de justiça e preferência permanecem desconhecidos.
5. A grande diferença em relação ao eager P2B-E não é uma repetição pareada daquele agente: composição passou a incluir o Cofre aberto e as políticas agora resolvem decisões condicionais. Não atribuir o ganho a apenas Leitura, Manobra ou DP.

**Próximo protótipo recomendado:** após revisão desta evidência matemática, criar uma variante solo jogável `DF-CF-0.1-lab` selecionável ao lado do P2A/DF-SYM baseline, preservando consentimento, cenário pareado e instrumentação sem registrar identidade. Começar playtest de compreensão e repetitividade antes de balanceamento fino. Manter N-045 OPEN e N-046/N-047 EXPERIMENTAL; sem online, ranking ou economia.
