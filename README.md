# Galaxy Bux

Loja da Galaxy Bux: pacotes de Robux, gift cards e contas de jogos. O visual segue o tema espacial da página original, com carrinho persistente, busca de jogos e checkout que recalcula o preço no servidor.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run lint
```

## Catálogo

O preço é R$ 7,90 a cada 1.000 Robux. O primeiro PIX (FlevoPay) leva só os produtos e, se o cliente escolher, a entrega expressa de R$ 12,90. Depois do pagamento, `/upsell` cobra só a taxa antifraude (R$ 14,90), também via FlevoPay. Pacotes, gift cards e contas ficam em `lib/catalog.ts`. A loja não vende Caixa Bux.

O SKU de uma conta é `a{índice do jogo}-{nível de 1 a 5}`. O texto de cada conta fica em `lib/account-lore.ts`.

## Checkout

`POST /api/checkout` recalcula o total e cria um PIX na FlevoPay (`POST https://app.flevopay.com.br/api/v1/transaction`), com `source: api_externa` e a chave da loja no cabeçalho `X-API-Key`. A loja padrão é a `11242`.

```json
{
  "items": [{ "sku": "r1000", "quantity": 1 }],
  "customer": {
    "email": "ana@email.com",
    "phone": "11988887777",
    "roblox_username": "Stellar_01"
  }
}
```

O cliente informa e-mail, telefone com DDD e usuário do Roblox. A descrição do PIX é sempre `Pedido Galaxy Bux`. A página do pedido mostra o nome do recebedor que vem no QR, para bater com o que o banco exibe. A FlevoPay também exige `customer.document`; `FLEVOPAY_COMPANY_DOCUMENT` e `FLEVOPAY_COMPANY_NAME` definem o documento e o nome enviados na cobrança.

A resposta traz `checkout_url`, o QR Code e o copia e cola. O pedido fica pendente até a FlevoPay marcar `approved`. A página do pedido consulta `GET /api/pagamento/status`, e o webhook `POST /api/webhooks/flevopay` confirma o mesmo status na API antes de aceitar a notificação.

A chave secreta fica só no servidor, na variável `FLEVOPAY_API_KEY`. Ela é a chave da loja 11242, em Configurações e API. `FLEVOPAY_STORE_ID` troca a loja se precisar. Sem a chave, o checkout responde que o PIX não pode ser gerado.
