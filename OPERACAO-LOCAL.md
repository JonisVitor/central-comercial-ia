# Operação local — 0.6.42

Abra `START-LOCAL.cmd`. O painel fica em http://127.0.0.1:4175 e o executor em 127.0.0.1:4174. O iniciador verifica versão e data dos arquivos do executor e substitui somente o serviço reconhecido deste projeto quando estiver ocioso.

## WhatsApp

No menu lateral, **WhatsApp** abre o QR, o estado real da sessão e os contatos do CRM. Clique em **Conectar WhatsApp**; no celular, abra **Aparelhos conectados → Conectar um aparelho** e escaneie o código. A sessão salva é restaurada ao iniciar o executor. Desconectar desativa essa restauração.

É uma conexão não oficial com whatsapp-web.js e Chrome instalado. Pode exigir novo QR ou ser restringida pelo WhatsApp. Não há cobrança de API Meta nesta conexão. O computador e o executor precisam ficar ligados. As rotas oficiais da Meta do painel online continuam independentes.

Autenticação e eventos ficam em `%LOCALAPPDATA%\CentralComercialIA\whatsapp`, fora do Git. Apenas mensagens novas de números presentes no CRM são coletadas. Grupos e conversas pessoais não cadastradas ficam fora. Mídias recebem uma indicação para consulta no WhatsApp; não são transcritas.

Cada envio pelo painel exige um clique e confirmação. Leads encerrados ou marcados para não contatar são bloqueados. Não há envio em lote nem resposta automática da IA. O serviço local limita envios a um a cada 10 segundos; campanhas ativas também verificam horário e cota diária no painel. Envios feitos diretamente no celular ficam sob controle do operador.

## Central de trabalho

- **Fila:** prioriza mensagens recebidas e rascunhos. “Analisar próximo passo” consulta o Codex e salva uma sugestão na conversa.
- **Campanhas:** agrupa leads escolhidos pelo operador; organiza nicho, cidade, cota e horário. A pesquisa usa o pesquisador existente. Revise e adicione os resultados à campanha em “Editar participantes”. A distribuição de variantes A/B só altera mensagens iniciais ainda não enviadas.
- **Funil:** rascunho editável, revisão com Codex, simulação, publicação e histórico de versões. Restaurar uma versão copia para rascunho; requer nova publicação. As instruções publicadas aparecem na ficha do lead.
- **Retomadas:** intervalo de 1–6 dias corridos para novos lembretes e variantes editáveis, com sugestões opcionais de IA. Lembretes antigos mantêm suas datas. Encerramento por silêncio continua após sete dias do último envio confirmado.
- **Recuperação:** elegíveis somente os leads encerrados automaticamente por silêncio. Recusas e “não contatar” não entram. A IA prepara um rascunho; reabrir exige confirmação.
- **Resultados:** contagens reais do CRM e variantes. Distribuição atual por etapa não é conversão histórica; as contagens de A/B não demonstram causalidade.
- **Histórico:** etapas, cadastros, exclusões, envios confirmados, publicações e sugestões de IA. Mantém até mil eventos, sem credenciais/QR.
- **Integrações de IA:** lista o que chama Codex, o que usa regras e o que falta integrar.

O resumo de hoje inclui reuniões/tarefas vencidas e entregas de projetos. O fechamento do dia no chat usa o orquestrador já existente para criar plano e compromissos. Avisos do navegador exigem ativação pelo botão e funcionam enquanto a página estiver aberta; não são push com o navegador fechado.

## IA e limites

As chamadas usam o Codex CLI autenticado, sem chave de API. O plano e a disponibilidade do modelo continuam sujeitos aos limites da conta. Os sete agentes e as ações de campanhas/funil/recuperação/próximos passos usam o executor local. A pesquisa nativa consulta fontes públicas; perfis Maps/Instagram inacessíveis permanecem não verificados, sem inventar evidências.

Permanecem fora da integração: produção/publicação automática de LPs, publicação de conteúdo social, transcrição de mídia, resposta automática a mensagens recebidas, execução de IA no site público e sincronização automática do CRM local com o online.

## Verificação desta entrega

Teste de interface em perfil de navegador isolado: campanha, distribuição somente em rascunhos, funil publicado, recuperação elegível, fila, indicadores, histórico e navegação mobile. Respostas de IA simuladas apenas nesse teste de UI.

Verificação real separada com Codex e contexto fictício: campanhas, funil, recuperação e os sete agentes concluíram sem erro em um executor com diretório de histórico isolado. Geração real de QR conferida. Login no celular e envio/recebimento de ponta a ponta exigem pareamento do proprietário e não foram simulados como concluídos.

Dependências: navegador Puppeteer atualizado por override, usando Chrome do sistema sem download de navegador. A auditoria no momento da implementação não indicou vulnerabilidades altas/críticas; restam avisos moderados em dependências transitivas antigas da biblioteca WhatsApp. Não execute `npm audit fix --force` sem validar compatibilidade.

## Atualização 0.6.43 — caixa de entrada e celular

A área WhatsApp mostra uma caixa de entrada: conversas à esquerda, mensagens sincronizadas ao centro e rascunho editável com sugestão do Codex. O botão de envio pede confirmação. Histórico sincronizado é identificado; não é confundido com rascunho da IA nem altera etapas por conta própria. A busca traz até 40 mensagens disponíveis por conversa dos leads, limitada a 200 telefones por sincronização e 2000 eventos recentes no cache. A disponibilidade de mensagens antigas depende do WhatsApp; grupos e conversas fora do CRM não entram.

O CRM local agora tem uma cópia central em `%LOCALAPPDATA%\CentralComercialIA\crm\workspace.json`. O primeiro navegador do PC carrega os registros existentes; um telefone não pode inicializar o arquivo vazio. As gravações usam revisão e backup: se outro aparelho alterar o CRM simultaneamente, o painel preserva um backup no navegador e pede atualização. Dados de recuperação local ficam em `central-before-shared-crm` e `central-crm-conflict-backup`, sem apagar o armazenamento anterior.

**Acesso pelo celular:** o proprietário autorizou explicitamente a ativação com login limitado ao e-mail individual configurado. A página e a API do CRM foram verificadas anonimamente e redirecionaram para o login Cloudflare. O login por PIN e a conferência no celular devem ser concluídos pelo proprietário. Em Configurações há o e-mail autorizado e os controles Ativar/Desativar. `INSTALAR-TUNEL.ps1` instala o cloudflared oficial sem iniciar qualquer túnel. A ativação usa `cloudflared --allowed-mail` para exigir PIN de e-mail na Cloudflare; não se utiliza um túnel público sem autenticação como fallback.

O gateway escuta apenas em `127.0.0.1:4177`, serve a build em `dist` (não expõe Vite, arquivos do projeto ou Git), exige Host privado aleatório entre cloudflared e origem, restringe Origin e só encaminha APIs necessárias. Administração do túnel não é encaminhada. Testes locais conferem as recusas de Host/Origin/rotas administrativas, proteção de caminhos, cache e CSP. A inspeção autenticada de ponta a ponta pelo celular ainda exige ativação autorizada e login do proprietário; testes locais não provam esse login.

O link temporário muda ao reiniciar e exige PC/executor ligados. Agentes, WhatsApp e arquivo do CRM continuam no PC; Cloudflare transporta o acesso HTTPS. A instalação `.pages.dev` segue separada. Quick Tunnels são para uso temporário/desenvolvimento, sem a estabilidade de um túnel com domínio próprio. Documentação: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/.
