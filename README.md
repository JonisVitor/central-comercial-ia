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
