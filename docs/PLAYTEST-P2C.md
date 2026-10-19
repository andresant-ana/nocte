# NOCTE-P2C — roteiro exploratório Cofre + Foco

**Versão do roteiro:** `P2C-observation-v1`
**Status:** roteiro manual prospectivo; nenhuma sessão humana ou resultado é relatado aqui.
**Escopo:** comparar compreensão e experiência do Duas Faces básico com a variante solo experimental `DF-CF-0.1-lab`.

### Revisão de UX P2C-C

Na janela de Foco, Leitura, Manobra e conservação aparecem juntas. A seleção direta de Manobra mostra alvos e prévia sem registrar uma decisão do motor. Confirmar Manobra enquanto Leitura está pendente pula essa decisão dentro da mesma transição que aplica a troca e cobra 1 Foco; cancelar a confirmação conserva o saldo e mantém Leitura disponível. Depois de uma Manobra confirmada, Leitura não pode ser iniciada. Observe se a pessoa compreende essa ordem e a diferença entre cancelar a prévia e confirmar a ação. Esta nota descreve a interface experimental e não altera N-046/N-047 nem ratifica regras.

## Status das regras e limites

O modo Cofre + Foco e seus valores seguem **EXPERIMENTAL** (N-046/N-047). N-042 ratifica somente a direção; N-043 permanece CANDIDATE para produto final e N-045 permanece OPEN. O estudo P2A (`P2A-study-v1`) continua exclusivo do modo básico e não é um estudo comparativo. Este roteiro não registra decisões dentro do app, não coleta analytics e não afirma equilíbrio, diversão, retenção ou vantagem competitiva.

O protótipo é local e client-side. Não use stakes, créditos, recompensas ou instruções estratégicas. Não trate a carta aberta do Cofre ou a Leitura privada como adequadas a um jogo competitivo/multiplayer.

## Executar

Requisitos: Node.js 22+ e pnpm 12.9.1. Na raiz do repositório:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra a URL local exibida pelo Vite. Em **Jogar livre**, escolha explicitamente `Duas Faces básico · DF-SYM-0.1 · EXPERIMENTAL` ou `Cofre + Foco solo · DF-CF-0.1-lab · EXPERIMENTAL` antes de iniciar cada Noite. No modo Cofre + Foco, 10 rodadas é a duração principal; 5 e 20 são opções de diagnóstico. Payout e duração não podem ser alterados no meio da Noite. O estudo P2A só aparece no modo básico e não deve ser apresentado como comparativo.

## Protocolo breve

### Preparação e consentimento

Explique que são regras experimentais e que a pessoa pode parar ou pular qualquer pergunta. Obtenha consentimento verbal para observação antes de iniciar. Não solicite nomes, contato, gravação de tela ou dados identificáveis. A observação deste roteiro deve ser anotada fora do app sem identificadores; o app não cria nem exporta um registro P2C.

Use a mesma duração e o mesmo payout nos dois modos da comparação. Para reduzir efeito de ordem, alterne a ordem entre participantes (metade básico → Cofre + Foco; metade Cofre + Foco → básico) quando o tamanho da amostra permitir. Registre a ordem usada. Não compare placares como medida de habilidade: as distribuições são independentes e a amostra é pequena.

### Sessões

1. Dê uma explicação neutra do objetivo e das ações comuns, sem ensinar uma estratégia ótima. No modo básico, use o guia existente. No modo Cofre + Foco, permita que a pessoa leia o guia rápido e examine o Cofre aberto.
2. Jogue uma Noite curta em cada modo (recomenda-se 5 rodadas para uma sessão exploratória), sem coaching durante as decisões. A duração de 5 é diagnóstico e continua experimental.
3. Observe se a pessoa entende a composição, o Cofre, o saldo de Foco, a janela após peek negativo, os custos de Leitura/Manobra, a confirmação de gasto, e a diferença entre natural inicial e 21 comum por Manobra. Não solicite uso de habilidades; uso ou conservação são igualmente observáveis.
4. Após cada modo, pergunte as questões abaixo em linguagem neutra. Aceite “não sei” e silêncio. Ao final, pergunte qual modo a pessoa escolheria para outra sessão e por quê, sem sugerir preferência.
5. Encerre explicando que a sessão é exploratória e não prova que uma variante é melhor. Não ajuste regras ou custos com base em uma observação isolada.

### Perguntas breves

- Quais regras ou controles ficaram pouco claros?
- A composição inicial pareceu uma escolha significativa? O que contribuiu para essa impressão?
- No modo Cofre + Foco, o Cofre e o saldo compartilhado ficaram fáceis de acompanhar?
- A Leitura pareceu compreensível e voluntária? A pessoa entendeu que ela revela apenas a carta fechada atual?
- A Manobra pareceu compreensível? A pessoa entendeu o destino da carta retirada e o tratamento de Ás + 10?
- Houve momentos de decisão interessante ou a rodada pareceu repetitiva?
- O tempo exigido pareceu confortável?
- A pessoa escolheria voluntariamente outra sessão? Qual modo e por quê?

Não conduza a pessoa a uma avaliação positiva/negativa. Separe respostas observadas de interpretação do facilitador.

## Folha manual de observação

Uma folha por participante, sem identificador pessoal:

```text
Roteiro: P2C-observation-v1
Data (registro local do facilitador):
Ordem dos modos: básico → Cofre + Foco / Cofre + Foco → básico
Payout e duração escolhidos:
Sessões concluídas / interrompidas:

OBSERVAÇÕES DIRETAS (ações, dúvidas espontâneas, pedidos de ajuda):
-

RESPOSTAS (por modo; registrar “pulou” como dado ausente):
- Clareza das regras e dos controles:
- Significado da composição:
- Clareza do Cofre e do Foco:
- Compreensão e uso/conservação da Leitura:
- Compreensão e uso/conservação da Manobra:
- Repetição e tempo:
- Desejo voluntário de jogar novamente:
- Preferência declarada e justificativa:

INTERPRETAÇÃO (vincular cada leitura a uma observação):
-

DESVIOS E LIMITAÇÕES (ordem, ajuda, interrupções, dispositivo):
-

PRÓXIMA PERGUNTA OU TESTE (sem mudança tácita de regras):
-
```

## Interpretação

Relate quantidade de participantes e sessões, dados ausentes, ordem, interrupções e exemplos contrários à conclusão. A ordem dos modos pode criar aprendizagem e transferência; o crossover pequeno não isola causalidade. A duração curta pode não revelar gestão intertemporal do Foco. A comparação usa RNG independente em jogo livre, então resultado e placar não são pareados nem evidência de competitividade. Um teste humano posterior deve definir amostra, cenário/ordem e análise antes da coleta.

Esta entrega não contém resultados humanos. Nenhuma observação informal deve ser convertida em regra RATIFIED ou em alegação de balanceamento. Preserve a P2A e suas exportações como baseline separado.
