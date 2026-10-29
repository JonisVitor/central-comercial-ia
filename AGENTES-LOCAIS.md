# Agentes locais da Central Comercial

## O que esta integração faz

O botão **Executar agentes** inicia seis processos independentes do Codex CLI, um para cada perfil em `.codex/agents/`. Eles recebem somente os registros reais carregados no navegador e produzem análises para revisão. O executor não pesquisa no Google Maps, não envia mensagens, não altera etapas/fogo nem grava resultados no CRM.

As chamadas usam a conta autenticada no Codex CLI. Não configuramos chave de API. A execução consome os limites de uso incluídos no plano Codex, portanto o botão é manual e não há agendamento contínuo.

## Iniciar no Windows

1. Abra o projeto `central-comercial-ia` no terminal.
2. Em uma janela, rode `npm run dev` e abra `http://localhost:4175`.
3. Em outra janela, rode `npm run agents-runtime`.
4. No painel, abra **Agentes**. O indicador deve mostrar **Codex local conectado**.
5. No painel Cloudflare, use **Exportar dados** para baixar o JSON.
6. No app local, abra **Agentes** → **Importar JSON**, selecione o arquivo exportado e clique **Executar agentes**.

## Chat do assistente

- O botão de conversa fica fixo no canto inferior direito do app.
- Perguntas comuns são respondidas pelo Codex CLI autenticado. Cada resposta usa o plano Codex.
- Um pedido explícito para analisar, revisar ou qualificar leads/projetos inicia os seis perfis em sequência e abre a tela **Agentes**.
- O chat usa os registros reais carregados no navegador ou o JSON importado. Sem dados reais, peça para importar a exportação em **Agentes**.
- O chat não pesquisa na web, não abre Google Maps, não altera o CRM, não publica sites e não envia mensagens.
- O histórico da conversa fica no armazenamento local deste navegador; não sincroniza com Cloudflare D1 nem com outros dispositivos.

O Codex CLI precisa estar instalado e autenticado (`codex login status`). Não instale Maestri ou tmux para essa integração: eles servem para gerenciar/observar terminais, não para substituir o executor do painel.

## Dados e limites

- A aplicação envia os registros ao processo local apenas durante a execução.
- O executor aceita no máximo 30 leads e 15 projetos por lote.
- Registros marcados como demonstração são descartados.
- O JSON importado fica em `localStorage` deste navegador como uma cópia local de trabalho; importar não altera nem sincroniza o banco Cloudflare.
- Resultados das últimas execuções ficam em `%TEMP%\CentralComercialIA\agent-runs.json` e não são enviados ao CRM.
- O processo escuta somente em `127.0.0.1:4174`; o Vite encaminha as chamadas para ele.
- O executor existe apenas no computador onde foi iniciado. A versão Cloudflare e o celular não têm acesso a ele. Não deixe o computador/terminal como serviço 24h: não há agendamento configurado.
- A execução é sequencial: uma chamada de Codex para cada papel, em vez de um único modelo fingindo ser seis pessoas.

Se o projeto estiver em outro computador Windows, instale Node.js, o app Codex/Codex CLI, entre na conta e autentique o CLI antes de seguir os passos acima.
