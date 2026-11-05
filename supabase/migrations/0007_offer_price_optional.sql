-- Card 12: preço opcional em oferta ativa.
-- Antes: oferta ativa exigia pelo menos um preço (price_30 ou price_50).
-- Agora: os dois preços podem ficar vazios; o site mostra "Valor a consultar".
-- Os checks de faixa dos preços (> 0 e <= 5000) e do subtítulo continuam valendo.
alter table public.offers drop constraint offers_check;
