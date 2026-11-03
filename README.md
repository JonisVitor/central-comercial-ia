# Central Comercial IA

PWA para prospecção manual no Google Maps, organização de leads, mensagens preparadas e acompanhamento de projetos.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Publicação

O projeto usa Cloudflare Pages com `npm run build`, saída em `dist` e uma Function em `functions/api/state.js` conectada ao Cloudflare D1.

As mensagens do WhatsApp são preparadas para envio manual. O app não faz scraping nem dispara mensagens automaticamente.

## Gestão de leads

Abra um lead no painel para editar a etapa comercial, registrar se o site foi encontrado, guardar links do site, Google Maps e Instagram, atualizar o prazo de retorno e manter notas. No endereço público, as alterações são sincronizadas com o Cloudflare D1.

## Verificação automática · 0.6.44

No painel local (`npm run dev`), salvar um lead por qualquer importador JSON, cadastro manual ou pesquisa inicia a fila persistente de verificação. Leads existentes entram uma vez na primeira abertura desta versão. O verificador pesquisa site próprio, ficha do Maps, Instagram oficial e atividade pública usando o Codex CLI autenticado, em lotes de três, consumindo o limite do plano.

Abra a ficha para acompanhar **Na fila**, **Pesquisando**, resultados e fontes. Bloqueio, homônimo ou data de publicação indisponível aparecem como **não confirmado**, sem simular uma verificação bem-sucedida. **Pesquisar novamente** repete uma tentativa explicitamente; reiniciar o projeto retoma os trabalhos interrompidos, sem repetir automaticamente pesquisas já concluídas ou falhas. Não há envio de mensagens neste fluxo.

O acesso protegido do PC usa o mesmo CRM e executor. A versão Pages/D1, sozinha, não executa o Codex instalado no computador.
