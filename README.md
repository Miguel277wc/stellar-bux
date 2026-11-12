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

O preço é R$ 7,90 a cada 1.000 Robux. O primeiro PIX (Axxon Pay) leva só os produtos e, se o cliente escolher, a entrega expressa de R$ 12,90. Depois do pagamento, `/upsell` cobra só a taxa antifraude (R$ 14,90), também via Axxon Pay. Pacotes de Robux ficam em `lib/catalog.ts`, no SKU `r{quantidade}`. A loja não vende Caixa Bux.

O SKU de uma conta é `a{índice do jogo}-{nível de 1 a 5}`. O texto de cada conta fica em `lib/account-lore.ts`.

## Checkout

A página inicial mostra os pacotes de Robux. O botão de compra abre o checkout hospedado da Axxon Pay, um link por pacote. `POST /api/checkout` continua disponível para uma cobrança direta autenticada. O servidor entra com `POST https://api.axxonpay.com.br/api/v1/api-auth/login` (`apiKey` e `apiSecret`) e gera a cobrança em `POST /api/v1/direct/payment`, com `paymentMethod: pix` e o valor em centavos. As chaves vão nos cabeçalhos `axxon-gateway-publickey` e `axxon-gateway-secretkey`.

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

O cliente informa nome e sobrenome, e-mail, telefone com DDD e usuário do Roblox. A descrição do PIX é sempre `Pedido Galaxy Bux`. A resposta traz `receiver_name`, o nome do recebedor que vem na cobrança, para bater com o que o banco exibe. A adquirente da conta é a Sicredi. Ela exige CPF ou CNPJ válido e um nome só com letras, nome e sobrenome, com no máximo 200 caracteres. Telefone com o 55 na frente, CPF inválido ou total abaixo de R$ 6,00 fazem a Axxon responder que não foi possível processar o pagamento. O servidor recusa esses casos antes da cobrança. Se os dados do pagador estão certos e a Sicredi continua recusando, o cadastro dela no painel está incompleto: chave Pix, certificado da API Pix, client id, client secret, cooperativa, posto e código do beneficiário. Se o cliente não enviar `customer.document`, o servidor usa `AXXONPAY_CUSTOMER_DOCUMENT`. `AXXONPAY_CUSTOMER_NAME` entra quando o pedido não traz `customer.name`.

A resposta traz `qr_code`, o copia e cola em `copia_cola` e `checkout_url` vazio, porque o PIX nasce na própria loja. O pedido fica pendente até a Axxon Pay marcar `FINISHED` ou `PAID`, o que a loja devolve como `approved`. A página do pedido consulta `GET /api/pagamento/status?id=` e recebe só o estado do pagamento, sem o código Pix. O webhook `POST /api/webhooks/axxonpay` só confirma a cobrança quando `AXXONPAY_WEBHOOK_SECRET` valida a assinatura `Axxon-Signature`. Sem o segredo, a loja recusa a notificação.

`AXXONPAY_API_KEY` e `AXXONPAY_API_SECRET` ficam só no servidor. São o par `pk_` / `sk_` em Integrações → Credenciais da API. Sem as duas, o checkout responde que o PIX não pode ser gerado.
