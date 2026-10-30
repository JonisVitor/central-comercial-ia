# Agentes locais da Central Comercial

## O que esta integração faz

O botão **Executar agentes** inicia sete processos independentes do Codex CLI, um para cada perfil interno em `.codex/agents/`. Eles recebem somente os registros reais carregados no navegador e produzem análises para revisão. O chat também pode iniciar o perfil **Pesquisador web**, que usa a busca web nativa do Codex CLI e apresenta links e candidatos estruturados. A pesquisa não grava leads por conta própria; o operador pode selecionar e confirmar a importação. Nenhuma dessas funções envia mensagens.

Os playbooks adaptam, em português e para a venda de landing pages a negócios locais, ideias de qualificação, sinais, escrita, tratamento de respostas e análise do funil descritas pelo projeto open source Harvey. A licença e a atribuição estão em `THIRD-PARTY-NOTICES.md`. O aplicativo Harvey não está instalado aqui: seu README atual restringe o uso de Codex a macOS/Linux e não declara suporte a Windows.

As chamadas usam a conta autenticada no Codex CLI. Não configuramos chave de API. A execução consome os limites de uso incluídos no plano Codex, portanto o botão é manual e não há agendamento contínuo.

## Iniciar no Windows

1. Abra o **Windows PowerShell ou Windows Terminal pelo menu Iniciar**, fora do terminal integrado do Codex.
2. Navegue até a pasta `central-comercial-ia`.
3. Em uma janela, rode `npm run dev` e abra `http://127.0.0.1:4175`.
4. Em outra janela, rode `npm run agents-runtime`.
   - O executor precisa iniciar o Codex CLI como um processo local. Se for iniciado dentro de um sandbox que bloqueia subprocessos, o chat mostra `spawn EPERM`; rode este comando numa janela normal do Windows.
5. No painel, abra **Agentes**. O indicador deve mostrar **Codex local conectado**.
6. No painel Cloudflare, use **Exportar dados** para baixar o JSON.
7. No app local, abra **Agentes** → **Importar JSON**, selecione o arquivo exportado e clique **Executar agentes**.

## Chat do assistente

- O botão de conversa fica fixo no canto inferior direito do app.
- Perguntas comuns são respondidas pelo Codex CLI autenticado. Cada resposta usa o plano Codex.
- Um pedido explícito para analisar, revisar ou qualificar leads/projetos inicia os sete perfis em sequência, incluindo o **Analista de funil**, e abre a tela **Agentes**.
- Um comando direto como **“Pesquise pet shops em São Carlos no Google Maps”** inicia uma pesquisa web do Codex e apresenta links, evidências e candidatos para revisar em **Agentes**.
- O chat usa os registros reais carregados no navegador ou o JSON importado. Sem dados reais, peça para importar a exportação em **Agentes**.
- A pesquisa usa `codex exec --search`, disponível no Codex CLI instalado. Ela usa a cota do plano Codex autenticado; não configuramos chave de API. O agente tenta localizar perfis públicos do Maps pela busca web; isso não é Places API e não garante que a ficha ou o cadastro estejam completos.
- Leads importados após confirmação entram como **Precisa verificar**, fogo neutro 50/100, sem rascunho e sem contato realizado. Duplicatas por nome/cidade são ignoradas.
- O chat não publica sites e não envia mensagens.
- O histórico da conversa fica no armazenamento local deste navegador; não sincroniza com Cloudflare D1 nem com outros dispositivos.

O Codex CLI precisa estar instalado e autenticado (`codex login status`). Não instale Maestri ou tmux para essa integração: eles servem para gerenciar/observar terminais, não para substituir o executor do painel.

## Dados e limites

- A aplicação envia os registros ao processo local apenas durante a execução.
- O executor aceita no máximo 30 leads e 15 projetos por lote.
- Registros marcados como demonstração são descartados.
- O JSON importado fica em `localStorage` deste navegador como uma cópia local de trabalho; importar não altera nem sincroniza o banco Cloudflare.
- Resultados das últimas execuções ficam em `%TEMP%\CentralComercialIA\agent-runs.json` e não são enviados ao CRM.
- O processo escuta somente em `127.0.0.1:4174`; o Vite encaminha as chamadas para ele.
- O executor e a pesquisa ficam no computador onde foram iniciados. A versão Cloudflare e o celular ainda não têm acesso a eles; para isso será necessária uma ponte remota autenticada e um computador/servidor ativo.
- A execução é sequencial: uma chamada do Codex para cada papel, incluindo o Analyst adaptado do Harvey. A quantidade de chamadas usa mais cota do plano do que a v0.3.0.
- O agente de mensagens prepara rascunhos; não existe um Sender automático. O operador revisa e envia manualmente.

Se o projeto estiver em outro computador Windows, instale Node.js, o app Codex/Codex CLI, entre na conta e autentique o CLI antes de seguir os passos acima.
# Fluxo de prospecção integrado (v0.6.0)

No chat da Central local, pedidos diretos com nicho e cidade (por exemplo, “quero lanchonetes em São Carlos”) iniciam uma execução sequencial do Codex CLI autenticado: pesquisa web pública, triagem/deduplicação, verificação pública, qualificação, rascunho de WhatsApp e roteiro de conversa, e resumo.

As execuções de prospecção podem usar a busca web nativa do Codex. Não usam Places API nem chave de API. A busca não é exaustiva e não garante cobertura completa do Google Maps. Só entram no CRM local negócios com identidade e fonte confirmadas, qualificação elegível e mensagem/roteiro gerados. Duplicados são ignorados. O score de 0–100 é um sinal explicável de oportunidade, não probabilidade de compra.

O CRM recebe leads na etapa “Aguardando aprovação”; os rascunhos e roteiros ficam editáveis. Nunca enviar mensagem automaticamente. A aprovação, abertura do WhatsApp/envio e criação de landing pages continuam manuais. Os dados ficam no armazenamento local deste navegador e não sincronizam com Cloudflare D1.

Cada etapa consome o limite de uso do Codex autenticado; uma execução pode iniciar várias chamadas sequenciais. Para reduzir custo, o fluxo limita a pesquisa a 15 empresas por padrão (máximo 20) e não preenche resultados ausentes por invenção.
