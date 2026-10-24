# NOCTE-P10 — Guia do preview compartilhável

**Estado:** preview estático experimental, hospedagem pública planejada em GitHub Pages. A URL só será divulgada depois que Pages for habilitado e um deployment concluído for verificado.

## Habilitar a publicação

Depois que o PR que adiciona `.github/workflows/pages.yml` for integrado, uma pessoa com acesso às configurações do repositório deve abrir **Settings → Pages → Build and deployment** e escolher **GitHub Actions** como fonte. A integração disponível nesta execução não permite alterar essa configuração. O workflow publica somente `packages/web/dist` quando há push em `main`; o primeiro deployment só estará ativo após o job `Deploy NOCTE preview to GitHub Pages` terminar com sucesso. A URL prevista para o projeto é `https://andresant-ana.github.io/nocte/`, mas ela ainda não foi verificada nem deve ser tratada como ativa.

Para desativar o preview, remova a fonte GitHub Actions em **Settings → Pages** e, se desejado, desabilite o workflow `Deploy NOCTE preview to GitHub Pages` no repositório. Não é necessário apagar os dados de playtest dos participantes: o site não os recebe.

## Convidar e orientar voluntários

Compartilhe o endereço público somente depois da verificação do deployment. Avise que o NOCTE é um protótipo experimental de gameplay, não um produto final. As fichas são fictícias: não existe carteira real, prêmio, resgate, ranking ou monetização. O Livro dos Pactos e suas regras continuam experimentais.

1. Abra o site em um navegador atualizado, desktop ou celular.
2. Selecione **Livro dos Pactos · P7-C · EXPERIMENTAL** e inicie **Jogar livre**.
3. A participação no playtest é opcional e começa desligada. O jogo funciona normalmente sem consentir.
4. Se aceitar participar, conclua ou abandone a Noite conforme desejar. Ao final, o questionário é opcional.
5. Use **Exportar JSON** apenas se quiser compartilhar o arquivo manualmente com a equipe do estudo. A exportação ocorre no navegador após seu clique; não há formulário ou envio automático.
6. Use **Limpar dados** para descartar o registro em memória antes de sair. Recarregar ou fechar a página também apaga qualquer registro que não tenha sido exportado.

## Dados e privacidade

Os eventos do playtest e respostas ficam apenas na memória da página. O JSON é criado localmente e baixado somente por ação explícita; o jogo não transmite eventos, respostas, cartas, seeds ou identificadores para o site. Não há backend, conta, analytics, cookie, armazenamento local ou sessão persistida.

O preview é público, não um espaço privado de participantes. O provedor de hospedagem ainda recebe requisições HTTP necessárias para servir a página e pode manter logs de infraestrutura. O GitHub informa que registra e armazena o endereço IP de visitantes de GitHub Pages por motivos de segurança, mesmo sem login ([documentação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)). Isso é distinto da coleta opcional do NOCTE: o jogo não lê nem inclui o IP no registro ou JSON.

Não inclua nomes, contatos ou outros identificadores no nome/comentário de um arquivo enviado à equipe. A participação e o compartilhamento do JSON continuam voluntários.

## Validação local do subpath

Na raiz do monorepo, com Node 22+ e pnpm 12.9.1:

```sh
pnpm install --frozen-lockfile
pnpm --filter @nocte/web build:pages
pnpm --filter @nocte/web test:e2e:pages
```

O build de Pages configura assets sob `/nocte/`; o teste E2E serve o diretório `dist` nesse subpath e verifica HTTPS-equivalent secure-context APIs no Chromium local (`crypto.randomUUID` e `crypto.subtle`), carregamento de assets sem 404, fluxo de duas ofertas/dez rodadas, opt-in, exportação local, ausência de persistência/rede externa e ajuste de viewport desktop/mobile. `localhost` é tratado pelo navegador como contexto seguro para este teste; a hospedagem configurada pelo GitHub Pages usa HTTPS.
