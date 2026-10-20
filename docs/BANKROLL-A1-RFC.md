# NOCTE-P4-A1-D — RFC de exposição pré-cartas

**Versão:** `BANKROLL-A1-RFC-v0.1`  
**Data:** 2026-10-20  
**Issue:** [#32](https://github.com/andresant-ana/nocte/issues/32)  
**Status:** **CANDIDATE / OPEN — proposta documental para revisão do fundador. A1 não está autorizada para implementação nem para uso como regra final.**  
**Escopo:** modelos de exposição fictícia em laboratório solo; nenhum código de jogo, motor, UI, carteira ou ranking é alterado.  
**Baseline preservada:** `BANKROLL-LAB-A0-0.1` conforme N-053/N-054 EXPERIMENTAL, sem alteração de parâmetros ou resultados.

## 1. Resumo da recomendação

Recomendo avaliar **A1a — escolha de exposição limitada a cada rodada, antes de qualquer carta** como um futuro experimento solo isolado, comparado em protocolo pareado contra o A0.1 congelado. Para a matriz inicial de pesquisa, usar apenas como valores **ilustrativos CANDIDATE** `s ∈ {5, 10, 20}` por mão, com igualdade entre Luz e Sombra. Não são valores aprovados. Manter como controles A0.1 (`s=10`) e uma condição A1b se o estudo posterior precisar medir escolha fixa por Noite.

A1a testa diretamente a hipótese de que escolher risco de novo a cada rodada cria uma decisão percebida como relevante. Traz também o maior risco de converter o seletor em “escolha sempre o maior”: os resultados A0.1 apresentam `match_points` médio positivo para as três políticas avaliadas. Se o objetivo for apenas maximizar lucro nominal esperado, exposição maior tende a multiplicar o retorno modelado e sua variância, sem necessariamente acrescentar habilidade de jogo. Esse é um incentivo a investigar, não uma conclusão de que pessoas escolherão assim.

O contrato futuro deve preservar a banca A0 por Noite e testar uma reserva de pior caso `R(s)=4s` em toda rodada financiada. O motor e a classificação continuam independentes do valor de `s`: score de habilidade é comparável em exposição-base 10; resultado financeiro é medido em ledger separado. Foco permanece um recurso de ação não comprável e sem conversão com fichas. Sua utilidade marginal pode interagir com stake e horizonte, então o solver P2B-F não deve ser chamado de ótimo para A1 sem ser reavaliado.

**Gate obrigatório:** o fundador precisa revisar este RFC e autorizar uma Issue experimental separada antes de qualquer simulação A1 que modifique políticas por stake, implementação de UI ou uso de parâmetros A1. A presente recomendação não altera N-052, N-053, N-054, N-050 ou N-021.

## 2. Autoridade e preservação de A0.1

N-052 ratifica somente a sequência de pesquisa A0→A1. N-053 e N-054 autorizam exclusivamente o perfil A0.1 EXPERIMENTAL. Os seguintes valores e comportamentos são o controle congelado e **não são recalibrados por este RFC**:

| Elemento A0.1 | Baseline preservada |
| --- | --- |
| Banca inicial por Noite | `B₀=150` fichas fictícias |
| Duração principal | `H=10` rodadas; H=5/20 permanecem sensibilidades A0, não opções da UI |
| Exposição | 10 por mão, igual entre Luz e Sombra |
| Double | As ações legais do motor permanecem disponíveis; sem restrição incremental de saldo |
| Cobertura | `R=40` por rodada financiada, para duas mãos e dois doubles |
| Settlement | Uma única aplicação de `round.score` após settlement do motor |
| Insuficiência | Se a banca após settlement ficar `<40`, as rodadas restantes passam irreversivelmente a prática gratuita; saldo congela |
| Reinício/expiração | Nova Noite reinicia em 150; concluir ou abandonar expira o saldo |
| Separações | Banca não afeta `match_points`, Foco, modo básico, P2A, `DF-SYM-0.1`, `DF-CF-0.1-lab` ou classificação |

As opções A1 abaixo são cenários de comparação **CANDIDATE** construídos em torno desse controle. Nenhuma substitui A0.1. Não são retomados split entre mãos (N-021 REJECTED), late betting, stakes assimétricos, dívida, empréstimo, rebuy, saldo persistente, loja, compra de fichas, transferência, conversão monetária ou monetização.

## 3. Evidência A0.1 relevante e alcance

`docs/LAB-P4-A0-V.md` e os quatro JSON em `lab/results/p4-a0-v-*.json` descrevem replays determinísticos de trajetórias de motor. Para cada política e Noite, o simulador cria uma trajetória de `round.score` e aplica-a a saldos iniciais 60/100/150/200. O saldo **não** participa da escolha de ação, alocação de Foco ou geração de draws. A evidência mede quando o limiar A0 teria trocado a trajetória por prática, condicionada às políticas; não simula resposta a uma aposta.

No perfil principal H=10, payout 3:2, n=1.000 e exposição 10 por mão, o score médio modelado por Noite foi `37,185` para `conserve`, `44,185` para `myopic` e `58,430` para `intertemporal`. Com B₀=150, a fração de Noites com ao menos uma rodada em prática foi respectivamente 1,0% [IC Wilson 95% 0,5–1,8], 0,6% [0,3–1,3] e 0,7% [0,3–1,4]; a fração média financiada foi 99,8–99,9%. Com B₀=60, prática ocorreu em 27,8–36,2% das Noites. Para 1:1, H=5 e H=20, ver as tabelas e intervalos completos no relatório.

Essas médias positivas tornam plausível o incentivo nominal dominante de stake, mas não estimam retorno sob stake variável. A0-V não treinou agentes condicionados a `s`, não alterou a estratégia conforme B, não mediu a distribuição de utilidade de jogadores, e não oferece resultados humanos. As relações lineares abaixo são identidades contábeis condicionais ou exemplos de pior caso; não são nova simulação, previsão de A1 nem evidência de que a banca A0.1 esteja calibrada.

## 4. Modelos comparados

Em todos os modelos, `s` significa exposição inicial por mão, idêntica para Luz e Sombra. A escolha ocorre antes de chamar o fluxo que distribui ou revela cartas, Cofre, upcard ou qualquer informação da rodada. Uma vez escolhido, `s` não muda após deal, peek, composição ou resultado parcial. Nenhum modelo concede aposta por mão, split Luz/Sombra ou aposta pós-informação.

| Modelo | Decisão de stake | Reserva e insuficiência a pesquisar | Benefício principal | Risco principal | Leitura |
| --- | --- | --- | --- | --- | --- |
| **A1a — por rodada** | A cada rodada, escolher um `s` de uma lista limitada antes do deal; mesmo `s` nas duas mãos. Valores exemplo `5/10/20`. | Reservar `4s`; só stakes elegíveis para B atual aparecem. Se nem o menor `4s` couber, prática gratuita pelo restante da Noite. | Isola uma decisão de risco recorrente; permite observar adaptação à banca e ao horizonte. | Se maior stake tem EV nominal positivo, seletor pode ter escolha dominante; comportamento condicionado ao saldo pode complicar interpretação. | **Recomendada para um único futuro piloto**, sem aprovação de números. |
| **A1b — por Noite** | Escolher uma única faixa antes da primeira carta da Noite; fixa até completar/abandonar. | A mesma reserva `4s` a cada rodada; se B ficar abaixo, prática gratuita sem reduzir o stake no meio da Noite. | Menos cliques; isola preferência de risco prévia e evita mudança de stake entre rodadas. | Escolha inicial pode determinar duração financiada; difícil distinguir preferência por stake de aversão a ficar em prática. | Alternativa se playtest mostrar fricção de A1a. |
| **A1c — controle sem variabilidade** | Fixo `s=10`, conforme A0.1. | `R=40`, B₀=150, H=10 e prática abaixo de 40, sem mudança. | Controle histórico já implementado e comparável; baixo risco de escopo. | Não mede valor percebido de um seletor de stake. | Deve estar em todas as comparações como controle A0.1. |

### Matriz de decisão

| Critério | A1a | A1b | A1c |
| --- | --- | --- | --- |
| Escolha durante a Noite | Repetida, pré-deal | Nenhuma após o início | Nenhuma |
| Possibilidade de ajustar risco ao saldo | Sim, somente entre rodadas e antes do deal | Não | Não |
| Pressão para apostar máximo em EV nominal positivo | Alta | Alta na escolha inicial | Inexistente |
| Carga de interação | Maior | Baixa | Igual a A0 |
| Cobertura máxima na lista exemplo | 80 (`s=20`) | 80 | 40 |
| Qualidade para testar habilidade estratégica de cartas | Não presumir; stake pode apenas escalar resultado | Não presumir | Não adiciona dimensão de stake |
| Comparabilidade com A0 | Parear deal/política; analisar também exposição normalizada | Parear Noites por stake fixado | Exata no perfil A0.1 |

## 5. Reserva, solvência e liquidação

### 5.1 Invariante de cobertura

Sob exposição `s` por mão e a regra atual de um double legal por cada uma das duas mãos, a exposição máxima que pode perder-se na rodada é:

```text
exposição inicial: Luz s + Sombra s = 2s
exposição adicional máxima em doubles: Luz s + Sombra s = 2s
reserva de pior caso: R(s) = 4s
pré-condição da rodada financiada: Bᵣ ≥ 4s
```

Com `Eᵣ=4s` reservada e não debitada, disponibilidade informativa `Aᵣ=Bᵣ−Eᵣ`. A reserva garante `Δᵣ ≥ −4s`, logo `Bᵣ₊₁=Bᵣ+Δᵣ ≥ 0`. Só o resultado final do motor liquida banca; libera-se a reserva e aplica-se a variação uma vez. Double permanece exatamente tão legal quanto no motor. Não recortar score, dívida, saldo negativo, double recusado por saldo ou ajuste de exposição em mão ativa.

| Stake `s` por mão | Exposição inicial nas duas mãos | Reserva `4s` / perda máxima | Elegibilidade com B₀=150 | Pior sequência de perdas máximas antes de não caber a rodada seguinte* |
| ---: | ---: | ---: | --- | ---: |
| 5 (exemplo) | 10 | 20 | Elegível | 7 rodadas |
| 10 (A0.1) | 20 | 40 | Elegível | 3 rodadas |
| 20 (exemplo) | 40 | 80 | Elegível | 1 rodada |

`*` Fórmula, começando B₀ e financiando quando `B≥R`: `n_funded = floor((B₀−R)/R)+1` quando B₀≥R; cada rodada é uma perda máxima `−R`. Ao liquidar uma perda em B=R, o saldo vai a zero e as próximas rodadas são prática. Para B₀=150 e reserva 20, as sete perdas deixam 10; a 8ª não cabe. Para reserva 40, três perdas deixam 30; para 80, uma perda deixa 70. Esses são cenários adversariais aritméticos, não frequências estimadas.

Na lista hipotética `{5,10,20}`, a decisão por rodada deve filtrar elegibilidade pelo saldo **antes** do deal: com B<20, prática; 20≤B<40, somente 5; 40≤B<80, 5 ou 10; B≥80, todas. Se stake for escolhido uma vez por Noite (A1b), B₀=150 comporta as três opções no início; não se deve baixar stake automaticamente se a banca cair abaixo de `4s` — a transição seria prática gratuita, como em A0.1. A política exata de prática, inclusive retenção de Foco e pontuação, requer aprovação específica para A1; a sugestão é manter o comportamento de A0.1 para a comparação, sem alterar o motor.

### 5.2 Resultado financeiro não é ponto de habilidade

Para stakes inteiros, um settlement simples ilustra a escala: vitória regular de uma mão `+s`, derrota regular `−s`, push `0`, double vencedor `+2s`, double perdedor `−2s`, natural vencedor 3:2 `+1,5s`. Perda máxima nas duas mãos dobradas é `−4s`. Para natural 1:1, `+s`; ambos os payouts continuam sujeitos ao perfil experimental selecionado, sem ratificação de regra de jogo.

O stake 5 produz pagamentos naturais em incrementos de 2,5 fichas sob 3:2. Arredondar para ficha inteira enviesaria EV e solvência. Qualquer implementação futura que retenha `{5,10,20}` precisaria representar ao menos meios de ficha (ou unidade inteira menor, como décimos) de modo exato. Essa representação é OPEN, não escolhida aqui.

Se `S₁₀` for o settlement do motor sob exposição-base 10 e as regras de exposição forem lineares, uma projeção financeira de stake `s` poderia ser `Δbank = (s/10) × S₁₀`. Essa é uma transformação do ledger, não uma alteração de `match_points`. A derivação deve cobrir doubles e payout de natural, usar aritmética racional/integer ticks sem arredondamento e testar todos os outcomes. Se o motor tiver efeitos não lineares, eles precisam ser enumerados antes de usar essa transformação.

### 5.3 Double, insuficiência, repetição e expiração

- A reserva máxima por rodada mantém ambos os doubles legais sem depender do saldo restante depois de escolher `s`.
- Cancelar a escolha pré-deal não consome Foco, banca ou oportunidade de ação; nenhuma reserva é liquidada. Confirmação inicia uma única rodada identificada por `night_id/round_id`.
- Uma escolha duplicada/clique repetido não deve iniciar dois rounds nem liquidar duas vezes. Liquidação é idempotente pelo ID da rodada e exclusivamente pelo resultado resolvido do motor.
- Se B não cobrir o menor stake de A1a (ou o stake fixo A1b), prática deve ser gratuita e irreversível pelo resto da Noite, preservando o score do modo e congelando o ledger. Não há crédito/dívida/recarga.
- Concluir ou abandonar encerra e expira banca/reserva. Iniciar explicitamente outra Noite inicia B₀=150 somente no laboratório futuro que adote o controle A0; não transfere saldo.

Esses itens são proposta para comparar, não uma extensão implícita da implementação A0.1.

## 6. Incentivos: lucro, risco e decisões de jogo

### 6.1 Incentivo nominal potencialmente dominante

No relatório A0-V, payout 3:2, H=10, os scores médios foram +37,185/+44,185/+58,430 por Noite para `conserve/myopic/intertemporal`. Se todas as decisões, frequência financiada e condições forem mantidas, e o payoff for homogêneo em `s`, multiplicar stake por `k` multiplica **tanto o EV nominal quanto a variância por `k²`** (a média multiplica por `k`; o desvio-padrão também por `k`). Para uma política maximizadora apenas de valor nominal esperado e sem utilidade de risco, escolher o maior stake disponível é então a hipótese nula estratégica, não evidência de maior perícia.

Essa extrapolação falha quando stake muda quais rodadas são financiadas, a prática congela saldo, a política responde à insolvência, ou a utilidade penaliza perdas. O modelo A0-V aplicava scores do motor depois da geração e não pode fornecer probabilidades A1 de ruína, lucro esperado realizado ou escolha humana. Não tomar “retorno esperado positivo” como fato geral do produto; é um sinal observado somente para essas políticas, payout, horizonte e regras modeladas.

### 6.2 O que stake pode e não pode acrescentar

Escolher `s` pode representar tolerância a risco, gerenciamento de orçamento e compreensão de exposição. Isso pode ser uma escolha envolvente sem elevar a habilidade das decisões de Luz/Sombra. Para afirmar que acrescentou profundidade, seria necessário mostrar escolhas diversas e responsivas ao estado/horizonte sob objetivos definidos, com política benchmark e sem ganho mecânico por escolher sempre o máximo.

Comparar pelo menos dois objetivos para agente: (1) maximizar retorno nominal esperado; (2) utilidade/risco explicitamente especificado antes da análise, por exemplo crescimento de saldo sob restrição de probabilidade de prática. Não misturar uma utilidade inventada depois de ver resultados com “estratégia ótima”. O experimento deve também incluir uma política stake-fixa 10, uma política stake-máximo elegível e uma política prudente pré-registrada; separar treino de avaliação e fazer comparações pareadas com os mesmos cenários.

Uma alternativa de design é recompensar habilidade com score normalizado fixo, deixando a stake apenas como narrativa de risco e P&L. Isso resolve inflação de ranking nominal, mas não elimina o incentivo a maximizar o saldo de sessão. Se escolha máxima domina nas métricas aceitas, o próximo passo deve ser remover variabilidade ou reformular a função objetivo, não aumentar bônus para stakes altos.

## 7. Foco e stake: recursos ortogonais com interação estratégica

Foco é um orçamento experimental escasso de ações (N-046/N-047); banca é cobertura de exposição fictícia A0/A1. São grandezas distintas: sem conversão, compra, transferência, regeneração por saldo ou custo de stake em Foco. A configuração CF, os custos/efeitos e a janela de Leitura/Manobra não mudam neste RFC.

Embora separados, os valores estratégicos podem interagir. Se as ações de Foco alteram a distribuição de vitória/perda e o payout cresce com `s`, o valor monetário esperado de Manobra/Leitura pode crescer proporcionalmente à exposição. Se o agente maximiza score normalizado, essa relação pode permanecer invariante sob escala linear; se maximiza solvência ou aversão à perda, o valor-sombra de manter Foco dependerá de `B`, `s` e rodadas restantes. Portanto:

- reutilizar o motor CF e as regras de Foco sem alteração;
- não copiar os valores de continuação do P2B-F nem declarar ótimo seu solver para stakes A1;
- construir política/solver com estado observável `{B, stake elegível, Foco, horizonte restante, informação pública da mão}` quando objetivo financeiro depender de B;
- treino e teste separados; reservar um conjunto de cenários pareados com A0;
- reportar resultado econômico e uso de Foco separadamente, inclusive efeitos condicionais de stake e rodadas financiadas;
- verificar que Leitura não acessa hole/deal futuro e que stake foi travado antes da informação da rodada.

Não presumir que stakes altos “compram” mais Foco ou constituem melhor decisão. Nenhuma aposta muda classificação, disponibilidade de Foco ou fairness de partida.

## 8. Skill, exposição e classificação

Manter três métricas separadas em qualquer futuro relatório:

1. **`match_points` / skill:** pontuação do motor sob exposição-base de comparação 10, com oportunidades e regras versionadas; stake financeira não multiplica a nota competitiva.
2. **Retorno de banca:** delta nominal em fichas pela função de liquidação aprovada para o stake escolhido; mostra também stake médio, exposição máxima, prática e volatilidade.
3. **Retorno normalizado por exposição:** medida descritiva secundária, nunca substituto silencioso do ranking. Definir previamente seu denominador. A opção mais comparável é mostrar o retorno em unidade-base (`10 × Δbank/s`) e, separadamente, retorno sobre exposição efetiva incluindo doubles; essas duas razões respondem perguntas diferentes.

Exemplo para uma vitória regular, stake `s=5` versus `s=20`: banca `+5` versus `+20`; score de habilidade da mesma decisão/cenário permanece o mesmo em ambos os casos. Para natural 3:2, delta de banca `+7,5` versus `+30`; score normalizado segue a regra fixa do motor. A perda máxima de uma Noite ou o total de saldo nunca melhora rating.

Para comparação de skill, preferir cenários pareados com mesmo deal, regra, informação e política de observação; não ordenar pessoas por saldo, lucro nominal, stake, número bruto de rounds ou quantia arriscada. Rating concreto (Glicko-2 ou alternativa) permanece CANDIDATE/OPEN conforme N-013. A1 não seleciona fórmula de rating.

## 9. Informação prévia, reinício e confiança

Stake precisa ser validado e fixado antes de qualquer chamada que materialize cartas ou exponha resultado, dealer, Cofre, seed ou draw futuro. No cliente atual, isso só pode ser uma ordem de chamadas/UI, não uma garantia de segurança. A1 local não deve reivindicar integridade de aposta nem multiplayer autoritativo.

Casos adversariais para uma futura implementação e para o desenho do teste:

- não permitir alterar stake após deal, peek, acesso a Leitura ou qualquer carta revelada;
- não vazar hole card, próximas cartas ou seed nas projeções da escolha de stake;
- descartar/abandonar expira a Noite e não devolve banca para nova tentativa; medir a taxa de abandono;
- impedir replay de liquidação, double start e dupla confirmação no mesmo `round_id`;
- registrar versão da configuração e da política no relatório sem expor seed nos dados de interface;
- distinguir limite local do laboratório de validação server-authoritative ainda não implementada.

Como cada Noite A0 reinicia B₀, o jogador poderia recarregar a página local para criar outra sessão sem persistência. A0 e A1 client-only não conseguem impedir essa reentrada ou tentativas múltiplas. Em experimento solo, tratar isso como limitação metodológica e não proteger saldo como ativo. Qualquer afirmação de competitividade exige servidor autoritativo e novo gate; não adicionar persistência a esta RFC.

## 10. Plano de simulação e avaliação

### Etapa 0 — congelar protocolo antes da amostra

- Perfil controle: A0.1 intacto, `B₀=150`, H=10, `s=10`, `R=40`, payout principal exatamente o perfil aprovado em A0.1; payout alternativo permanece só como sensibilidade identificada.
- Pré-registrar objetivo de agente, pesos/aversão ao risco se usados, utilidade de prática e métricas primárias; não escolher pesos após ver resultado.
- A1a: variar stake por round em `{5,10,20}` como exemplo a aprovar, igualdade de mãos, trava pré-deal, reserva `4s`; A1b opcional como condição comparativa, não trocar silenciosamente para uma delas após olhar dados.
- Parear cenário/seed/política quando semanticamente equivalente; separar treino do solver de avaliação; publicar código, seed root, N, versões e intervalos.
- Separar políticas de ação CF de políticas de stake. Comparar conservador, myopic, intertemporal, stake fixa e stake máxima elegível; não rotular agente como humano.

### Métricas

- retorno nominal de banca e retorno linearizado na exposição-base;
- variância, desvio-padrão e quantis de resultado por Noite, com IC apropriado;
- proporção de Noites que entram em prática, rodadas financiadas, saldo final e tempo até prática, sempre com IC e censura/abandono separados;
- distribuição de stakes escolhidos e fração em stake máximo, condicionadas a banca e horizonte;
- uso e saldo de Foco por stake e políticas de habilidade, sem converter uma métrica na outra;
- `match_points` invariável à exposição financeira e diferenças pareadas por decisão/cenário;
- teste de incentivos: máxima-por-EV, stake minimizadora de risco, selecionar máximo apenas após sorte favorável (que deve falhar por regra), abandono/reinício e repetição de Noites;
- precisão monetária para payouts 3:2, dupla liquidação, máximo de cobertura e limites exatos de saldo.

Usar intervalos Wilson para proporções; diferenças de retorno com intervalos pareados/bootstraps adequados à distribuição assimétrica, ou justificar outra aproximação. Não reportar apenas erro padrão normal se perdas e ganhos tiverem caudas largas. Definir tamanho amostral por um piloto separado e congelar-o antes da avaliação principal. Corrigir leituras múltiplas quando muitas combinações forem testadas.

### Etapa humana após aprovação do RFC e da simulação

Usar protocolo consentido que compare A0.1 e a variante A1 aprovada, com ordem alternada, mesma duração e explicação neutra. Medir compreensão da exposição/riserva, escolha de stake, percepção de risco, pressão/frustração, duração de decisão, prática, distinção entre Foco/score/banca, interesse em continuar e abandono. Não induzir perdas nem garantir que participante veja a prática. Relatar denominadores, dados ausentes e comentários negativos. n=1 informal e dados de solver não substituem playtest.

## 11. Critérios de aceitação/rejeição para a próxima fase

### Critérios mínimos para considerar A1 como experimento

- fundador aprova variante, bandas, stake inicial, regras de insuficiência, unidade fracionária, payout, objetivo/score de agente e protocolo humano por decisão registrada;
- prova aritmética de `Δ≥−4s` e `B≥4s ⇒ B_after≥0`, incluindo naturais, push e um/dois doubles;
- decisão de stake ocorre antes de revelar qualquer carta/semente; double continua legal exatamente como no motor;
- liquidação idempotente em ledger isolado; prática gratuita preserva score/Foco, congela banca e não pode reverter;
- métricas de habilidade não aumentam por stake ou volume; igualdade de decisões e pareamento A0/A1 testados;
- testes negativos de stake pós-deal, stake assimétrica, saldo insuficiente, fractional rounding, repetição/reinício, informação privada e exposição da seed;
- sem código na baseline P2A, `DF-SYM-0.1` ou `DF-CF-0.1-lab` além de qualquer adaptador explicitamente autorizado.

### Sinais para rejeitar ou redesenhar

- stake máxima elegível domina lucro esperado em quase todos os estados e pessoas não percebem escolhas responsivas ao risco;
- a variabilidade só amplia dispersão monetária sem aumentar decisões de habilidade ou compreensão;
- stake alta torna prática tão frequente que encurta a experiência ou leva a abandono, enquanto stake baixa elimina por completo a tensão de recursos;
- jogadores interpretam banca, Foco e score/rating como recursos intercambiáveis;
- rating nominal favorece maior stake apesar de normalização pretendida;
- solver muda exposição após informação ou usa estado oculto;
- o tratamento fracionário produz arredondamento, discrepância ou erro de ledger.

## 12. Questões para aprovação expressa do fundador

1. A recomendação de futuro experimento é A1a, com escolha igual por duas mãos a cada rodada antes das cartas, mantendo A0.1 como controle — ou prefere A1b, escolha única por Noite?
2. Aprova avaliar `{5,10,20}` como níveis CANDIDATE para comparação, sem torná-los regra, com reserva `4s` e prática abaixo da cobertura mínima? Se não, que faixa deve ser estudada?
3. Se incluir stake 5 e payout 3:2, aprova que a contabilidade futura use unidade exata de meia ficha (ou ticks equivalentes), sem arredondamento? Isso é requisito técnico por resolver, não decisão desta RFC.
4. Confirma que todo `match_points`/rating será calculado na exposição-base 10 e que stake afeta somente ledger fictício, sem ranking por lucro, saldo, stake ou volume?
5. Qual payout A0.1 será perfil principal para comparação: manter exatamente o perfil aprovado ou conduzir análise separada de sensibilidade 1:1? O RFC não infere que payout sensibilidade esteja aprovado.
6. A1 só deve avançar a uma implementação isolada após leitura do relatório A0-V e feedback humano documentado em `PLAYTEST-P4-A0.md`? Sem esses dados, A0 não satisfaz o gate empírico previsto na Issue #32.

Até essas respostas serem registradas por revisão documental, N-052 continua somente sequência A0→A1; N-053/N-054 só autorizam A0.1; A1 permanece não autorizada.

## 13. Registro de decisões e rastreabilidade

- **N-055 — CANDIDATE (proposta para revisão, 2026-10-20):** avaliar exposição pré-deal limitada e igual para ambas as mãos como futuro experimento de banca A1, mantendo A0.1 como controle. Recomenda-se estudar A1a por rodada; `{5,10,20}` e reserva `4s` são valores ilustrativos, não parâmetros aprovados. Nenhuma implementação A1 é autorizada por esta entrada.
- **O-25 — OPEN:** modelo e bandas A1; incentivo nominal dominante; objetivo de política/risk utility; unidade fracionária; decisão de stake no protocolo, manutenção de `match_points`/rating, interação com Foco, payout primário e gate humano.

Fontes: [Decision Register](DECISION-REGISTER.md), [RFC P4](ECONOMY-RFC-P4.md), [contrato A0.1](BANKROLL-A0-CONTRACT.md), [evidência A0-V](LAB-P4-A0-V.md), [protocolo humano A0](PLAYTEST-P4-A0.md), [Open Questions](OPEN-QUESTIONS.md), [economia competitiva](COMPETITION-ECONOMY.md) e [direção de recompensas](ECONOMY-REWARDS-DIRECTION.md).
