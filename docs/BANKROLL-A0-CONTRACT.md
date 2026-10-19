# NOCTE-P4-A0-S — contrato candidato da banca por Noite

**Versão:** `BANKROLL-LAB-A0-contract-v0.1`<br>
**Data:** 2026-10-19<br>
**Status:** proposta para decisão expressa do fundador; **nenhum parâmetro abaixo está RATIFIED nem autorizado para código**.<br>
**Issue:** [#26](https://github.com/andresant-ana/nocte/issues/26)<br>
**Decisões preservadas:** N-009, N-012, N-021, N-038, N-048, N-050, N-052 e N-053.

## 1. Pergunta e limites

Este documento apresenta uma recomendação operacional para o primeiro experimento A0: uma banca fictícia, local e renovada no início de cada Noite, em modo solo isolado `BANKROLL-LAB-A0`. O objetivo é testar exposição fixa e cobertura de risco. Não é saldo de conta, moeda persistente, loja, aposta de dinheiro real, nem medida de habilidade.

N-052 ratifica somente a sequência experimental A0 → A1. N-053 continua **OPEN**. O contrato abaixo é uma recomendação **CANDIDATE**, sujeita à escolha explícita do fundador antes da Issue de implementação. A recomendação não encerra questões de payout, balanceamento ou jogo final.

O modo A0 deve referenciar uma versão explícita das regras de Duas Faces/Cofre + Foco. Para a primeira comparação, recomenda-se o perfil solo `DF-CF-0.1-lab` com a configuração já versionada, sem alterar o motor, P2A, DF-SYM-0.1, `match_points`, custos/uso de Foco, Leitura, Manobra, política S17 ou exposição-base. A banca é um adaptador experimental separado. O modo básico e a tela P2C atual não recebem saldo implicitamente.

## 2. Alternativas de funcionamento

| Alternativa | Entrada da rodada | Double | Insolvência | O que realmente mede | Recomendação |
| --- | --- | --- | --- | --- | --- |
| **A0.1 — reserva do pior caso** | Exige `B ≥ 40`; mantém 40 reservadas para as duas mãos e doubles simultâneos possíveis. | Preserva as ações atuais: qualquer double legal segue disponível. | Se após a liquidação `B < 40`, as próximas rodadas da Noite viram prática gratuita, sem movimentar banca. | Uma banca funcional com contrato de cobertura, sem limitar opções do motor. | **Recomendada para avaliação e escolha do primeiro experimento.** |
| **A0.2 — cobertura incremental** | Exige `B ≥ 20`; reserva exposição-base de 10 por mão. | Cada double legal requer mais 10 de cobertura; um segundo double exige outros 10. Pode ser recusado por saldo. | A mesma prática gratuita começa quando `B < 20` antes da próxima rodada. | Banca funcional com restrição de double por saldo; altera estados de ação e comparabilidade. | Controle/alternativa, não default recomendado. |
| **A0.3 — saldo visual sem reserva** | Sempre permite a rodada. | Nunca restringe double. | O saldo visual é `B₀ + soma(round.score)` e pode ser negativo. | Apresentação de score deslocado; não representa solvência nem banca com risco real. | Usar somente como controle de UX, rotulado “simulação de saldo”. |

A0.1 tem reserva conservadora mesmo quando uma mão termina no peek ou não dobra: isso simplifica e mantém a legalidade de double independente do saldo. A reserva não é aposta nem débito; o dinheiro fictício em risco é determinado pelo score efetivamente resolvido pelo motor. A0.2 usa menos capital, mas muda a regra efetiva de double para pessoas com saldo diferente. A0.3 é simples e mantém o gameplay, mas não responde à hipótese de insolvência: não deve ser chamada de banca funcional.

Exemplo de elegibilidade imediatamente antes de iniciar uma rodada, sem liquidações pendentes:

| Saldo `B` | A0.1 — reserva 40 | A0.2 — base 20 + cobertura incremental |
| ---: | --- | --- |
| 20 | Prática gratuita; não inicia rodada financiada. | Inicia; nenhum double cabe após reservar a exposição-base. |
| 30 | Prática gratuita. | Inicia; cabe o adicional para **um** double, não dois. |
| 39 | Prática gratuita. | Inicia; ainda cabe um double. |
| 40 | Inicia, ambos os doubles continuam legais. | Inicia, ambos os doubles cabem. |

No A0.3, por contraste, `B₀=60` e duas rodadas de `−40` deixam saldo visual `−20`, ainda sem alterar a legalidade de qualquer ação. Isso demonstra por que A0.3 só serve de controle de apresentação e não pode ser reportado como uma banca solvível.

### Escolha recomendada

Recomendo **A0.1, cobertura do pior caso**, com parâmetros iniciais candidatos `B₀ = 150`, exposição fixa de 10 por mão, reserva de 40 por rodada, horizonte principal `H = 10` e prática gratuita após ficar abaixo da cobertura. `B₀=150` é uma hipótese de teste, não um valor aprovado. Nos exemplos determinísticos deste documento, ela cobre a Noite principal em uma trajetória moderadamente negativa de −5 por rodada e suporta três perdas máximas consecutivas antes da prática; `B₀=100` suporta somente duas perdas máximas. `B₀=200` oferece mais amortecimento, mas também reduz a frequência da transição para prática. Não há dados de usuários ou valor esperado de política que permitam chamar qualquer saldo de calibrado.

## 3. Contrato A0.1 proposto

### 3.1 Valores e escopo

| Campo | Valor candidato | Semântica |
| --- | ---: | --- |
| Saldo no início da Noite, `B₀` | **150 fichas** | Reinicializado em cada Noite A0; não entra/sai de perfil. Valores 60/100/200 são sensibilidades. |
| Exposição inicial Luz | 10 | Mantém a exposição-base da regra experimental de referência. |
| Exposição inicial Sombra | 10 | Idem; não há alocação variável entre as mãos. |
| Double por mão | +10 de exposição; total da mão 20 | Disponível exatamente quando o motor existente o considera legal. Sem restrição nova por saldo em A0.1. |
| Reserva máxima da rodada, `R` | 40 | `10 + 10 + 10 + 10`, incluindo ambos os doubles; é garantia temporária, não aposta. |
| Horizonte principal | 10 rodadas | 5 e 20 apenas sensibilidades. |
| Prática após insolvência | Todas as rodadas restantes | Mantém jogo e `match_points` experimentais; congela a banca, sem emissão ou compra. |

Não há configuração de stake, aposta após cartas, transferência entre mãos, compra/conversão de fichas, saldo persistente, limite de ganho intranoite, bônus, moedas cosméticas ou recompensa. A1 permanece posterior e sem autorização de código.

### 3.2 Reserva, disponibilidade e liquidação

`Bᵣ` é o saldo total da sessão antes da rodada `r`, `Eᵣ` a reserva ativa e `Aᵣ` a parte não reservada. Em uma rodada financiada:

```text
pré-condição: Bᵣ ≥ R = 40
Eᵣ = 40
Aᵣ = Bᵣ − Eᵣ
invariante durante a rodada: Aᵣ + Eᵣ = Bᵣ
```

Ao fim da rodada, aguardar o settlement normal do motor e aplicar seu score agregado **uma única vez**:

```text
Δᵣ = round.score                  // soma líquida das duas mãos, sem reinterpretar
Bᵣ₊₁ = Bᵣ + Δᵣ
Eᵣ := 0                           // liberar toda a reserva não consumida
Aᵣ₊₁ = Bᵣ₊₁
```

A reserva de 40 não é debitada em `B` no começo e não é somada/subtraída do resultado. Ela prova cobertura: a perda líquida máxima pela exposição proposta é `−40` se Luz e Sombra dobrarem e ambas perderem; logo, `Bᵣ ≥ 40` implica `Bᵣ₊₁ ≥ 0`. O limite superior também não precisa ser truncado: saldo acima de `B₀` permanece nesta Noite e expira ao final.

O saldo só muda após um `round.score` final e válido. Um identificador único de `night_id/round_id` deve impedir liquidação duplicada; replay da mesma liquidação retorna o estado já liquidado. Ação inválida, preview, cancelamento, reserva ou retorno de reserva não criam delta. Nunca arredondar, limitar a zero, nem substituir `round.score` por recálculo no UI. Se o motor retornar score fora do intervalo de cobertura esperado ou o novo saldo for negativo, falhar a transação e registrar erro de invariante; não clamping ou ajuste silencioso.

`match_points` continua sendo a saída de pontuação já existente. A banca mantém um ledger/estado de sessão separado, embora use exatamente `round.score` como `Δᵣ`; saldo, exposição nominal e fichas nunca alimentam rating, leaderboard, comparação de skill ou recompensas. Foco permanece um recurso experimental diferente, não comprável e sem conversão.

### 3.3 Insuficiência e prática gratuita

No início de cada rodada, antes de aceitar exposição, se `B < 40`, mudar uma única vez o estado desta Noite para `practice`. Não iniciar reserva e não atualizar banca até que a Noite termine. Todas as rodadas restantes ainda podem ser jogadas e pontuadas pelo `match_points` experimental normal; vitórias ou doubles em prática não reabastecem banca nem reativam A0.1. Não exibir saldo negativo, bloquear a pessoa, iniciar outra Noite automaticamente ou oferecer compra.

Saldo exatamente 40 financia uma última rodada integral, com duas mãos e ambos os doubles legais. Se terminar em zero ou abaixo de 40, as rodadas seguintes seguem em prática. Essa transição acontece entre rodadas, nunca revoga ação em uma rodada já reservada. `B₀` novo só surge quando o jogador inicia explicitamente uma nova Noite A0.

### 3.4 Abandono e expiração

Rodadas já liquidadas conservam seus registros locais de score e delta enquanto a sessão existir. Abandonar encerra a Noite A0; qualquer saldo total remanescente expira e não é transferido para a próxima sessão. Uma reserva ativa termina junto com a sessão e nunca é convertida em score.

Se o motor não finalizou a rodada atual, ela não cria `Δᵣ` nem resultado sintético de vitória/derrota para a banca. A semântica de `match_points` segue o estado de abandono que já existe no motor; o adaptador de A0 não inventa uma segunda liquidação. Recarregar/fechar a aba perde a sessão local, coerentemente com o protótipo atual; persistência/reconexão ficam fora do experimento. A UX deve confirmar abandono e dizer que a banca daquela Noite será descartada, sem penalidade adicional.

## 4. Casos numéricos reproduzíveis

Todos os exemplos usam soma algébrica em fichas: score positivo acrescenta banca e score negativo a reduz. São caminhos de contabilidade construídos, não estimativas de EV, frequência, expectativa média da regra ou resultados de playtest.

### 4.1 Trajetória moderadamente negativa

Para dar um cenário com média aritmética explícita, considere uma sequência hipotética em que cada rodada liquidada tem `Δᵣ = −5` (`média = −5` por rodada). Não é um resultado experimental nem afirma que −5 seja EV esperado. Com cobertura de 40, o número de rodadas financiadas é `min(H, floor((B₀−40)/5)+1)`; a rodada iniciada exatamente com 40 pode concluir e levar a banca abaixo de 40.

| `B₀` | Rodadas financiadas em H=5 / 10 / 20 | Banca ao final H=5 / 10 / 20 | Leitura para H=10 |
| ---: | ---: | ---: | --- |
| 60 | 5 / 5 / 5 | 35 / 35 / 35 | 5 rodadas financiadas, depois prática |
| 100 | 5 / 10 / 13 | 75 / 50 / 35 | Todas as 10 financiadas |
| **150 (recomendado)** | 5 / 10 / 20 | 125 / 100 / 50 | Todas as 10 financiadas, reserva remanescente 100 |
| 200 | 5 / 10 / 20 | 175 / 150 / 100 | Todas as 10 financiadas, com mais folga |

Para H=20, `B₀=100` cai a 40 antes da 13ª rodada; a 13ª é financiada e termina em 35, então sete rodadas restantes são prática. `B₀=150` termina as 20 em 50. Isso mostra o efeito da duração sem fingir que o horizonte muda a economia por probabilidade.

### 4.2 Sequência de perdas máximas com double

Cada rodada tem `Δᵣ = −40`: ambas as mãos usam double legal e ambas perdem 20. A0.1 reserva cobertura completa, sem limitar qualquer ação.

| `B₀` | Sequência de banca após as rodadas financiadas | Rodadas financiadas até ficar `<40` |
| ---: | --- | ---: |
| 60 | 60 → 20 | 1 |
| 100 | 100 → 60 → 20 | 2 |
| **150 (recomendado)** | 150 → 110 → 70 → 30 | 3 |
| 200 | 200 → 160 → 120 → 80 → 40 → 0 | 5 |

Com `B₀=200`, a 5ª rodada começa com 40 e é legal; seu settlement leva a zero. Rodadas posteriores são prática. Com `B₀=150`, a 3ª começa com 70 e liquida a 30; a próxima é prática. Em nenhum caso a banca fica negativa.

### 4.3 Reserva, double e payout natural

| Estado antes | Evento resolvido | Estado depois | Regra conferida |
| --- | --- | --- | --- |
| `B=150`, `E=40`, `A=110` | Sem double; `round.score=+10` | `B=160`, `E=0`, `A=160` | Libera reserva inteira; liquida score do motor uma vez. |
| `B=150`, `E=40`, `A=110` | Dois doubles perdem; `round.score=−40` | `B=110`, `E=0`, `A=110` | Pior perda coberta sem dívida. |
| `B=150`, `E=40`, `A=110` | Um natural elegível de exposição 10 vence por 3:2 (`+15`); outra mão faz push (`0`) | `B=165`, `E=0`, `A=165` | Payout 3:2 segue o perfil experimental; a banca apenas reflete score agregado. |
| `B=150`, `E=40`, `A=110` | Dealer natural encerra no peek; duas exposições-base perdem (`−20`) | `B=130`, `E=0`, `A=130` | Não há janela Cofre/Foco; reserva excedente liberada. |

O exemplo de natural presume uma mão natural vencedora contra dealer sem natural e usa 3:2 do perfil experimental. `1:1` é sensibilidade separada: nesse caso, aquela mão contribui `+10`, não `+15`; nenhuma das duas versões é proclamada regra final. Manobra que forma Ás+10, Leitura, Foco, push e ordenação de naturals continuam exatamente no contrato versionado do motor escolhido; A0 não os redefine.

### 4.4 Abandono

Suponha `B₀=150`, duas rodadas completas com `Δ=+15` e `Δ=−10`: a banca fica em 155. Na terceira rodada, a interface mantém 40 reservadas (`A=115`) sem debitar o total. Se o jogador abandona antes do settlement: não existe `Δ₃`; a Noite termina, a reserva encerra com a sessão e os 155 remanescentes expiram. Nenhum saldo entra em nova Noite, conta, prática, loja ou score de skill. Os 15 pontos já liquidados permanecem apenas conforme a saída local existente do motor.

## 5. Por que `B₀=150` é a recomendação, não uma conclusão

- `60` é adequado a um teste deliberadamente curto de transição para prática, mas sob a trajetória −5 financia apenas metade da Noite principal.
- `100` mantém 10 rodadas na trajetória −5 e é uma alternativa inicial mais tensa; duas perdas de −40 já levam ao estado prática. A estimativa não incorpora a distribuição real de decisões/resultados.
- `150` é o ponto intermediário: dez rodadas de referência seguem financiadas no cenário moderado construído; três perdas máximas continuam possíveis antes da transição. Para H=20, ainda financia as vinte rodadas no exemplo −5.
- `200` cobre cinco perdas máximas e reduz a chance de chegar à prática em horizonte curto; pode atenuar a sensação de escassez que A0 quer observar. O exemplo não prova que isso aconteça com jogadores.

Logo, 150 é uma hipótese inicial equilibrada entre acesso a uma Noite de 10 rodadas e ocorrência observável de insuficiência. O fundador pode escolher 60, 100, 150, 200 ou outro número; aprovação do documento não deve ser interpretada como ratificação desse valor.

## 6. Critérios verificáveis para a futura Issue `NOCTE-P4-A0-E`

Os critérios abaixo são um contrato de implementação **proposto**, condicionados à decisão expressa do fundador sobre `B₀`, horizonte, reserva e prática. Não implementar neste PR.

### Testes matemáticos e de estado

1. Cenário A0 não é selecionado automaticamente; escolha explícita entra em `BANKROLL-LAB-A0` e registra versão/configuração. Um novo início reseta ao `B₀` aprovado. DF-SYM, CF P2C, P2A e respectivos dados/protocolos não ganham saldo nem mudam comportamento.
2. Uma rodada A0.1 não inicia como financiada com `B<40`; `B=40` pode iniciar e reservar as 40. Um round `B<40` abre prática sem mexer na banca.
3. Antes de settlement financiado, `available + escrow = bankroll`, com `escrow=40`. A reserva não é score nem débito; ao liquidar, `escrow=0` e `bankroll_after = bankroll_before + round.score`.
4. Testar ganhos, perdas, push, natural 3:2 e 1:1, dealer natural, ambas as mãos naturais, Manobra que forma Ás+10 comum, Leitura + Manobra, double em uma mão, double em ambas, hand terminals e rounds/noite terminal. Banca não recalcula nem muda `match_points`.
5. Máxima perda liquidável é `−40`; com `B≥40` nunca há negativo. `B=40, Δ=−40` gera `B=0` e prática na rodada seguinte. Scores fora da faixa esperada falham como violação de invariante; nunca são limitados/truncados.
6. Double permitido é exatamente o do motor existente em A0.1, mesmo quando `available=0` depois da reserva. Sem reserva suficiente, impossível entrar em rodada financiada; não se altera a legalidade dentro da rodada.
7. A reserva reverte a `available` ao fim e depois a delta aplica uma vez. A repetição de `settle(night_id, round_id)` é idempotente; duas rodadas distintas não colidem; falha antes de commit não deixa débito parcial.
8. Foco e banca são invariantes independentes: todas as combinações de gasto/conservação/manobra/leitura preservam saldo de Foco do motor e não movem a banca até `round.score` final.
9. Depois da transição a prática, várias vitórias/doubles podem aumentar `match_points`, mas não mudam `bankroll`, não saem de prática e não criam moeda. Nova Noite explicitamente iniciada usa `B₀` novamente.
10. Abandono durante reserva não cria settlement ou delta sintético; expira saldo e sessão. Abandono entre rodadas também expira todo saldo. Reload não persiste A0.
11. Invariantes de privacidade do motor continuam: banca não expõe hole, draws futuros, seed ou outro dado oculto. Nenhuma transação afeta classificação independente, estatística persistente, prêmio ou loja.

### UX / auditabilidade

- Mostrar “Banca desta Noite” e `B` separadamente de `match_points` e Foco; mostrar estado “rodada financiada” ou “prática gratuita — banca congelada”.
- Antes da rodada, informar exposição fixa (10 por mão), cobertura de 40 e consequência do saldo abaixo do limite; na prática, explicar que score continua mas ficha não muda.
- Confirmar abandono/expiração sem apresentar a banca como ativo sacável. Não criar CTA de compra/recarga.
- Resumo ao final deve separar saldo inicial, saldo final/expirado, rodadas financiadas, rodadas em prática, exposição/doubles, delta líquido e `match_points`; não mostrar um ranking por saldo.
- Testar teclado, leitor de tela, viewport mobile e números exatamente nos limites `39/40/41`.

## 7. Aprovações ainda necessárias

| Parâmetro | Recomendação CANDIDATE | Estado e pergunta ao fundador |
| --- | --- | --- |
| Modelo | A0.1 reserva de pior caso 40 | Escolher A0.1, A0.2 ou usar A0.3 somente como controle visual. |
| Saldo por Noite | 150 | Aprovar/substituir por 60, 100, 200 ou valor próprio. |
| Exposição | 10 por mão, fixa | Confirmar manutenção da exposição experimental e ausência de seleção de stake. |
| Double | Preservado no A0.1; ambas cobertas | Confirmar reserva máxima incluindo dois doubles; A0.2 teria restrição de legalidade por saldo. |
| Insuficiência | `B<40` leva a prática gratuita pelo resto da Noite | Confirmar transição entre rodadas, sem interromper partida e sem repor fichas. |
| Horizonte | 10 principal; 5/20 sensitividades | Aprovar o horizonte para instrumentação. |
| Abandono | Sem score da rodada incompleta; banca remanescente expira | Confirmar a semântica se o protótipo permitir abandonar durante uma rodada. |
| Regras de jogo | Reusar regra versionada, sem alteração | Fixar versão/perfil exato da primeira comparação A0. |

Enquanto essas escolhas não forem respondidas, N-053 permanece OPEN e a futura Issue de código não deve começar com parâmetros inferidos deste RFC.

## 8. Riscos e limites de evidência

- Os cenários são aritmética determinística, não simulação de EV, frequência de insolvência ou comportamento humano. Não respondem se 150 é suficiente, justo ou divertido.
- O score por rodada pode ter distribuição assimétrica por naturals, doubles e ações. Os exemplos `−5` e `−40` não substituem distribuição por política, payout e perfil.
- Reserva de pior caso simplifica legitimidade, mas prende 40 mesmo quando uma mão não pode dobrar. Otimizar reserva por mão reduziria bloqueios, mas adicionaria estado/complexidade e mudaria o contrato.
- Banca finita pode causar sequências extensas de prática. A prática evita bloqueio e emissão, mas significa que banca deixa de informar performance ao fim de algumas Noites.
- O modo local não é autoritativo nem persistente; seed, resultados e saldo não têm integridade de servidor. Não usar em multiplayer nem chamar de sistema econômico lançado.
- N-009/N-012/N-021/N-038/N-048/N-050 permanecem. N-046/N-047 continuam regras **EXPERIMENTAIS** do perfil de jogo; A0 não as torna RATIFIED. N-052 permanece somente sequência **RATIFIED**; N-053 continua **OPEN** até decisão explícita.

## 9. Fontes e reprodução dos exemplos

Fontes normativas: [Decision Register](DECISION-REGISTER.md), [RFC P4-D](ECONOMY-RFC-P4.md), [Competitive Economy](COMPETITION-ECONOMY.md), [Gameplay](GAMEPLAY.md), [CF-RFC-P2B](CF-RFC-P2B.md), [Playtest P2C](PLAYTEST-P2C.md) e [Open Questions](OPEN-QUESTIONS.md).

Para reproduzir as tabelas sem executar código, use a recorrência `Bₙ = B₀ + ΣΔᵣ` enquanto `Bᵣ≥40`, financiando também a rodada que começa exatamente em 40. Em `Δ=−5`, o número de rodadas cobertas é `min(H, floor((B₀−40)/5)+1)`; em perdas máximas `Δ=−40`, substitua o divisor 5 por 40. Após a primeira liquidação abaixo de 40, congele o saldo e conte as rodadas restantes como prática. Nenhum teste de software ou experimento foi executado neste PR documental.
