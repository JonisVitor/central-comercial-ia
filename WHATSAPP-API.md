# Integração oficial do WhatsApp

Esta integração usa a WhatsApp Business Platform (Cloud API) da Meta. Não usa QR, automação de navegador nem a sessão pessoal do WhatsApp.

## O que fica automatizado

- Receber webhooks de mensagens e status de entrega da Meta.
- Guardar mensagens recebidas/enviadas no D1, sem guardar o payload bruto do webhook.
- Associar uma conversa a um lead quando o telefone normalizado corresponder.
- Sincronizar mensagens na aba Conversas e mover um lead correspondente para “Respondeu”.
- Permitir que o Codex local analise a última resposta recebida e redija uma sugestão.
- Enviar a resposta revisada ao clicar em “Enviar pelo WhatsApp oficial”.

## Limites deliberados

- Não existe envio em massa nem envio automático da IA nesta fase.
- A rota de envio só aceita mensagem livre durante a janela de atendimento iniciada pelo contato (24 horas).
- Fora da janela, a API bloqueia o envio. Modelos aprovados, autorização do contato e registro de opt-in precisam ser implementados antes de mensagens iniciadas pela empresa.
- A integração pública não executa o Codex CLI. A sugestão de IA depende do executor local deste PC estar ligado; o recebimento e o envio oficial dependem da aplicação online e da conta Meta configurada.
- Tipos de mensagem sem texto são exibidos como marcador; download/transcrição de mídia não faz parte desta etapa.

## Configuração necessária

1. Criar/configurar um app no [Meta for Developers](https://developers.facebook.com/) e adicionar o produto WhatsApp. Concluir o onboarding da WhatsApp Business Platform, escolher um número elegível e obter o ID do número e token de acesso.
2. Aplicar a migration D1 `0002_whatsapp_inbox.sql` no ambiente de produção.
3. Na Cloudflare, abrir **Workers & Pages → Central Comercial IA → Settings → Variables and Secrets** e configurar:
   - Secrets: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`.
   - Variável comum: `WHATSAPP_API_VERSION` (versão suportada atualmente pela aplicação Meta).
4. Abrir o painel publicado → **Configurações → WhatsApp oficial**. A tela mostra o endereço de webhook do domínio publicado.
5. No produto WhatsApp do app Meta, configurar esse endereço como Callback URL e usar exatamente o mesmo `WHATSAPP_VERIFY_TOKEN`. Inscrever o campo `messages`.
6. Se o Cloudflare Access proteger todo o domínio, criar uma exceção **somente** para `GET/POST /api/whatsapp/webhook`; a função valida o token de verificação e a assinatura HMAC da Meta. Não liberar as rotas de estado, caixa de entrada ou envio.
7. Reimplantar depois de cadastrar os Secrets e validar o webhook no painel Meta. O status na tela Configurações deve ficar “API conectada”.

Nunca cole tokens no chat ou no código. O envio de mensagens pode gerar cobrança da Meta e está sujeito às regras e limites atuais da conta.

## API interna

- `GET /api/whatsapp/status` — estado booleano da configuração, sem devolver Secrets.
- `GET /api/whatsapp/inbox` — eventos normalizados de mensagens autenticadas.
- `POST /api/whatsapp/send` — envia resposta a um lead identificado, somente com janela de atendimento aberta.
- `GET|POST /api/whatsapp/webhook` — valida inscrição e recebe notificações assinadas da Meta.
