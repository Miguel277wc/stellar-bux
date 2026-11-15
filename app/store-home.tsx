"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import lore from "@/lib/account-lore.json";
import {
  EXPRESS_DELIVERY_CENTS,
  GAMES,
  GIFT_CARDS,
  ITEM_OFFERS,
  MAX_ROBUX,
  MIN_PIX_CENTS,
  ROBUX_PACKS,
  ROBUX_STEP,
  accountsOf,
  productBySku,
  quoteCheckout,
  startingPriceCents,
} from "@/lib/catalog";
import { useCart, type Cart, type CartItem } from "@/lib/use-cart";

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const FEATURED = [0, 1, 52, 26, 5, 6];
const CHIPS = [600, 1200, 1800, 2400, 3600, 6000, 12000, 30000, 60000, 120000];
const FRAMES: Record<string, string> = {
  iheadless: "offer-frame-headless",
  ikorblox: "offer-frame-korblox",
  idragon: "offer-frame-dragon",
  ileopard: "offer-frame-leopard",
  igodhuman: "offer-frame-godhuman",
};

type LoreTier = { highlights: string[]; description: string };

function money(cents: number) {
  return reais.format(cents / 100);
}

function addItem(cart: Cart, sku: string): Cart {
  const product = productBySku(sku);
  if (!product) return cart;
  const existing = cart.items.find((item) => item.sku === sku);
  if (product.unique) {
    if (existing) return cart;
    return { ...cart, items: [...cart.items, { sku, quantity: 1 }] };
  }
  if (existing) {
    return {
      ...cart,
      items: cart.items.map((item) => (item.sku === sku ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item)),
    };
  }
  return { ...cart, items: [...cart.items, { sku, quantity: 1 }] };
}

export function StoreHome() {
  const { cart, update } = useCart();
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [calc, setCalc] = useState(6000);
  const [query, setQuery] = useState("");
  const [moreGames, setMoreGames] = useState(false);
  const [openGame, setOpenGame] = useState<number | null>(null);

  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const quote = useMemo(() => {
    try {
      return cart.items.length ? quoteCheckout(cart.items, cart.express) : null;
    } catch {
      return null;
    }
  }, [cart]);

  function buy(sku: string) {
    update(addItem(cart, sku));
  }

  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawer]);

  function changeQty(item: CartItem, quantity: number) {
    const product = productBySku(item.sku);
    if (!product || product.unique) return;
    update({
      ...cart,
      items: cart.items
        .map((line) => (line.sku === item.sku ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    });
  }

  const search = query.trim().toLowerCase();
  const ordered = GAMES.map((name, index) => ({ name, index })).sort((a, b) => {
    const aFeatured = FEATURED.indexOf(a.index);
    const bFeatured = FEATURED.indexOf(b.index);
    if (!search && aFeatured !== bFeatured) {
      if (aFeatured === -1) return 1;
      if (bFeatured === -1) return -1;
      return aFeatured - bFeatured;
    }
    return a.index - b.index;
  });
  const visibleGames = ordered.filter((game) => !search || game.name.toLowerCase().includes(search));
  const shownGames = moreGames || search ? visibleGames : visibleGames.slice(0, 8);
  const calcProduct = productBySku(`r${calc}`);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/12 bg-white/5 backdrop-blur-xl">
        <a href="#conteudo" className="sr-only">
          Pular para o conteúdo
        </a>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link className="flex min-w-0 items-center" href="/">
            <span className="logo-circle shrink-0">
              <img src="/stellar-bux-logo.png" alt="Stellar Bux" width="320" height="320" className="logo-header" />
            </span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex" aria-label="Seções">
            <Link className="text-[0.95rem] font-semibold text-muted-foreground hover:text-foreground" href="/#robux">
              Robux
            </Link>
            <Link className="text-[0.95rem] font-semibold text-muted-foreground hover:text-foreground" href="/#ofertas">
              Ofertas
            </Link>
            <Link className="text-[0.95rem] font-semibold text-muted-foreground hover:text-foreground" href="/#contas">
              Contas
            </Link>
            <Link className="text-[0.95rem] font-semibold text-muted-foreground hover:text-foreground" href="/#giftcards">
              Gift Cards
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/18 bg-white/8 px-3 py-1.5 text-foreground"
              aria-label={`Abrir carrinho, ${count} itens`}
              onClick={() => setDrawer(true)}
            >
              <span>Carrinho</span>
              <span className="min-w-5 rounded-full bg-gradient-to-r from-[#a855f7] to-[#7c3aed] px-1.5 text-center text-xs font-bold">
                {count}
              </span>
            </button>
            <button type="button" className="rounded-lg border border-white/15 px-3 py-2 font-bold md:hidden" onClick={() => setMenu((open) => !open)}>
              Menu
            </button>
          </div>
        </div>
        {menu ? (
          <nav className="grid gap-2 px-5 pb-4 md:hidden" aria-label="Seções">
            <Link href="/#robux" onClick={() => setMenu(false)}>Robux</Link>
            <Link href="/#ofertas" onClick={() => setMenu(false)}>Ofertas</Link>
            <Link href="/#contas" onClick={() => setMenu(false)}>Contas</Link>
            <Link href="/#giftcards" onClick={() => setMenu(false)}>Gift Cards</Link>
          </nav>
        ) : null}
      </header>

      <main id="conteudo" className="flex-1 outline-none">
        <div className="relative mx-auto grid max-w-6xl justify-items-center px-5 pt-12 pb-8 text-center sm:pt-16">
          <span className="logo-hero-wrap relative z-[1]">
            <img src="/stellar-bux-logo.png" alt="Stellar Bux — Seu universo. Seus Robux." width="1120" height="1120" className="logo-hero" />
          </span>
          <p className="mt-5 max-w-[440px] text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Robux, gift cards e contas premium — entrega na sua conta do Roblox.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 font-bold" href="/#robux">Robux</Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 font-bold" href="/#ofertas">Ofertas</Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 font-bold" href="/#contas">Contas</Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 font-bold" href="/#giftcards">Gift Cards</Link>
          </div>
        </div>

        <section id="robux" className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-12">
          <div className="mb-7 max-w-2xl">
            <h2 className="neon-title text-[1.7rem] sm:text-[1.85rem]">Robux</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">R$ 11,90 a cada 600 Robux.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {ROBUX_PACKS.map((amount, index) => {
              const product = productBySku(`r${amount}`);
              return (
                <article className="glass relative flex flex-col gap-3 overflow-hidden rounded-[18px] p-4" key={amount}>
                  {index === 0 ? (
                    <span className="absolute top-2 right-2 z-[1] rounded-full border border-[#c084fc] bg-[#1a0b2e] px-2.5 py-0.5 text-[0.68rem] font-extrabold tracking-wide text-[#e9d5ff] uppercase">
                      Oferta
                    </span>
                  ) : null}
                  <div className="relative -mx-4 -mt-4 mb-1 h-24 overflow-hidden border-b border-white/10 bg-[#12081f]">
                    <img alt={`Pacote de ${amount.toLocaleString("pt-BR")} Robux`} className="absolute inset-0 h-full w-full object-cover" src="/products/robux.png" />
                  </div>
                  <div>
                    <h3 className="neon-title neon-title-sm text-lg">{amount.toLocaleString("pt-BR")} Robux</h3>
                    <p className="mt-1 text-xl font-extrabold text-[#e9d5ff]">{product ? money(product.amountCents) : ""}</p>
                  </div>
                  <button type="button" className="btn-glass w-full" onClick={() => buy(`r${amount}`)}>
                    Adquirir
                  </button>
                </article>
              );
            })}
          </div>
          <div className="glass mt-5 max-w-xl rounded-[18px] p-5 sm:p-6">
            <h3 className="neon-title neon-title-sm text-lg">Calculadora de Robux</h3>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">De {ROBUX_STEP.toLocaleString("pt-BR")} a {MAX_ROBUX.toLocaleString("pt-BR")} Robux, de 600 em 600.</p>
            <label htmlFor="calcRobux">Quantidade de Robux</label>
            <input
              id="calcRobux"
              className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-white/6 px-3 text-base text-foreground outline-none"
              type="number"
              inputMode="numeric"
              min={ROBUX_STEP}
              max={MAX_ROBUX}
              step={ROBUX_STEP}
              value={calc}
              onChange={(event) => setCalc(Number(event.target.value))}
            />
            <input
              className="mt-4 w-full accent-[#7c3aed]"
              type="range"
              min={ROBUX_STEP}
              max={120000}
              step={ROBUX_STEP}
              aria-label="Ajustar quantidade de Robux até 120.000"
              value={Math.min(calc, 120000)}
              onChange={(event) => setCalc(Number(event.target.value))}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {CHIPS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="cursor-pointer rounded-full border border-white/15 bg-white/6 px-3 py-1 text-xs font-semibold hover:border-[#c084fc]"
                  onClick={() => setCalc(amount)}
                >
                  {amount.toLocaleString("pt-BR")}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xl font-extrabold" aria-live="polite">
              {calcProduct ? `${calc.toLocaleString("pt-BR")} Robux = ${money(calcProduct.amountCents)}` : "Escolha um múltiplo de 600."}
            </p>
            <button type="button" className="btn-glass mt-4 w-full" disabled={!calcProduct} onClick={() => calcProduct && buy(calcProduct.sku)}>
              Adquirir esta quantidade
            </button>
          </div>
        </section>

        <section id="ofertas" className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-12">
          <div className="mb-7 max-w-2xl">
            <h2 className="neon-title text-[1.7rem] sm:text-[1.85rem]">Ofertas</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">Headless, Korblox, frutas permanentes e Godhuman — mesmos preços do checkout.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ITEM_OFFERS.map((offer) => (
              <article className="glass glass-hover flex flex-col overflow-hidden rounded-[18px]" key={offer.sku}>
                <div className={`relative flex h-[200px] items-center justify-center overflow-hidden px-3 offer-frame ${FRAMES[offer.sku] ?? ""}`}>
                  <img alt={offer.name} className="absolute inset-0 h-full w-full object-contain p-3" src={offer.image} />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-[1.05rem] font-semibold leading-tight">{offer.name}</h3>
                  <p className="text-sm text-muted-foreground">{offer.description}</p>
                  <div className="mt-2 flex items-end justify-between font-extrabold tracking-tight">
                    <span className="font-semibold text-muted-foreground line-through text-xs">{offer.compareAtCents ? money(offer.compareAtCents) : ""}</span>
                    <span className="font-extrabold text-[#e9d5ff] text-base">{money(offer.amountCents)}</span>
                  </div>
                  <button type="button" className="btn-glass w-full" onClick={() => buy(offer.sku)}>Adquirir</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="contas" className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-12">
          <div className="mb-7 max-w-2xl">
            <h2 className="neon-title text-[1.7rem] sm:text-[1.85rem]">Contas</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">A partir da conta mais barata.</p>
          </div>
          <div className="relative mb-5 max-w-md">
            <input
              id="gSearch"
              type="search"
              placeholder="Buscar jogo (ex: Blox Fruits)"
              aria-label="Buscar jogo"
              className="h-11 w-full rounded-lg border border-white/15 bg-white/6 px-3"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Jogos">
            {shownGames.map((game) => {
              const open = openGame === game.index;
              const tiers = accountsOf(game.index);
              const notes = (lore as LoreTier[][])[game.index] ?? [];
              return (
                <article className={open ? "col-span-full overflow-hidden rounded-[18px] border glass" : "overflow-hidden rounded-[18px] border glass"} key={game.name}>
                  <button
                    type="button"
                    aria-expanded={open}
                    className="flex w-full cursor-pointer flex-col text-left"
                    onClick={() => setOpenGame(open ? null : game.index)}
                  >
                    <div className="relative h-36 overflow-hidden bg-black/40 sm:h-44">
                      <img alt={`Capa de ${game.name}`} className="absolute inset-0 h-full w-full object-cover" src={`/game-covers/${game.index}.png`} />
                      <span className="absolute top-2 right-2 rounded-full border border-white/15 bg-[#050308]/70 px-2 py-0.5 text-[0.68rem] font-bold text-[#e9d5ff]">
                        a partir de {money(startingPriceCents(game.index))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <h3 className="min-w-0 truncate font-extrabold tracking-tight">{game.name}</h3>
                      <span className="shrink-0 text-xs font-bold text-[#c084fc]">{open ? "Fechar" : "Ver mais"}</span>
                    </div>
                  </button>
                  {open ? (
                    <div className="grid gap-3 p-3 sm:grid-cols-2">
                      {tiers.map((tier, tierIndex) => (
                        <div className="rounded-2xl border border-white/10 p-3" key={tier.sku}>
                          <h4 className="font-extrabold">{tier.badge}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{notes[tierIndex]?.description}</p>
                          <ul className="mt-2 flex flex-wrap gap-1">
                            {(notes[tierIndex]?.highlights ?? []).map((highlight) => (
                              <li key={highlight} className="rounded-full border border-white/15 px-2 py-0.5 text-xs">{highlight}</li>
                            ))}
                          </ul>
                          <p className="mt-2 text-lg font-extrabold text-[#e9d5ff]">{money(tier.amountCents)}</p>
                          <button type="button" className="btn-glass mt-2 w-full" onClick={() => buy(tier.sku)}>Adquirir</button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
            {!search && visibleGames.length > 8 ? (
              <button type="button" className="col-span-full mt-1 cursor-pointer rounded-2xl border border-white/15 bg-white/6 px-4 py-3 text-sm font-bold hover:border-[#c084fc]" onClick={() => setMoreGames((open) => !open)}>
                {moreGames ? "Ver menos jogos" : "Ver mais jogos"}
              </button>
            ) : null}
          </div>
        </section>

        <section id="giftcards" className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-12">
          <div className="mb-7 max-w-2xl">
            <h2 className="neon-title text-[1.7rem] sm:text-[1.85rem]">Gift Cards</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">De R$ 20 a R$ 500.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {GIFT_CARDS.map((card) => (
              <article className="glass glass-hover flex flex-col overflow-hidden rounded-[18px]" key={card.sku}>
                <div className="relative flex h-[200px] items-center justify-center overflow-hidden bg-[#12081f]">
                  <img alt={card.name} className="absolute inset-0 h-full w-full object-cover" src="/products/gift-card.png" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-[1.05rem] font-semibold leading-tight">{card.name}</h3>
                  <div className="text-sm font-semibold text-[#e9d5ff]">{card.description}</div>
                  <div className="mt-2 font-extrabold tracking-tight">{money(card.amountCents)}</div>
                  <button type="button" className="btn-glass w-full" onClick={() => buy(card.sku)}>Adquirir</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-12">
          <div className="mb-7 max-w-2xl">
            <h2 className="neon-title text-[1.7rem] sm:text-[1.85rem]">Dúvidas</h2>
          </div>
          <div className="grid gap-3">
            <details className="glass rounded-2xl px-4 py-3">
              <summary className="cursor-pointer font-semibold">Como pago?</summary>
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">PIX no checkout, com QR Code e código copia e cola.</p>
            </details>
            <details className="glass rounded-2xl px-4 py-3">
              <summary className="cursor-pointer font-semibold">Quando chega?</summary>
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">De 3 a 10 dias depois que o PIX é confirmado, na conta Roblox informada. A entrega expressa custa {money(EXPRESS_DELIVERY_CENTS)}.</p>
            </details>
            <details className="glass rounded-2xl px-4 py-3">
              <summary className="cursor-pointer font-semibold">Posso repetir o mesmo item?</summary>
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">Conta de jogo, não. Pacotes de Robux e gift cards, até 20 unidades.</p>
            </details>
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-white/10 px-5 py-8 text-center text-sm text-muted-foreground">
        <nav className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2 font-semibold" aria-label="Rodapé">
          <Link className="hover:text-foreground" href="/#robux">Robux</Link>
          <Link className="hover:text-foreground" href="/#ofertas">Ofertas</Link>
          <Link className="hover:text-foreground" href="/#contas">Contas</Link>
          <Link className="hover:text-foreground" href="/#giftcards">Gift Cards</Link>
          <Link className="hover:text-foreground" href="/#faq">Dúvidas</Link>
        </nav>
        <p>© Stellar Bux · Todos os direitos reservados.</p>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed">
          Stellar Bux é uma loja independente e não é afiliada, associada nem endossada pela Roblox Corporation. Roblox e Robux são marcas da Roblox Corporation.
        </p>
      </footer>

      {drawer ? (
        <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,.62)" }}>
          <button type="button" aria-label="Fechar carrinho" className="absolute inset-0" onClick={() => setDrawer(false)} />
          <aside className="absolute top-0 right-0 flex w-full max-w-md flex-col border-l border-white/10" style={{ background: "#0c0618", height: "100dvh", maxHeight: "100dvh", zIndex: 2 }}>
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="neon-title text-2xl">Carrinho</h2>
              <button type="button" className="btn-glass" onClick={() => setDrawer(false)}>Fechar</button>
            </div>
            <div className="cart-scroll mt-4 min-h-0 flex-1 px-5 pb-8">
            <div className="grid gap-4">
            {cart.items.length === 0 ? <p className="text-muted-foreground">Seu carrinho está vazio.</p> : null}
            {cart.items.map((item) => {
              const product = productBySku(item.sku);
              if (!product) return null;
              return (
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3" key={item.sku}>
                  <div>
                    <p className="font-bold">{product.name}</p>
                    <p className="text-sm text-[#e9d5ff]">{money(product.amountCents * item.quantity)}</p>
                  </div>
                  {product.unique ? (
                    <button type="button" onClick={() => update({ ...cart, items: cart.items.filter((line) => line.sku !== item.sku) })}>Remover</button>
                  ) : (
                    <input
                      aria-label={`Quantidade de ${product.name}`}
                      className="h-10 w-16 shrink-0 rounded-lg border border-white/15 bg-[#12081f] text-center"
                      type="number"
                      min={1}
                      max={20}
                      value={item.quantity}
                      onChange={(event) => changeQty(item, Number(event.target.value))}
                    />
                  )}
                </div>
              );
            })}
            <div>
              <h3 className="neon-title neon-title-sm text-lg">Ofertas</h3>
              <div className="mt-3 grid gap-2">
                {ITEM_OFFERS.map((offer) => {
                  const inCart = cart.items.some((item) => item.sku === offer.sku);
                  return (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2" key={offer.sku}>
                      <img alt="" className={`h-14 w-14 shrink-0 rounded-xl object-contain offer-frame ${FRAMES[offer.sku] ?? ""}`} src={offer.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{offer.name}</p>
                        <p className="text-sm text-[#e9d5ff]">{money(offer.amountCents)}</p>
                      </div>
                      <button type="button" className="btn-glass shrink-0 px-3" disabled={inCart} onClick={() => buy(offer.sku)}>
                        {inCart ? "No carrinho" : "Adquirir"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={cart.express} onChange={(event) => update({ ...cart, express: event.target.checked })} />
              Entrega expressa por {money(EXPRESS_DELIVERY_CENTS)}
            </label>
            <p className="text-xl font-extrabold">{quote ? money(quote.amountCents) : money(0)}</p>
            {quote && quote.amountCents < MIN_PIX_CENTS ? (
              <p className="text-sm text-[#ffb4b4]">O PIX precisa de pelo menos R$ 10,00. Some outro item ou a entrega expressa.</p>
            ) : null}
            <Link className="btn-brand inline-flex h-11 items-center justify-center rounded-xl px-5 font-bold" href="/checkout">
              Ir para o pagamento
            </Link>
            </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
