# NOCTE-P7 — Livro dos Pactos (laboratório experimental)

**Status:** catálogo e estrutura autorizados para experimento pelo fundador na Issue #42. Nenhuma variante é regra permanente, balanceada ou RATIFIED como gameplay final. A interface continua local e não autoritativa. A entrega P7-A implementa `PACT-BOOK-0.1` em modo solo A1a + Cofre + Foco, sem alterar `PACT-LAB-0.1` (P6), A1a, A0.1, P2A ou perfis Duas Faces anteriores.

## Contrato P7-A

Uma Noite contém dez rodadas. Rodadas 1–3 não têm Pacto. Antes de distribuir a rodada 4, a lane determinística `PACT-BOOK-0.1|offer-{4,8}` sorteia uma família completa entre as famílias implementadas Revelação, Domínio e Foco. Oferece ambos os Pactos do par e recusa. Depois da rodada 7, o primeiro contrato e qualquer Privilégio não usado expiram. Antes da aposta/distribuição da rodada 8, uma segunda família é sorteada sem reposição, inclusive se a primeira oferta foi recusada. O segundo contrato expira no fim da rodada 10. A recusa não modifica banca, Foco, pontuação nem regras. Uma oferta não pode ser reaberta.

Famílias são escolhidas uniformemente do conjunto elegível; seleção usa PRNG síncrono com domínio/versão independentes da lane de cartas, rejeição do intervalo final para evitar viés de módulo e seed de sessão. A seed só se fixa quando a primeira aposta válida é confirmada. Oferta não consome cartas, não vê draws futuros e não oferece reroll. Isto estabelece replay reprodutível no cliente; não estabelece resistência a adulteração/refresh em multiplayer.

| Família | Pacto | Privilégio | Renúncia |
|---|---|---|---|
| Revelação | Véu | Uma Leitura gratuita em janela legal do Ato. | A carta aberta do dealer é omitida da projeção pública durante composição e exibida após confirmar. |
| Revelação | Farol | Uma categoria da carta fechada antes da composição: Ás, baixa (2–6) ou alta (7–K). A carta fechada exata permanece privada. | Leitura indisponível durante o Ato. |
| Domínio | Ferro | Uma Manobra gratuita; a Manobra paga pode preservar o Privilégio. | Uma Face escolhida na oferta não pode Dobrar. |
| Domínio | Ímpeto | Uma vez após exatamente uma Compra normal, Dobrar, comprar uma carta e encerrar a mão. Cobertura já autorizada R=4s cobre no máximo um double por mão. | Manobra indisponível durante o Ato. |
| Foco | Vigília | Uma Leitura **ou** Manobra gratuita e legal na metade final: 6–7 ou 9–10. | Leitura e Manobra normais indisponíveis na metade inicial: 4–5 ou 8. |
| Foco | Fulgor | Uma Leitura **ou** Manobra gratuita e legal na metade inicial: 4–5 ou 8. | Leitura e Manobra normais indisponíveis na metade final: 6–7 ou 9–10. |

Hierarquia nas ofertas: nome, Privilégio, Renúncia, vigência/escolhas e confirmação. Renúncias continuam ativas após consumir o Privilégio. Ações privilegiadas são consumidas somente após transição legal bem-sucedida. Manobra, Leitura, banca A1a, settlement e score do motor são mantidos pelas APIs existentes; o adapter valida as restrições antes de chamar as ações.

## Catálogo versionado e elegibilidade

O catálogo final autorizado contém 18 Pactos em nove pares (Issue #42). Esta primeira entrega torna elegíveis **somente** três pares completos: Revelação, Domínio e Foco (seis Pactos). As famílias Sacrifício, Tempo, Vínculo, Destino, Fortuna e Escolha ainda não entram no sorteio; não há ofertas com metade de um par. O tipo de catálogo e o pool são versionados e tipados para extensão incremental. A implementação restante segue nas entregas P7-B e P7-C, após revisão/integração de cada base.

Para delimitar o catálogo sem expor pares incompletos nesta entrega, permanecem planejados e inelegíveis: Sacrifício (Bastião/Reflexo), Tempo (Penhor/Arremate), Vínculo (Cisão/Balança), Destino (Ordem/Caos), Fortuna (Lastro/Audácia) e Escolha (Segunda Chance/Juramento). Seus contratos são os aprovados na Issue #42 e não são simulados nem apresentados como implementados por P7-A.

P6 `PACT-LAB-0.1` continua com uma oferta fixa Véu/Ferro na rodada 4. Seu motor, testes e interface permanecem; P7 aparece como modo local novo e independente. N-044 mantém seu sentido histórico e o experimento de contratos sob Issue #40 não foi reescrito.

## Validação e limites

Os testes verificam seleção pareada, seed repetível, pool vazio sem oferta, não repetição após recusa, confirmação antes do deal, expiração na fronteira 7/8, consumo único, Farol sem hole card exata, Renúncia de Ferro no executor, Ímpeto depois de um hit e bloqueio temporal de Foco. A camada local não é autoridade multiplayer. A distribuição de famílias é deterministicamente pseudorrandômica; nenhuma evidência de frequência real de escolhas, vantagem, equilíbrio, diversidade humana, diversão, fairness ou aprendizado foi gerada. Não há solver comparativo P7 nesta entrega.

Com Node compatível e pnpm da raiz, reproduza com `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm --filter @nocte/web test:e2e`. Para reproduzir uma família em unit fixture, chame `drawPactFamily(seed, 4)`; segunda oferta usa `drawPactFamily(seed, 8, [familiaPrimeira])`. Os seeds locais de navegador são gerados com `crypto.getRandomValues` e não são exibidos ao cliente.
