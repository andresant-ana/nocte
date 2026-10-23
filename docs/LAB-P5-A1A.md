# NOCTE-P5-A1a-E — laboratório de apostas livres

**Versão:** `BANKROLL-LAB-A1a-0.1`
**Issue:** [#38](https://github.com/andresant-ana/nocte/issues/38)
**Decisão de autoridade:** N-056, direção RATIFIED / laboratório EXPERIMENTAL. Esta entrega não cria decisão nem promove N-055, que continua CANDIDATE.
**Estado:** interface local e ledger implementados em branch/PR próprios; não são regras finais, carteira, jogo de dinheiro real ou resultado validado com pessoas.

## Escopo e isolamento

A1a é um modo selecionado explicitamente, separado de `BANKROLL-LAB-A0-0.1`, Cofre + Foco sem banca, Duas Faces básico/P2A e do laboratório P5 sem banca. O modo reaproveita `DF-CF-0.1-lab`, os perfis experimentais 3:2 e 1:1 já existentes e a representação visual P5 display-only. O adaptador P5 de cartas mantém seus fluxos de rank independentes; stake não muda distribuição, cartas, política do dealer, naturals, Foco, ações legais nem `match_points`.

Não há saldo persistente, serviço de servidor, multiplayer, transferências, compra, loja, monetização, ranking por saldo nem alegação de que a experiência é segura, equilibrada ou divertida. Semente e ledger continuam locais e reiniciáveis pelo navegador; esta UX não é uma autoridade antifraude.

## Contrato executado

- Cada Noite começa em 150 fichas fictícias, 300 ticks (meias fichas), e tem 10 rodadas.
- Antes de cada distribuição, um único valor inteiro `s` é escolhido para Luz e Sombra. A entrada numérica aceita qualquer inteiro de `1` a `floor(B/4)`. Botões `+1`, `+5`, `+10` e `+25` aceleram a escolha; não são limites. Há desfazer, limpar e repetir a última aposta quando ela ainda cabe.
- Confirmar trava o mesmo `s` para as duas mãos e inicia a geração da rodada. A reserva não é débito: `R=4s`, para exposição inicial `2s` e até dois doubles adicionais `2s`. Aposta excessiva é rejeitada antes de abrir qualquer stream de cartas; o jogador pode escolher uma menor.
- Um clique de confirmação repetido não pode iniciar outra rodada já travada. Nenhum fluxo de cartas ou seed de Noite é criado ao selecionar A1a, abrir a fase de aposta ou editar o valor.
- A banca muda apenas uma vez depois de `round.score` completo do motor, usando `ΔB=(s/10)×round.score`. A nota de jogo e o Foco permanecem os valores originais do motor.
- O ledger guarda saldo em ticks inteiros: `Δticks=s×round.score/5`. Como os scores do perfil de exposição-base são múltiplos de 5, pagamento natural 3:2 e stakes ímpares usam meia ficha exata sem arredondar. O settlement valida divisibilidade, cobertura de perda `ΔB≥−4s` e saldo não negativo. Push é delta zero.
- Quando `floor(B/4)=0`, a Noite passa irreversivelmente a prática gratuita. A prática continua o motor e a pontuação/Foco, com stake zero e banca congelada. Saldo de exatamente 4 ainda permite uma última aposta `s=1`.
- O saldo temporário expira ao concluir ou abandonar. Uma Noite nova começa em 150; nenhum valor passa de uma sessão à seguinte.
- Os controles da fase pré-deal foram conferidos sem scroll da página e com hit-test dos controles em 1280×720, 1366×768, 1920×1080, 390×844 e 360×640. Ações das fases de cartas continuam usando a tabela/viewport de P5 já existente.

## Evidência automatizada

`packages/web/src/game/bankroll-a1a.test.ts` verifica stake máximo inicial 37, reserva integral, cobertura e perda máxima, natural 3:2 em ticks, redução quando o saldo cai, estados-limite 4/3,5, prática congelada, liquidação repetida/divergente, duplicidade de rodada e exatidão das incrementações do motor.

O HUD A1a apresenta **Lucro da Noite** como variação líquida da banca em relação às 150 fichas iniciais; pontos estratégicos continuam separados e aparecem como pontuação nos resultados. O teste Playwright A1a injeta draws apenas no navegador de teste. Confirma que não há chamadas a `crypto.getRandomValues`/SHA antes de confirmar stake; confirma que a face fechada permanece oculta após o deal; testa chips, desfazer, limpar, repetir e input; liquida perdas após stakes 5, 27 e 5, confirma saldos 130, 22 e 2; e verifica que a rodada gratuita altera pontos mas não banca nem Foco. Faz verificações de scroll global e do shell, visibilidade, habilitação e hit-test da interface de aposta nas cinco viewports listadas acima.

### Reproduzir

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @nocte/web test:e2e
```

## Limitações

O settlement presume que os valores de `round.score` mantêm os incrementos múltiplos de 5 e a perda máxima de 40 na exposição-base 10; o adaptador falha de forma explícita se isso mudar. O A1a não tem simulador/solver de stake nem evidência de dominância, retorno, calibração ou comportamento humano nesta Issue. A repetição de aposta é um atalho de UX, não recomendação estratégica. A banca e o fluxo RNG são controlados somente no cliente e podem ser reiniciados. A saída em 360×640 é verificada para a fase de aposta; zoom excepcional/tamanho de texto aumentado ainda exige avaliação manual e pode exigir rolagem acessível.

N-055 permanece CANDIDATE. N-056 permanece autorização EXPERIMENTAL. Payout continua sendo o perfil Cofre + Foco previamente selecionado; este modo não escolhe nem ratifica payout. A0.1, motor, protocolo P2A e experimentos históricos permanecem baseline sem alteração de regra.
