# NOCTE-P9-H — Playtest local do Livro dos Pactos

**Status:** protocolo EXPERIMENTAL de coleta consentida para o modo `PACT-BOOK-0.1`. Implementar esta coleta não valida compreensão, interesse, diversão, equilíbrio nem regras definitivas. N-058 permanece EXPERIMENTAL; P8 é uma fonte de hipóteses de agentes, não de resultados humanos.

## Consentimento e controle

Na configuração do modo Livro dos Pactos, a coleta está desligada por padrão. Marcar a opção é o consentimento explícito para aquela Noite. Sem consentimento, o jogo prossegue normalmente e nenhum registro é criado. Com consentimento, um identificador aleatório efêmero e eventos permitidos ficam apenas na memória da página. Não há rede, API, cookie, armazenamento local ou persistência. Recarregar/fechar perde dados não exportados. A pessoa pode encerrar a Noite a qualquer momento e limpar os dados na tela final.

O questionário aparece depois de uma Noite concluída ou abandonada e é opcional. Exportar é uma ação manual. Não há texto livre.

## Dados registrados

O JSON tem `schemaVersion`, `PACT-BOOK-0.1`, perfil de pagamento natural, estado completo/abandonado, eventos e respostas. Eventos são derivados de transições públicas concluídas: ofertas (família e os dois IDs), assinatura/recusa, Face escolhida quando aplicável, Renúncia ativa e bloqueios detectados após tentativa rejeitada, consumo/expiração do Privilégio por rodada e contagens agregadas por rodada (Compras, Paradas, Doubles, Manobras, Leituras e Foco gasto). O resumo final contém score estratégico acumulado, variação da banca em meios de ficha, Foco gasto, rodadas financiadas/prática e situação final da banca.

Não são gravados nomes, contas, IP, navegador/OS, horário de parede, seeds, cartas, mãos, hole do dealer, draws futuros, texto livre ou identificadores persistentes. Cartas e estado privado nunca entram na projeção de playtest. O exportador rejeita chaves de dados privados ou identificáveis como defesa adicional. O ID aleatório é efêmero e serve somente para distinguir um arquivo local; não permite vinculação externa.

O questionário fechado opcional pergunta em escala 1–5/“Não sei” se a pessoa compreendeu Privilégio e Renúncia, sentiu a Renúncia afetar suas jogadas, achou interessante decidir quando usar o Privilégio e quer outra Noite; pergunta também se a oferta menos clara foi no Ato II, Ato III, nenhuma ou não sabe.

## Protocolo humano inicial

Convidar 4–8 voluntários. Não solicitar identificação. Cada pessoa pode jogar uma Noite no Livro dos Pactos; se a sessão permitir, jogar também uma Noite A1a sem Pactos, alternando a ordem entre participantes. Comparar clareza percebida e experiência relatada, sem atribuir diferenças de saldo/score aos Pactos: cartas, escolhas e ordem das condições diferem entre Noites. A participação, o questionário e a exportação são opcionais. A pessoa pode abandonar ou apagar seus dados em qualquer ponto antes da exportação.

Ao revisar arquivos, agrupar por família/ato, aceitação/recusa, privilégio usado/expirado e Renúncia efetivamente sentida. Não interpretar amostra pequena como equilíbrio ou dominância. A coleta automatizada é apenas auxiliar; não inventar resultados humanos. A P8 indicou hipóteses exploratórias, entre elas atratividade de Ferro, custo de Bastião e sinais myopic para Vigília/Fulgor/Caos; observar compreensão e contexto sem direcionar escolhas ou mudar regras durante a coleta.

## Validação e limites

Vitest cobre consentimento inexistente (sem coletor), eventos de ambas as ofertas, recusa/assinatura, consumo e expiração sem duplicação, agregação, exportação redigida e limpeza. Testes de integração comparam a mesma Noite determinística com e sem observação. Playwright verifica opt-out, início opt-in, abandono, questionário, exportação/limpeza, ausência de armazenamento e ausência de pedidos externos. A coleta segue no cliente local: não fornece autoridade multiplayer, validação de segurança contra adulteração, retenção entre páginas, estudos humanos executados ou conclusões de balanceamento.
