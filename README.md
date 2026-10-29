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
