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

O preço é R$ 7,90 a cada 1.000 Robux. O PIX da FlevoPay leva o pacote e, se o cliente escolher, a entrega expressa de R$ 12,90. Pacotes de Robux ficam em `lib/catalog.ts`, no SKU `r{quantidade}`. A loja não vende Caixa Bux.

O SKU de uma conta é `a{índice do jogo}-{nível de 1 a 5}`. O texto de cada conta fica em `lib/account-lore.ts`.

## Checkout

A página inicial mostra os pacotes de Robux. O botão abre `/checkout`, e `POST /api/checkout` cria o PIX na FlevoPay em `POST https://pagamento-processador.org.ua/api/v1/transaction`, com o valor em centavos e a chave no cabeçalho `X-API-Key`.

```json
{
  "items": [{ "sku": "r1000", "quantity": 1 }],
  "customer": {
    "name": "Ana Silva",
    "email": "ana@email.com",
    "phone": "11988887777",
    "document": "08852175350",
    "roblox_username": "Stellar_01"
  }
}
```

O cliente informa nome e sobrenome, e-mail, telefone com DDD, CPF e usuário do Roblox. A descrição do PIX é o pacote, por exemplo `1000 Robux`. A resposta traz `qr_code` e o copia e cola. O pedido fica pendente até a FlevoPay marcar `approved`. A consulta `GET /api/pagamento/status?id=` devolve só o estado. O webhook `POST /api/webhooks/flevopay` confirma esse estado na API antes de aceitar o aviso.

`FLEVOPAY_API_KEY` fica só no servidor. Sem ela, o checkout responde que o PIX não pode ser gerado.
