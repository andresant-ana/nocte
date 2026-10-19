# NOCTE P4-A0 — protocolo prospectivo de playtest

**Status:** preparado para estudo futuro; nenhuma sessão humana ou resultado está registrado neste documento.  
**Variante:** `BANKROLL-LAB-A0-0.1` sobre `DF-CF-0.1-lab`, com regras e parâmetros ainda **EXPERIMENTAL** (N-053/N-054).  
**Baseline comparativo:** Cofre + Foco sem banca; não usar DF-SYM/P2A para atribuir efeito à banca.

## Objetivo

Observar se uma banca fictícia reiniciada por Noite ajuda participantes a entender exposição e risco, se a reserva de cobertura de 40 fichas parece clara, e como a transição para prática gratuita afeta continuidade, frustração e vontade de jogar outra Noite. O estudo não determina equilíbrio econômico, valor esperado, habilidade competitiva, retenção ou diversão de longo prazo.

## Preparação e salvaguardas

- Usar o protótipo local, sem backend, perfil, cookie, `localStorage`, conta ou transferência. A sessão é descartada ao fechar/recarregar.
- Explicar que fichas são fictícias, não compráveis e não resgatáveis; saldo não alimenta score, habilidade, ranking, prêmio ou loja.
- Confirmar consentimento verbal antes de observar. A pessoa pode parar ou abandonar a qualquer momento; isso expira apenas a banca local daquela Noite.
- Não registrar nome, contato, idade precisa, tela, seed, baralho ou dado identificável. Não exportar payload privado do navegador.
- Se forem feitas anotações, usar um código aleatório da sessão e respostas agregadas sem identificação; apagar notas brutas depois da síntese aprovada.
- Não apresentar recomendações estratégicas ou chamar os valores de regras definitivas. Moderadores podem explicar termos e controles, não aconselhar jogadas.

## Desenho exploratório

Comparação intraparticipante entre duas Noites de 10 rodadas: (A) Cofre + Foco sem banca e (B) A0.1. Alternar a ordem A/B entre participantes para reduzir efeito de aprendizado e ordem. Usar o mesmo perfil de pagamento natural nas duas condições; anotar qual foi escolhido. Os baralhos são amostras locais independentes, portanto não comparar diretamente score ou atribuir diferenças de resultado à banca. A prática pode não ocorrer em toda sessão: registrar somente se aconteceu espontaneamente, sem forçar perda ou alterar estado de produção.

Antes de jogar, perguntar em voz alta:

1. O que você entende por “saldo disponível” e “reserva de 40” nesta tela?
2. O que você espera que aconteça com as fichas e com a pontuação se uma rodada perder?

Durante cada condição, observar sem orientar:

- se a pessoa distingue Foco, `match_points`, saldo total, disponível e reserva;
- se explica corretamente a exposição fixa de 10 por mão e que a reserva não foi debitada;
- dúvidas, releituras, pausas ou erros de interpretação ao iniciar a próxima rodada;
- reação espontânea ao estado “Prática gratuita — banca congelada”, caso apareça;
- decisão de continuar, abandonar ou iniciar outra Noite, sem tratar isso como métrica de retenção.

Depois de cada condição, pedir respostas de 1 (discordo totalmente) a 5 (concordo totalmente), com “não sei” disponível:

- “Entendi quanto da banca estava reservado e por quê.”
- “Consegui distinguir o resultado da rodada do saldo da banca.”
- “A transição para prática gratuita ficou clara.”
- “A banca aumentou meu interesse nesta Noite.”
- “A banca me fez sentir pressionado a continuar ou evitar abandonar.”
- “Eu escolheria jogar outra Noite desta variante.”

Perguntas abertas: “O que ficou confuso?”, “A reserva pareceu um bloqueio ou proteção?”, “O que você esperava que acontecesse quando o saldo baixasse?” e “O que deveria ser removido antes de testar novamente?”. Não converter respostas qualitativas em percentuais sem denominador e codificação publicados.

## Registro e leitura

Para cada condição, anotar apenas: ordem, perfil de payout, se completou/abandonou, se ocorreu prática, respostas às perguntas, confusões observáveis e comentários anonimizados. Se números de saldo forem registrados para explicar um incidente, registrar a sequência aritmética com valores inteiros, sem seed ou mão/cartas identificáveis.

Relatar denominadores e dados ausentes por pergunta; publicar distribuição individual agregada e temas qualitativos sem selecionar só opiniões favoráveis. Separar claramente observação, interpretação e recomendação. Com amostra pequena e baralhos diferentes, não estimar EV ou efeito causal no score. Feedback exploratório não altera N-053/N-054 nem canoniza parâmetros.

## Limites e próxima decisão

O protótipo é client-only: reload, falha de aba ou abandono perde a sessão; não há autoridade remota ou recuperação. A ocorrência de prática depende de resultados e pode ser rara no horizonte de 10 rodadas. Os participantes podem não chegar ao estado de prática. Se a compreensão de reserva, settlement, expiração ou distinção entre score e banca falhar, corrigir a explicação antes de qualquer alegação de diversão ou balanceamento. Qualquer mudança numérica, stake variável, persistência, recompensa ou uso econômico exige tarefa e aprovação próprias.
